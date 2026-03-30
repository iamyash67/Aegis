import { NextRequest, NextResponse } from "next/server";
import { storeFeedback } from "@/lib/feedback-store";

export async function POST(req: NextRequest) {
  try {
    const {
      findingId,
      codeSnippet,
      findingTitle,
      findingSeverity,
      owaspCategory,
      verdict,
      disputeReason,
    } = await req.json();

    if (!findingId || !verdict || !codeSnippet) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await storeFeedback({
      findingId,
      codeSnippet,
      findingTitle,
      findingSeverity,
      owaspCategory,
      verdict,
      disputeReason,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Feedback route error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}