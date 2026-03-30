import { NextRequest, NextResponse } from "next/server";
import { ingestFiles } from "@/lib/ingester";

async function fetchRepoFiles(
  owner: string,
  repo: string,
  path: string = ""
): Promise<{ path: string; content: string }[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);
  const items = await response.json();

  const files: { path: string; content: string }[] = [];

  for (const item of items) {
    // Only process Python files and recurse into directories
    if (item.type === "file" && item.name.endsWith(".py")) {
      const contentRes = await fetch(item.download_url);
      if (!contentRes.ok) continue;
      const content = await contentRes.text();
      files.push({ path: item.path, content });
    } else if (item.type === "dir") {
      // Skip common non-source directories
      if (["node_modules", ".git", "__pycache__", ".venv", "venv", "dist", "build"].includes(item.name)) continue;
      const subFiles = await fetchRepoFiles(owner, repo, item.path);
      files.push(...subFiles);
    }
  }

  return files;
}

function parseRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const clean = url.replace(/\.git$/, "").trim();
    const match = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { repoUrl, forceReingest } = await req.json();

    if (!repoUrl) {
      return NextResponse.json({ error: "No repo URL provided" }, { status: 400 });
    }

    const parsed = parseRepoUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const { owner, repo } = parsed;
    const repoId = `${owner}/${repo}`;

    // Fetch all Python files from the repo
    const files = await fetchRepoFiles(owner, repo);

    if (files.length === 0) {
      return NextResponse.json({ error: "No Python files found in repo" }, { status: 400 });
    }

    // Cap at 50 files to avoid token/cost explosion
    const filesToIngest = files.slice(0, 50);

    const result = await ingestFiles(filesToIngest, repoId, forceReingest ?? false);

    return NextResponse.json({
      success: true,
      repoId,
      filesFound: files.length,
      filesIngested: filesToIngest.length,
      chunksStored: result.chunksStored,
      fileList: filesToIngest.map(f => f.path),
    });
  } catch (err: any) {
    console.error("Ingest repo error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}