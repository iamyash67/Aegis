"use client";

import { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  line: string;
  description: string;
  owasp: string;
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------
const SEV = {
  critical: { label: "CRIT", color: "#ff4444", bg: "rgba(255,68,68,0.08)", border: "rgba(255,68,68,0.25)", dot: "#ff4444" },
  high:     { label: "HIGH", color: "#ff8c00", bg: "rgba(255,140,0,0.08)",  border: "rgba(255,140,0,0.25)",  dot: "#ff8c00" },
  medium:   { label: "MED",  color: "#f5c518", bg: "rgba(245,197,24,0.08)", border: "rgba(245,197,24,0.25)", dot: "#f5c518" },
  low:      { label: "LOW",  color: "#4ade80", bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", dot: "#4ade80" },
  info:     { label: "INFO", color: "#60a5fa", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)", dot: "#60a5fa" },
};

const SEV_ORDER = ["critical", "high", "medium", "low", "info"] as const;

const EXAMPLE_CODE = `import pickle
import subprocess
import os

def login(username, password):
    # Direct string interpolation — SQL injection risk
    query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
    result = db.execute(query)
    token = pickle.loads(result['session'])
    subprocess.call(["log", username])
    return token

def reset_password(email):
    os.system("sendmail " + email)
    return True`;

// ---------------------------------------------------------------------------
// Typing animation hook
// ---------------------------------------------------------------------------
function useTypingEffect(text: string, speed = 18) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(interval); setDone(true); }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);
  return { displayed, done };
}

// ---------------------------------------------------------------------------
// FindingCard
// ---------------------------------------------------------------------------
function FindingCard({ finding, code, feedbackState, onFeedback, index }: {
  finding: Finding;
  code: string;
  feedbackState: Record<string, string>;
  onFeedback: (id: string, verdict: string | null, reason: string | null) => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const sev = SEV[finding.severity] || SEV.info;
  const fb = feedbackState[finding.id];

  function submitDispute() {
    const reason = disputeReason === "other" ? customReason : disputeReason;
    if (!reason) return;
    onFeedback(finding.id, "disputed", reason);
    setShowDispute(false);
  }

  return (
    <div style={{
      background: "#0d1117",
      border: `1px solid ${expanded ? sev.border : "rgba(255,255,255,0.06)"}`,
      borderLeft: `2px solid ${sev.dot}`,
      borderRadius: "0 6px 6px 0",
      overflow: "hidden",
      transition: "border-color 0.2s",
      animation: `fadeSlideIn 0.3s ease both`,
      animationDelay: `${index * 0.06}s`,
    }}>
      {/* Header */}
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "11px 14px", cursor: "pointer",
          background: expanded ? sev.bg : "transparent",
          transition: "background 0.2s",
        }}
      >
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          color: sev.color, fontFamily: "'JetBrains Mono', monospace",
          minWidth: 34,
        }}>
          {sev.label}
        </span>
        <span style={{ fontSize: 13, color: "#e6edf3", flex: 1, fontWeight: 500 }}>
          {finding.title}
        </span>
        {finding.line !== "N/A" && (
          <span style={{
            fontSize: 10, color: "#484f58",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            :{finding.line}
          </span>
        )}
        {fb && (
          <span style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 3,
            background: fb === "accepted" ? "rgba(74,222,128,0.1)" : "rgba(255,140,0,0.1)",
            color: fb === "accepted" ? "#4ade80" : "#ff8c00",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {fb === "accepted" ? "accepted" : "disputed"}
          </span>
        )}
        <span style={{
          fontSize: 10, color: "#484f58",
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.2s", display: "inline-block",
        }}>▼</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p style={{ fontSize: 13, color: "#8b949e", margin: "12px 0 10px", lineHeight: 1.6 }}>
            {finding.description}
          </p>

          <div style={{ marginBottom: 10 }}>
            <span style={{
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              color: "#484f58", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 3, padding: "2px 6px",
            }}>
              {finding.owasp}
            </span>
          </div>

          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5, padding: "10px 12px", marginBottom: 12,
          }}>
            <span style={{ fontSize: 10, color: "#484f58", fontFamily: "'JetBrains Mono', monospace", display: "block", marginBottom: 4 }}>
              fix
            </span>
            <span style={{ fontSize: 12, color: "#c9d1d9", lineHeight: 1.55 }}>
              {finding.recommendation}
            </span>
          </div>

          {/* Feedback */}
          {!fb ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onFeedback(finding.id, "accepted", null)}
                style={{
                  fontSize: 11, padding: "5px 12px", borderRadius: 4,
                  border: "1px solid rgba(74,222,128,0.3)",
                  background: "rgba(74,222,128,0.05)",
                  color: "#4ade80", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                ✓ accept
              </button>
              <button
                onClick={() => setShowDispute(s => !s)}
                style={{
                  fontSize: 11, padding: "5px 12px", borderRadius: 4,
                  border: "1px solid rgba(255,140,0,0.3)",
                  background: "rgba(255,140,0,0.05)",
                  color: "#ff8c00", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                ✕ dispute
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
                color: fb === "accepted" ? "#4ade80" : "#ff8c00",
              }}>
                {fb === "accepted" ? "✓ marked as accepted" : "✕ marked as disputed"}
              </span>
              <button
                onClick={() => onFeedback(finding.id, null, null)}
                style={{
                  fontSize: 10, background: "none", border: "none",
                  color: "#484f58", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                undo
              </button>
            </div>
          )}

          {/* Dispute form */}
          {showDispute && !fb && (
            <div style={{
              marginTop: 10,
              background: "rgba(255,140,0,0.04)",
              border: "1px solid rgba(255,140,0,0.15)",
              borderRadius: 5, padding: 12,
            }}>
              <p style={{ fontSize: 11, color: "#8b949e", margin: "0 0 10px", fontFamily: "'JetBrains Mono', monospace" }}>
                dispute_reason
              </p>
              {[
                ["false-positive", "false_positive — this code is safe"],
                ["handled-elsewhere", "handled_elsewhere in codebase"],
                ["not-applicable", "not_applicable to this context"],
                ["other", "other"],
              ].map(([val, label]) => (
                <label key={val} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  marginBottom: 6, cursor: "pointer",
                  fontSize: 12, color: "#8b949e",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <input
                    type="radio" name={`dispute-${finding.id}`} value={val}
                    checked={disputeReason === val}
                    onChange={() => setDisputeReason(val)}
                    style={{ accentColor: "#ff8c00" }}
                  />
                  {label}
                </label>
              ))}
              {disputeReason === "other" && (
                <input
                  type="text"
                  placeholder="describe reason..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    marginTop: 6, marginBottom: 8,
                    fontSize: 12, padding: "6px 8px", borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#0d1117", color: "#e6edf3",
                    fontFamily: "'JetBrains Mono', monospace",
                    outline: "none",
                  }}
                />
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={submitDispute}
                  disabled={!disputeReason || (disputeReason === "other" && !customReason)}
                  style={{
                    fontSize: 11, padding: "5px 12px", borderRadius: 4,
                    background: disputeReason ? "#ff8c00" : "rgba(255,255,255,0.04)",
                    color: disputeReason ? "#000" : "#484f58",
                    border: "none", cursor: disputeReason ? "pointer" : "not-allowed",
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                  }}
                >
                  submit
                </button>
                <button
                  onClick={() => { setShowDispute(false); setDisputeReason(""); }}
                  style={{
                    fontSize: 11, padding: "5px 12px", borderRadius: 4,
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#484f58", cursor: "pointer",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scan line animation component
// ---------------------------------------------------------------------------
function ScanLine() {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      pointerEvents: "none", overflow: "hidden", borderRadius: 6,
    }}>
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent)",
        animation: "scanline 2s linear infinite",
      }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function AegisPage() {
  const [code, setCode] = useState(EXAMPLE_CODE);
  const [language, setLanguage] = useState("python");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<string, string>>({});
  const [hasReviewed, setHasReviewed] = useState(false);
  const [scanPhase, setScanPhase] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const counts = SEV_ORDER.reduce((acc, s) => {
    acc[s] = findings.filter(f => f.severity === s).length;
    return acc;
  }, {} as Record<string, number>);

  const totalIssues = findings.length;
  const acceptedCount = Object.values(feedbackState).filter(v => v === "accepted").length;
  const disputedCount = Object.values(feedbackState).filter(v => v === "disputed").length;

  async function runReview() {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    setFindings([]);
    setFeedbackState({});
    setHasReviewed(false);

    const phases = [
      "initialising scan...",
      "parsing AST...",
      "querying vector store...",
      "running OWASP analysis...",
      "generating findings...",
    ];

    let phaseIdx = 0;
    setScanPhase(phases[0]);
    const phaseInterval = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % phases.length;
      setScanPhase(phases[phaseIdx]);
    }, 1200);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error || `API error ${response.status}`);
      }

      const data = await response.json();
      const sorted = [...(data.findings || [])].sort(
        (a: Finding, b: Finding) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
      );
      setFindings(sorted);
      setHasReviewed(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(phaseInterval);
      setScanPhase("");
      setLoading(false);
    }
  }

  async function handleFeedback(id: string, verdict: string | null, reason: string | null) {
    setFeedbackState(prev => {
      if (verdict === null) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: verdict };
    });

    if (verdict) {
      const finding = findings.find(f => f.id === id);
      if (!finding) return;
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId: id,
            codeSnippet: code,
            findingTitle: finding.title,
            findingSeverity: finding.severity,
            owaspCategory: finding.owasp,
            verdict,
            disputeReason: reason,
          }),
        });
      } catch (err) {
        console.error("Failed to store feedback:", err);
      }
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#010409",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: "#e6edf3",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scanline {
          from { top: -2px; }
          to { top: 100%; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        textarea { resize: none; }
        textarea::placeholder { color: #2d333b; }
      `}</style>

      {/* Top nav */}
      <header style={{
        background: "rgba(1,4,9,0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 20px",
        height: 48,
        display: "flex",
        alignItems: "center",
        gap: 16,
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(8px)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 24, height: 24,
            position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" fill="none" stroke="#4ade80" strokeWidth="1.5"/>
              <path d="M9 12l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#e6edf3", letterSpacing: "0.02em" }}>
            Aegis
          </span>
          <span style={{
            fontSize: 9, color: "#4ade80",
            border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: 3, padding: "1px 5px",
            letterSpacing: "0.08em",
          }}>
            v0.1
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.08)" }} />

        {/* Status indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: loading ? "#f5c518" : "#4ade80",
            animation: loading ? "pulse-dot 1s ease infinite" : "none",
          }} />
          <span style={{ fontSize: 11, color: "#484f58" }}>
            {loading ? scanPhase : hasReviewed ? `scan complete — ${totalIssues} issue${totalIssues !== 1 ? "s" : ""} found` : "ready"}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        {/* Stats */}
        {hasReviewed && totalIssues > 0 && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {SEV_ORDER.map(s => counts[s] > 0 && (
              <span key={s} style={{
                fontSize: 10, color: SEV[s as keyof typeof SEV].color,
                fontWeight: 600,
              }}>
                {counts[s]} {SEV[s as keyof typeof SEV].label}
              </span>
            ))}
          </div>
        )}

        {hasReviewed && (
          <span style={{ fontSize: 10, color: "#484f58" }}>
            {acceptedCount + disputedCount}/{totalIssues} reviewed
          </span>
        )}
      </header>

      {/* Main layout */}
      <main style={{
        display: "grid",
        gridTemplateColumns: "1fr 400px",
        gap: 0,
        height: "calc(100vh - 48px)",
      }}>
        {/* Left — editor */}
        <div style={{
          borderRight: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Editor toolbar */}
          <div style={{
            padding: "8px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#0d1117",
          }}>
            {/* Fake traffic lights */}
            <div style={{ display: "flex", gap: 5 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#484f58", flex: 1, textAlign: "center" }}>
              untitled.{language === "javascript" ? "js" : language === "typescript" ? "ts" : language}
            </span>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#161b22", color: "#8b949e",
                cursor: "pointer", fontFamily: "inherit",
                outline: "none",
              }}
            >
              {["python", "javascript", "typescript", "go", "java", "rust", "php", "ruby"].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <button
              onClick={() => { setCode(""); setFindings([]); setHasReviewed(false); setFeedbackState({}); }}
              style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent", cursor: "pointer",
                color: "#484f58", fontFamily: "inherit",
              }}
            >
              clear
            </button>
          </div>

          {/* Line numbers + textarea */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
            {/* Line numbers */}
            <div style={{
              width: 44,
              background: "#0d1117",
              borderRight: "1px solid rgba(255,255,255,0.04)",
              padding: "16px 0",
              userSelect: "none",
              overflowY: "hidden",
              flexShrink: 0,
            }}>
              {code.split("\n").map((_, i) => (
                <div key={i} style={{
                  fontSize: 11, lineHeight: "1.65",
                  color: "#2d333b", textAlign: "right",
                  paddingRight: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code area */}
            <textarea
              ref={textareaRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              spellCheck={false}
              placeholder="// paste code to scan..."
              style={{
                flex: 1,
                background: "#0d1117",
                border: "none",
                outline: "none",
                color: "#e6edf3",
                fontSize: 12.5,
                lineHeight: 1.65,
                padding: "16px 16px",
                fontFamily: "'JetBrains Mono', monospace",
                overflowY: "auto",
              }}
            />

            {/* Scan line overlay when loading */}
            {loading && <ScanLine />}
          </div>

          {/* Bottom bar */}
          <div style={{
            padding: "10px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "#0d1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#2d333b" }}>
                {code.split("\n").length} lines · {code.length} chars
              </span>
              <span style={{ fontSize: 10, color: "#2d333b" }}>
                {language}
              </span>
            </div>

            <button
              onClick={runReview}
              disabled={loading || !code.trim()}
              style={{
                fontSize: 11, fontWeight: 600,
                padding: "7px 18px",
                borderRadius: 5,
                background: loading ? "rgba(74,222,128,0.05)" : "rgba(74,222,128,0.12)",
                color: loading ? "#2d6e4a" : "#4ade80",
                border: `1px solid ${loading ? "rgba(74,222,128,0.1)" : "rgba(74,222,128,0.3)"}`,
                cursor: loading || !code.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 8,
                letterSpacing: "0.04em",
                transition: "all 0.2s",
              }}
            >
              {loading ? (
                <>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    border: "1.5px solid rgba(74,222,128,0.2)",
                    borderTopColor: "#4ade80",
                    animation: "spin 0.7s linear infinite",
                  }} />
                  scanning...
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L1.5 3.5v3C1.5 9.5 3.5 11.5 6 12.2c2.5-.7 4.5-2.7 4.5-5.7v-3L6 1z" fill="#4ade80" fillOpacity={0.8}/>
                  </svg>
                  run scan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right — results panel */}
        <div style={{
          background: "#010409",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "8px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "#0d1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 10, color: "#484f58", letterSpacing: "0.06em" }}>
              FINDINGS
            </span>
            {hasReviewed && (
              <span style={{ fontSize: 10, color: "#484f58" }}>
                {totalIssues} total
              </span>
            )}
          </div>

          {/* Results scroll area */}
          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>

            {/* Empty state */}
            {!hasReviewed && !loading && (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: "100%", gap: 12,
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15 }}>
                  <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" stroke="#e6edf3" strokeWidth="1.2"/>
                </svg>
                <p style={{ fontSize: 11, color: "#2d333b", textAlign: "center", margin: 0 }}>
                  paste code and run scan<br />to detect vulnerabilities
                </p>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[80, 60, 70].map((w, i) => (
                  <div key={i} style={{
                    background: "#0d1117",
                    border: "1px solid rgba(255,255,255,0.04)",
                    borderLeft: "2px solid rgba(255,255,255,0.06)",
                    borderRadius: "0 6px 6px 0",
                    padding: "11px 14px",
                    animation: "pulse-dot 1.4s ease infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}>
                    <div style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "center" }}>
                      <div style={{ width: 28, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.04)" }} />
                      <div style={{ width: `${w}%`, height: 10, borderRadius: 2, background: "rgba(255,255,255,0.04)" }} />
                    </div>
                    <div style={{ width: "90%", height: 8, borderRadius: 2, background: "rgba(255,255,255,0.03)" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Clean state */}
            {hasReviewed && totalIssues === 0 && (
              <div style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                height: "100%", gap: 10,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(74,222,128,0.08)",
                  border: "1px solid rgba(74,222,128,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M5 9l3 3 5-5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 11, color: "#4ade80", margin: 0 }}>no vulnerabilities detected</p>
              </div>
            )}

            {/* Findings */}
            {hasReviewed && findings.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {findings.map((f, i) => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    code={code}
                    feedbackState={feedbackState}
                    onFeedback={handleFeedback}
                    index={i}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{
              margin: 12,
              padding: "10px 12px",
              background: "rgba(255,68,68,0.06)",
              border: "1px solid rgba(255,68,68,0.2)",
              borderRadius: 5,
              fontSize: 11, color: "#ff4444",
              fontFamily: "inherit",
            }}>
              error: {error}
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: "8px 16px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "#0d1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 9, color: "#2d333b", letterSpacing: "0.06em" }}>
              POWERED BY CLAUDE + OWASP TOP 10
            </span>
            {hasReviewed && totalIssues > 0 && (
              <span style={{ fontSize: 9, color: "#2d333b" }}>
                {acceptedCount}↑ {disputedCount}↓
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
