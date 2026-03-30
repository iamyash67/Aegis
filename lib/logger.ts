export interface RAGHitEvent {
  type: "rag_hit";
  repoId: string;
  queryLength: number;
  chunksRetrieved: number;
  topSimilarity: number;
  avgSimilarity: number;
  files: string[];
}

export interface FeedbackHitEvent {
  type: "feedback_hit";
  disputedCount: number;
  acceptedCount: number;
  topSimilarity: number;
}

export interface ReviewEvent {
  type: "review_complete";
  language: string;
  codeLength: number;
  findingsCount: number;
  severityBreakdown: Record<string, number>;
  astUsed: boolean;
  ragUsed: boolean;
  feedbackUsed: boolean;
  durationMs: number;
}

export type LogEvent = RAGHitEvent | FeedbackHitEvent | ReviewEvent;

export function logEvent(event: LogEvent): void {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${event.type.toUpperCase()}]`;

  switch (event.type) {
    case "rag_hit":
      console.log(
        `${prefix} repoId=${event.repoId} chunks=${event.chunksRetrieved} topSim=${(event.topSimilarity * 100).toFixed(1)}% avgSim=${(event.avgSimilarity * 100).toFixed(1)}% files=${event.files.join(", ")}`
      );
      break;

    case "feedback_hit":
      console.log(
        `${prefix} disputed=${event.disputedCount} accepted=${event.acceptedCount} topSim=${(event.topSimilarity * 100).toFixed(1)}%`
      );
      break;

    case "review_complete":
      console.log(
        `${prefix} lang=${event.language} findings=${event.findingsCount} severity=${JSON.stringify(event.severityBreakdown)} ast=${event.astUsed} rag=${event.ragUsed} feedback=${event.feedbackUsed} duration=${event.durationMs}ms`
      );
      break;
  }
}

export function calcSimilarityStats(items: { similarity: number }[]): {
  top: number;
  avg: number;
} {
  if (items.length === 0) return { top: 0, avg: 0 };
  const scores = items.map((i) => i.similarity);
  return {
    top: Math.max(...scores),
    avg: scores.reduce((a, b) => a + b, 0) / scores.length,
  };
}