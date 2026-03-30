import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { logEvent } from "@/lib/logger";
import { parsePython, buildASTContext } from "@/lib/ast-parser";
import { retrieveSimilar } from "@/lib/vector-store";
import { buildRetrievedContext } from "@/lib/ingester";

const SYSTEM_PROMPT = `You are an expert security code reviewer specialising in the OWASP Top 10 and secure coding practices.
You will be given code to review along with structural and repository context.
Be concise — each finding should be 2-3 sentences maximum.
Focus only on genuine security issues, not style or performance.

Respond ONLY with a valid JSON array of findings. No preamble, no markdown fences.

Each finding object must have exactly these fields:
{
  "id": "<unique string e.g. finding-1>",
  "severity": "<one of: critical | high | medium | low | info>",
  "title": "<short title max 8 words>",
  "line": "<line number or range as string>",
  "description": "<2-3 sentences max>",
  "owasp": "<OWASP Top 10 category>",
  "recommendation": "<1-2 sentences>"
}

If you find no issues return [].`;

// Verify GitHub webhook signature
function verifySignature(body: string, signature: string): boolean {
  const secret = process.env.GITHUB_WEBHOOK_SECRET!;
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")}`;
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Fetch changed files from a PR
async function getPRFiles(owner: string, repo: string, prNumber: number) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  return response.json();
}

// Fetch raw file content
async function getFileContent(contentsUrl: string): Promise<string> {
  const response = await fetch(contentsUrl, {
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github.v3.raw",
    },
  });
  if (!response.ok) return "";
  return response.text();
}

// Post a review comment on the PR
async function postPRComment(
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );
}

async function postPRCommentAndGetId(
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<number | null> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );
  if (!response.ok) return null;
  const data = await response.json();
  return data.id || null;
}

async function updatePRComment(
  owner: string,
  repo: string,
  commentId: number,
  body: string
): Promise<void> {
  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/comments/${commentId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );
}

// Format findings as a GitHub markdown comment
function formatComment(
  findings: any[],
  fileName: string
): string {
  if (findings.length === 0) {
    return `## 🛡️ Security Review — \`${fileName}\`\n\n✅ No security issues found.`;
  }

  const severityEmoji: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
    info: "🔵",
  };

  const lines = [
    `## 🛡️ Security Review — \`${fileName}\``,
    ``,
    `Found **${findings.length} issue${findings.length !== 1 ? "s" : ""}**`,
    ``,
  ];

  findings.forEach((f) => {
    const emoji = severityEmoji[f.severity] || "⚪";
    lines.push(`### ${emoji} ${f.title}`);
    lines.push(`**Severity:** ${f.severity.toUpperCase()} | **Line:** ${f.line} | **${f.owasp}**`);
    lines.push(``);
    lines.push(f.description);
    lines.push(``);
    lines.push(`> **Fix:** ${f.recommendation}`);
    lines.push(`---`);
  });

  lines.push(`*Reviewed by AI Security Reviewer — powered by Claude + OWASP Top 10*`);
  return lines.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";

    // Verify webhook signature
    if (!verifySignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = req.headers.get("x-github-event");
    if (event !== "pull_request") {
      return NextResponse.json({ message: "Ignored event" }, { status: 200 });
    }

    const payload = JSON.parse(rawBody);
    const action = payload.action;

    // Only review on open or new commits
    if (action !== "opened" && action !== "synchronize") {
      return NextResponse.json({ message: "Ignored action" }, { status: 200 });
    }

    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const prNumber = payload.pull_request.number;
    const repoId = `${owner}/${repo}`;

    // Get changed files
    const files = await getPRFiles(owner, repo, prNumber);
    const pythonFiles = files.filter((f: any) =>
      f.filename.endsWith(".py") && f.status !== "removed"
    );

    if (pythonFiles.length === 0) {
      return NextResponse.json({ message: "No Python files to review" }, { status: 200 });
    }

    const BATCH_SIZE = 5;
    const filesToReview = pythonFiles.slice(0, BATCH_SIZE);
    const skippedCount = pythonFiles.length - filesToReview.length;

    // Warn in PR if files were skipped due to batch limit
    if (skippedCount > 0) {
      await postPRComment(
        owner,
        repo,
        prNumber,
        `> ⚠️ **Large PR detected:** This PR contains ${pythonFiles.length} Python files. Reviewing the first ${BATCH_SIZE} files. Consider breaking this PR into smaller chunks for full coverage.`
      );
    }

    logEvent({
      type: "review_complete",
      language: "python",
      codeLength: 0,
      findingsCount: 0,
      severityBreakdown: {},
      astUsed: false,
      ragUsed: false,
      feedbackUsed: false,
      durationMs: 0,
    });

    // Post instant "in progress" comment
    const progressCommentId = await postPRCommentAndGetId(
      owner,
      repo,
      prNumber,
      `## 🛡️ Security Review in progress...\n\nAnalysing ${filesToReview.length} file${filesToReview.length !== 1 ? "s" : ""}. Results will appear below shortly.`
    );

    // Review each Python file
    for (const file of filesToReview) {
      const content = await getFileContent(file.raw_url);
      if (!content) continue;

      // AST analysis
      let astContext = "";
      try {
        const metadata = parsePython(content);
        astContext = buildASTContext(metadata);
      } catch {}

      // RAG retrieval
      let ragContext = "";
      try {
        const similar = await retrieveSimilar(content, repoId, 3);
        ragContext = buildRetrievedContext(similar);
      } catch {}

      // Build prompt
      const contextParts = [astContext, ragContext].filter(Boolean).join("\n\n");
      const userMessage = contextParts
        ? `${contextParts}\n\nReview this Python file for security vulnerabilities:\n\`\`\`python\n${content}\n\`\`\``
        : `Review this Python file for security vulnerabilities:\n\`\`\`python\n${content}\n\`\`\``;

      // Call Claude
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

      if (!response.ok) continue;

      const data = await response.json();
      const rawText = data.content?.map((b: any) => b.text || "").join("") || "[]";
      const clean = rawText.replace(/```json|```/g, "").trim();
      const findings = JSON.parse(clean);

      // Post comment to PR
      const comment = formatComment(findings, file.filename);
      await postPRComment(owner, repo, prNumber, comment);
    }

    // Update the progress comment to show completion
    if (progressCommentId) {
      await updatePRComment(
        owner,
        repo,
        progressCommentId,
        `## 🛡️ Security Review complete\n\nReviewed ${filesToReview.length} file${filesToReview.length !== 1 ? "s" : ""}. See findings below.`
      );
    }

    return NextResponse.json({ message: "Review complete" }, { status: 200 });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}