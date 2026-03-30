import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { parsePython, buildASTContext } from "@/lib/ast-parser";
import { retrieveSimilar } from "@/lib/vector-store";
import { buildRetrievedContext } from "@/lib/ingester";
import { retrieveSimilarFeedback, buildFeedbackContext } from "@/lib/feedback-store";
import { logEvent, calcSimilarityStats } from "@/lib/logger";
import { resolveDependencies, buildDependencyContext } from "@/lib/dependency-resolver";

const SYSTEM_PROMPT = `You are an expert security code reviewer specialising in the OWASP Top 10 and secure coding practices.
You will be given code to review along with two types of context:
1. AST metadata — structural analysis of the code (functions, imports, dangerous calls)
2. Repository context — semantically similar code chunks from the same codebase

Use both to make your review more precise. Reference exact function names, line numbers, and patterns you observe across the codebase.

Respond ONLY with a valid JSON array of findings. No preamble, no markdown fences, no explanation outside the array.

Each finding object must have exactly these fields:
{
  "id": "<unique string e.g. finding-1>",
  "severity": "<one of: critical | high | medium | low | info>",
  "title": "<short title max 8 words>",
  "line": "<line number or range as string e.g. 42 or 38-45 or N/A>",
  "description": "<1-2 sentences explaining the vulnerability>",
  "owasp": "<OWASP Top 10 category e.g. A03:2021 – Injection>",
  "recommendation": "<1-2 sentences on how to fix it>"
}

If you find no issues return an empty array [].
Analyse thoroughly. Cover injection, authentication, sensitive data exposure, broken access control, security misconfiguration, XSS, insecure deserialisation, outdated components, and logging failures where relevant.`;

export async function POST(req: NextRequest) {
  try {
    const startTime = Date.now();
    const { code, language, repoId, fileName } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    // Run AST analysis for Python
    let astContext = "";
    if (language === "python") {
      try {
        const metadata = parsePython(code);
        astContext = buildASTContext(metadata);
      } catch (astErr) {
        console.warn("AST parsing failed, continuing without it:", astErr);
      }
    }

    // Run RAG retrieval if repoId provided
    let ragContext = "";
    if (repoId) {
      try {
        const similar = await retrieveSimilar(code, repoId, 5);
        ragContext = buildRetrievedContext(similar);
      } catch (ragErr) {
        console.warn("RAG retrieval failed, continuing without it:", ragErr);
      }
    }

    // Retrieve past feedback for similar code
    let feedbackContext = "";
    try {
      const pastFeedback = await retrieveSimilarFeedback(code, 5);
      feedbackContext = buildFeedbackContext(pastFeedback);
    } catch (feedbackErr) {
      console.warn("Feedback retrieval failed, continuing without it:", feedbackErr);
    }
	// Resolve dependencies — cross-file context
    let dependencyContext = "";
    if (repoId && language === "python") {
      try {
        const deps = await resolveDependencies(code, repoId);
        dependencyContext = buildDependencyContext(deps);
        if (deps.length > 0) {
          console.log(`[DEPENDENCY_RESOLVER] resolved ${deps.length} deps:`, deps.map(d => d.filePath).join(", "));
        }
      } catch (depErr) {
        console.warn("Dependency resolution failed, continuing without it:", depErr);
      }
    }

    // Build enriched prompt
    // Log RAG hit rate
    if (repoId && ragContext) {
      const similar = await retrieveSimilar(code, repoId, 5);
      const stats = calcSimilarityStats(similar);
      logEvent({
        type: "rag_hit",
        repoId,
        queryLength: code.length,
        chunksRetrieved: similar.length,
        topSimilarity: stats.top,
        avgSimilarity: stats.avg,
        files: [...new Set(similar.map((s) => s.filePath))],
      });
    }

    const contextParts = [astContext, ragContext, feedbackContext,
dependencyContext].filter(Boolean).join("\n\n");
    const userMessage = contextParts
      ? `${contextParts}\n\nNow review the following ${language} code for security vulnerabilities:\n\`\`\`${language}\n${code}\n\`\`\``
      : `Review the following ${language} code for security vulnerabilities:\n\`\`\`${language}\n${code}\n\`\`\``;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errData?.error?.message || `Anthropic API error ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rawText = data.content?.map((b: any) => b.text || "").join("") || "[]";
    const clean = rawText.replace(/```json|```/g, "").trim();
    const findings = JSON.parse(clean);

    // Log review completion
    const severityBreakdown = findings.reduce((acc: Record<string, number>, f: any) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    }, {});

    const durationMs = Date.now() - startTime;

    logEvent({
      type: "review_complete",
      language,
      codeLength: code.length,
      findingsCount: findings.length,
      severityBreakdown,
      astUsed: !!astContext,
      ragUsed: !!ragContext,
      feedbackUsed: !!feedbackContext,
      durationMs,
    });

    // Persist scan to database
    await supabase.from("scans").insert({
      file_name: fileName || "untitled",
      language,
      code_length: code.length,
      findings_count: findings.length,
      critical_count: severityBreakdown["critical"] || 0,
      high_count: severityBreakdown["high"] || 0,
      medium_count: severityBreakdown["medium"] || 0,
      low_count: severityBreakdown["low"] || 0,
      duration_ms: durationMs,
      ast_used: !!astContext,
      rag_used: !!ragContext,
      feedback_used: !!feedbackContext,
    });

    return NextResponse.json({ findings, astContext, ragContext });
  } catch (err: any) {
    console.error("Review route error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}