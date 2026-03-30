import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { data: scans, error } = await supabase
      .from("scans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);

    const total = scans?.length || 0;
    const totalFindings = scans?.reduce((a, s) => a + s.findings_count, 0) || 0;
    const totalCritical = scans?.reduce((a, s) => a + s.critical_count, 0) || 0;
    const avgDuration = total > 0
      ? Math.round(scans!.reduce((a, s) => a + (s.duration_ms || 0), 0) / total)
      : 0;

    return NextResponse.json({
      scans: scans || [],
      stats: {
        totalScans: total,
        totalFindings,
        totalCritical,
        avgDurationMs: avgDuration,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}