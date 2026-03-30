import { supabase } from "./supabase";
import { embedCode, embedBatch } from "./embedder";

export interface CodeChunk {
  repoId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

export interface RetrievedChunk extends CodeChunk {
  similarity: number;
}

// Store a single chunk with its embedding
export async function storeChunk(chunk: CodeChunk): Promise<void> {
  const embedding = await embedCode(chunk.content);

  const { error } = await supabase.from("code_chunks").insert({
    repo_id: chunk.repoId,
    file_path: chunk.filePath,
    start_line: chunk.startLine,
    end_line: chunk.endLine,
    content: chunk.content,
    embedding: JSON.stringify(embedding),
  });

  if (error) throw new Error(`Failed to store chunk: ${error.message}`);
}

// Store multiple chunks in batches for efficiency
export async function storeChunks(chunks: CodeChunk[]): Promise<void> {
  const BATCH_SIZE = 10;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);
    const embeddings = await embedBatch(texts);

    const rows = batch.map((chunk, idx) => ({
      repo_id: chunk.repoId,
      file_path: chunk.filePath,
      start_line: chunk.startLine,
      end_line: chunk.endLine,
      content: chunk.content,
      embedding: JSON.stringify(embeddings[idx]),
    }));

    const { error } = await supabase.from("code_chunks").insert(rows);
    if (error) throw new Error(`Failed to store batch: ${error.message}`);
  }
}

// Retrieve the most similar chunks to a query
export async function retrieveSimilar(
  query: string,
  repoId: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedCode(query);

  const { data, error } = await supabase.rpc("match_code_chunks", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_repo_id: repoId,
    match_count: topK,
  });

  if (error) throw new Error(`Retrieval failed: ${error.message}`);
  if (!data) return [];

  return data.map((row: any) => ({
    repoId: row.repo_id,
    filePath: row.file_path,
    startLine: row.start_line,
    endLine: row.end_line,
    content: row.content,
    similarity: row.similarity,
  }));
}

// Check if a repo has already been ingested
export async function repoExists(repoId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("code_chunks")
    .select("*", { count: "exact", head: true })
    .eq("repo_id", repoId);

  if (error) return false;
  return (count ?? 0) > 0;
}

// Delete all chunks for a repo (for re-ingestion)
export async function clearRepo(repoId: string): Promise<void> {
  const { error } = await supabase
    .from("code_chunks")
    .delete()
    .eq("repo_id", repoId);

  if (error) throw new Error(`Failed to clear repo: ${error.message}`);
}