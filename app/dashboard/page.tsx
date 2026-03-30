"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Scan {
  id: number;
  file_name: string;
  language: string;
  findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  duration_ms: number;
  ast_used: boolean;
  rag_used: boolean;
  feedback_used: boolean;
  created_at: string;
}

interface Stats {
  totalScans: number;
  totalFindings: number;
  totalCritical: number;
  avgDurationMs: number;
}

const SEV_COLORS: Record<string, string> = {
  critical: "#ff4444",
  high: "#ff8c00",
  medium: "#f5c518",
  low: "#4ade80",
};

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: "#0d1117",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 8, padding: "18px 20px",
    }}>
      <div style={{ fontSize: 11, color: "#484f58", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#e6edf3", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "#484f58", marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/scans")
      .then(r => r.json())
      .then(data => {
        setScans(data.scans || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#010409",
      color: "#e6edf3",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`* { box-sizing: border-box; }`}</style>

      {/* Nav */}
      <header style={{
        background: "rgba(1,4,9,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" stroke="#4ade80" strokeWidth="1.5" fill="none"/>
            <path d="M9 12l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3" }}>aegis</span>
        </Link>

        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

        <div style={{ display: "flex", gap: 4 }}>
          {[
            { label: "dashboard", href: "/dashboard", active: true },
            { label: "review", href: "/review", active: false },
            { label: "repos", href: "/repos", active: false },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              fontSize: 12, padding: "4px 10px", borderRadius: 5,
              background: item.active ? "rgba(255,255,255,0.06)" : "transparent",
              color: item.active ? "#e6edf3" : "#484f58",
              textDecoration: "none", letterSpacing: "0.02em",
            }}>
              {item.label}
            </Link>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        <Link href="/review" style={{
          fontSize: 12, padding: "5px 14px", borderRadius: 5,
          background: "rgba(74,222,128,0.1)", color: "#4ade80",
          border: "1px solid rgba(74,222,128,0.25)",
          textDecoration: "none",
        }}>
          + new scan
        </Link>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: "#484f58" }}>Overview of all security scans</p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "#484f58", fontSize: 13 }}>
            loading scans...
          </div>
        )}

        {error && (
          <div style={{
            padding: "12px 16px", background: "rgba(255,68,68,0.06)",
            border: "1px solid rgba(255,68,68,0.2)", borderRadius: 6,
            fontSize: 13, color: "#ff4444", marginBottom: 24,
          }}>
            error: {error}
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Stats grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12, marginBottom: 32,
            }}>
              <StatCard label="Total scans" value={stats.totalScans} />
              <StatCard label="Total findings" value={stats.totalFindings} />
              <StatCard
                label="Critical issues"
                value={stats.totalCritical}
                sub={stats.totalFindings > 0 ? `${Math.round(stats.totalCritical / stats.totalFindings * 100)}% of all findings` : undefined}
              />
              <StatCard
                label="Avg scan time"
                value={`${(stats.avgDurationMs / 1000).toFixed(1)}s`}
              />
            </div>

            {/* Scans table */}
            <div style={{
              background: "#0d1117",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, overflow: "hidden",
            }}>
              {/* Table header */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "2fr 80px 200px 120px 80px",
                padding: "10px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                background: "#161b22",
              }}>
                {["file", "lang", "findings", "layers", "time"].map(h => (
                  <span key={h} style={{ fontSize: 10, color: "#484f58", letterSpacing: "0.06em" }}>
                    {h.toUpperCase()}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {scans.length === 0 ? (
                <div style={{ padding: "48px 16px", textAlign: "center", color: "#484f58", fontSize: 13 }}>
                  no scans yet — <Link href="/review" style={{ color: "#4ade80", textDecoration: "none" }}>run your first scan</Link>
                </div>
              ) : (
                scans.map((scan, i) => (
                  <div key={scan.id} style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 80px 200px 120px 80px",
                    padding: "12px 16px",
                    borderBottom: i < scans.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    alignItems: "center",
                  }}>
                    {/* File name */}
                    <div>
                      <span style={{ fontSize: 13, color: "#e6edf3", fontWeight: 500 }}>
                        {scan.file_name}
                      </span>
                      <span style={{ fontSize: 11, color: "#484f58", display: "block", marginTop: 2 }}>
                        {timeAgo(scan.created_at)}
                      </span>
                    </div>

                    {/* Language */}
                    <span style={{
                      fontSize: 11, color: "#484f58",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: 3, padding: "2px 6px",
                      display: "inline-block",
                    }}>
                      {scan.language}
                    </span>

                    {/* Findings breakdown */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {scan.findings_count === 0 ? (
                        <span style={{ fontSize: 11, color: "#4ade80" }}>✓ clean</span>
                      ) : (
                        <>
                          {[
                            { count: scan.critical_count, color: "#ff4444", label: "C" },
                            { count: scan.high_count, color: "#ff8c00", label: "H" },
                            { count: scan.medium_count, color: "#f5c518", label: "M" },
                            { count: scan.low_count, color: "#4ade80", label: "L" },
                          ].filter(s => s.count > 0).map(s => (
                            <span key={s.label} style={{
                              fontSize: 10, color: s.color,
                              background: `${s.color}14`,
                              border: `1px solid ${s.color}40`,
                              borderRadius: 3, padding: "1px 5px",
                            }}>
                              {s.count}{s.label}
                            </span>
                          ))}
                        </>
                      )}
                    </div>

                    {/* Layers used */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {[
                        { label: "AST", active: scan.ast_used },
                        { label: "RAG", active: scan.rag_used },
                        { label: "FB", active: scan.feedback_used },
                      ].map(layer => (
                        <span key={layer.label} style={{
                          fontSize: 9, padding: "1px 5px", borderRadius: 3,
                          background: layer.active ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.02)",
                          color: layer.active ? "#4ade80" : "#2d333b",
                          border: `1px solid ${layer.active ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.04)"}`,
                          letterSpacing: "0.04em",
                        }}>
                          {layer.label}
                        </span>
                      ))}
                    </div>

                    {/* Duration */}
                    <span style={{ fontSize: 11, color: "#484f58" }}>
                      {scan.duration_ms ? `${(scan.duration_ms / 1000).toFixed(1)}s` : "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}