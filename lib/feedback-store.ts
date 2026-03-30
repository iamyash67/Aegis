import { supabase } from "./supabase";
import { embedCode } from "./embedder";

export interface FeedbackEntry {
  findingId: string;
  codeSnippet: string;
  findingTitle: string;
  findingSeverity: string;
  owaspCategory: string;
  verdict: "accepted" | "disputed";
  disputeReason?: string;
}

// Store a feedback entry with its embedding
export async function storeFeedback(entry: FeedbackEntry): Promise<void> {
  // Embed the code snippet + finding title together for better retrieval
  const textToEmbed = `${entry.findingTitle}\n${entry.codeSnippet}`;
  const embedding = await embedCode(textToEmbed);

  const { error } = await supabase.from("feedback").insert({
    finding_id: entry.findingId,
    code_snippet: entry.codeSnippet,
    finding_title: entry.findingTitle,
    finding_severity: entry.findingSeverity,
    owasp_category: entry.owaspCategory,
    verdict: entry.verdict,
    dispute_reason: entry.disputeReason || null,
    embedding: JSON.stringify(embedding),
  });

  if (error) throw new Error(`Failed to store feedback: ${error.message}`);
}

// Retrieve similar past feedback for a given code snippet
export async function retrieveSimilarFeedback(
  codeSnippet: string,
  topK: number = 5
): Promise<any[]> {
  const embedding = await embedCode(codeSnippet);

  const { data, error } = await supabase.rpc("match_feedback", {
    query_embedding: JSON.stringify(embedding),
    match_count: topK,
  });

  if (error) throw new Error(`Feedback retrieval failed: ${error.message}`);
  return data || [];
}

// Build a context string from past feedback to inject into prompts
export function buildFeedbackContext(feedbackItems: any[]): string {
  if (feedbackItems.length === 0) return "";

  const disputed = feedbackItems.filter(f => f.verdict === "disputed");
  const accepted = feedbackItems.filter(f => f.verdict === "accepted");

  const lines: string[] = ["=== Past Developer Feedback ===\n"];

  if (disputed.length > 0) {
    lines.push("Previously disputed findings (adjust confidence for similar issues):");
    disputed.forEach(f => {
      const similarity = Math.round(f.similarity * 100);
      lines.push(`  - "${f.finding_title}" (${f.finding_severity}, ${similarity}% similar) was disputed`);
      if (f.dispute_reason) {
        lines.push(`    Reason: ${f.dispute_reason}`);
      }
    });
    lines.push("");
  }

  if (accepted.length > 0) {
    lines.push("Previously accepted findings (high confidence for similar issues):");
    accepted.forEach(f => {
      const similarity = Math.round(f.similarity * 100);
      lines.push(`  - "${f.finding_title}" (${f.finding_severity}, ${similarity}% similar) was accepted`);
    });
    lines.push("");
  }

  lines.push("=== End of Past Feedback ===");
  return lines.join("\n");
}