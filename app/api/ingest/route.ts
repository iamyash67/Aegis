import { NextRequest, NextResponse } from "next/server";
import { ingestFiles } from "@/lib/ingester";

export async function POST(req: NextRequest) {
  try {
    const { files, repoId, forceReingest } = await req.json();

    if (!files || !Array.isArray(files)) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (!repoId || typeof repoId !== "string") {
      return NextResponse.json({ error: "No repoId provided" }, { status: 400 });
    }

    const result = await ingestFiles(files, repoId, forceReingest ?? false);

    return NextResponse.json({
      success: true,
      chunksStored: result.chunksStored,
      filesProcessed: result.filesProcessed,
    });
  } catch (err: any) {
    console.error("Ingest route error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}