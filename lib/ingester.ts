import { storeChunks, repoExists, clearRepo, CodeChunk } from "./vector-store";
import { parsePython, ASTMetadata } from "./ast-parser";

const CHUNK_SIZE = 40;
const CHUNK_OVERLAP = 10;

interface FileInput {
  path: string;
  content: string;
}

// Split code into overlapping chunks by line
function chunkCode(
  content: string,
  filePath: string,
  repoId: string
): CodeChunk[] {
  const lines = content.split("\n");
  const chunks: CodeChunk[] = [];

  for (let i = 0; i < lines.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    const startLine = i + 1;
    const endLine = Math.min(i + CHUNK_SIZE, lines.length);
    const chunkContent = lines.slice(i, i + CHUNK_SIZE).join("\n").trim();

    if (chunkContent.length < 10) continue;

    chunks.push({
      repoId,
      filePath,
      startLine,
      endLine,
      content: chunkContent,
    });

    if (endLine === lines.length) break;
  }

  return chunks;
}

// Ingest a list of files into the vector store
export async function ingestFiles(
  files: FileInput[],
  repoId: string,
  forceReingest: boolean = false
): Promise<{ chunksStored: number; filesProcessed: number }> {
  // Check if already ingested
  if (!forceReingest) {
    const exists = await repoExists(repoId);
    if (exists) {
      return { chunksStored: 0, filesProcessed: 0 };
    }
  } else {
    await clearRepo(repoId);
  }

  const allChunks: CodeChunk[] = [];

  for (const file of files) {
    // Only process Python files for now
    if (!file.path.endsWith(".py")) continue;

    const chunks = chunkCode(file.content, file.path, repoId);
    allChunks.push(...chunks);
  }

  if (allChunks.length === 0) {
    return { chunksStored: 0, filesProcessed: files.length };
  }

  await storeChunks(allChunks);

  return {
    chunksStored: allChunks.length,
    filesProcessed: files.length,
  };
}

// Build a context string from retrieved chunks for prompt injection
export function buildRetrievedContext(
  chunks: { filePath: string; startLine: number; endLine: number; content: string; similarity: number }[]
): string {
  if (chunks.length === 0) return "";

  const lines: string[] = ["=== Related Code from Repository ===\n"];

  chunks.forEach((chunk, idx) => {
    const similarityPct = Math.round(chunk.similarity * 100);
    lines.push(
      `[${idx + 1}] ${chunk.filePath} (lines ${chunk.startLine}–${chunk.endLine}, ${similarityPct}% similar):`
    );
    lines.push("```python");
    lines.push(chunk.content);
    lines.push("```\n");
  });

  lines.push("=== End of Repository Context ===");
  return lines.join("\n");
}