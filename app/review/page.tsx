"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

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

interface Tab {
  id: string;
  fileName: string;
  code: string;
  language: string;
  findings: Finding[];
  feedbackState: Record<string, string>;
  hasReviewed: boolean;
  loading: boolean;
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
    query = "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'"
    result = db.execute(query)
    token = pickle.loads(result['session'])
    subprocess.call(["log", username])
    return token

def reset_password(email):
    os.system("sendmail " + email)
    return True`;

function getExtension(language: string): string {
  const map: Record<string, string> = {
    python: "py", javascript: "js", typescript: "ts",
    go: "go", java: "java", rust: "rs", php: "php", ruby: "rb",
  };
  return map[language] || language;
}

function newTab(overrides: Partial<Tab> = {}): Tab {
  return {
    id: Math.random().toString(36).slice(2),
    fileName: "untitled",
    code: EXAMPLE_CODE,
    language: "python",
    findings: [],
    feedbackState: {},
    hasReviewed: false,
    loading: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// FindingCard
// ---------------------------------------------------------------------------
function FindingCard({ finding, onFeedback, feedbackState }: {
  finding: Finding;
  feedbackState: Record<string, string>;
  onFeedback: (id: string, verdict: string | null, reason: string | null) => void;
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
    }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 14px", cursor: "pointer",
          background: expanded ? sev.bg : "transparent",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: sev.color, minWidth: 34, letterSpacing: "0.06em" }}>
          {sev.label}
        </span>
        <span style={{ fontSize: 14, color: "#e6edf3", flex: 1, fontWeight: 500 }}>{finding.title}</span>
        {finding.line !== "N/A" && (
          <span style={{ fontSize: 11, color: "#484f58" }}>:{finding.line}</span>
        )}
        {fb && (
          <span style={{
            fontSize: 10, padding: "2px 6px", borderRadius: 3,
            background: fb === "accepted" ? "rgba(74,222,128,0.1)" : "rgba(255,140,0,0.1)",
            color: fb === "accepted" ? "#4ade80" : "#ff8c00",
          }}>
            {fb}
          </span>
        )}
        <span style={{ fontSize: 10, color: "#484f58", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s", display: "inline-block" }}>▼</span>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <p style={{ fontSize: 13, color: "#8b949e", margin: "12px 0 10px", lineHeight: 1.6 }}>
            {finding.description}
          </p>
          <div style={{ marginBottom: 10 }}>
            <span style={{
              fontSize: 11, fontFamily: "monospace",
              color: "#484f58", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 3, padding: "2px 6px",
            }}>
              {finding.owasp}
            </span>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 5, padding: "10px 12px", marginBottom: 12,
          }}>
            <span style={{ fontSize: 11, color: "#484f58", display: "block", marginBottom: 4 }}>fix</span>
            <span style={{ fontSize: 13, color: "#c9d1d9", lineHeight: 1.55 }}>{finding.recommendation}</span>
          </div>

          {!fb ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => onFeedback(finding.id, "accepted", null)} style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 4,
                border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.05)",
                color: "#4ade80", cursor: "pointer", fontFamily: "inherit",
              }}>✓ accept</button>
              <button onClick={() => setShowDispute(s => !s)} style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 4,
                border: "1px solid rgba(255,140,0,0.3)", background: "rgba(255,140,0,0.05)",
                color: "#ff8c00", cursor: "pointer", fontFamily: "inherit",
              }}>✕ dispute</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: fb === "accepted" ? "#4ade80" : "#ff8c00" }}>
                {fb === "accepted" ? "✓ accepted" : "✕ disputed"}
              </span>
              <button onClick={() => onFeedback(finding.id, null, null)} style={{
                fontSize: 11, background: "none", border: "none", color: "#484f58", cursor: "pointer", fontFamily: "inherit",
              }}>undo</button>
            </div>
          )}

          {showDispute && !fb && (
            <div style={{
              marginTop: 10, background: "rgba(255,140,0,0.04)",
              border: "1px solid rgba(255,140,0,0.15)", borderRadius: 5, padding: 12,
            }}>
              <p style={{ fontSize: 11, color: "#8b949e", margin: "0 0 10px" }}>dispute_reason</p>
              {[
                ["false-positive", "false_positive"],
                ["handled-elsewhere", "handled_elsewhere"],
                ["not-applicable", "not_applicable"],
                ["other", "other"],
              ].map(([val, label]) => (
                <label key={val} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, cursor: "pointer", fontSize: 13, color: "#8b949e" }}>
                  <input type="radio" name={`dispute-${finding.id}`} value={val}
                    checked={disputeReason === val} onChange={() => setDisputeReason(val)}
                    style={{ accentColor: "#ff8c00" }} />
                  {label}
                </label>
              ))}
              {disputeReason === "other" && (
                <input type="text" placeholder="describe reason..." value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  style={{
                    width: "100%", marginTop: 6, marginBottom: 8,
                    fontSize: 13, padding: "6px 8px", borderRadius: 4,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "#0d1117", color: "#e6edf3", fontFamily: "inherit", outline: "none",
                  }} />
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={submitDispute}
                  disabled={!disputeReason || (disputeReason === "other" && !customReason)}
                  style={{
                    fontSize: 12, padding: "5px 12px", borderRadius: 4,
                    background: disputeReason ? "#ff8c00" : "rgba(255,255,255,0.04)",
                    color: disputeReason ? "#000" : "#484f58",
                    border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600,
                  }}>submit</button>
                <button onClick={() => { setShowDispute(false); setDisputeReason(""); }}
                  style={{
                    fontSize: 12, padding: "5px 12px", borderRadius: 4,
                    background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#484f58", cursor: "pointer", fontFamily: "inherit",
                  }}>cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ReviewPage() {
  const [tabs, setTabs] = useState<Tab[]>([newTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [editingName, setEditingName] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [scanPhase, setScanPhase] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  function updateTab(id: string, updates: Partial<Tab>) {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  function addTab(overrides: Partial<Tab> = {}) {
    const tab = newTab(overrides);
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
    return tab;
  }

  function closeTab(id: string) {
    if (tabs.length === 1) return;
    const idx = tabs.findIndex(t => t.id === id);
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[Math.max(0, idx - 1)].id);
    }
  }

  // Drag and drop handler
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".py"));
    if (files.length === 0) return;

    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        const name = file.name.replace(".py", "");
        if (i === 0 && activeTab.code === EXAMPLE_CODE && !activeTab.hasReviewed) {
          updateTab(activeTab.id, { fileName: name, code: content, language: "python", findings: [], hasReviewed: false });
        } else {
          addTab({ fileName: name, code: content, language: "python" });
        }
      };
      reader.readAsText(file);
    });
  }, [activeTab, addTab, updateTab]);

  async function runReview() {
    if (!activeTab.code.trim() || activeTab.loading) return;
    const id = activeTab.id;

    updateTab(id, { loading: true, findings: [], feedbackState: {}, hasReviewed: false });

    const phases = ["initialising...", "parsing AST...", "querying vector store...", "analysing OWASP...", "generating findings..."];
    let pi = 0;
    setScanPhase(phases[0]);
    const interval = setInterval(() => { pi = (pi + 1) % phases.length; setScanPhase(phases[pi]); }, 1200);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: activeTab.code,
          language: activeTab.language,
          fileName: `${activeTab.fileName}.${getExtension(activeTab.language)}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `API error ${res.status}`);
      }

      const data = await res.json();
      const sorted = [...(data.findings || [])].sort(
        (a: Finding, b: Finding) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
      );
      updateTab(id, { findings: sorted, hasReviewed: true, loading: false });
    } catch (err: any) {
      updateTab(id, { loading: false });
      alert(`Error: ${err.message}`);
    } finally {
      clearInterval(interval);
      setScanPhase("");
    }
  }

  async function handleFeedback(id: string, verdict: string | null, reason: string | null) {
    const finding = activeTab.findings.find(f => f.id === id);
    const newState = { ...activeTab.feedbackState };
    if (verdict === null) { delete newState[id]; }
    else { newState[id] = verdict; }
    updateTab(activeTab.id, { feedbackState: newState });

    if (verdict && finding) {
      try {
        await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingId: id, codeSnippet: activeTab.code,
            findingTitle: finding.title, findingSeverity: finding.severity,
            owaspCategory: finding.owasp, verdict, disputeReason: reason,
          }),
        });
      } catch {}
    }
  }

  const counts = SEV_ORDER.reduce((acc, s) => {
    acc[s] = activeTab.findings.filter(f => f.severity === s).length;
    return acc;
  }, {} as Record<string, number>);

  const totalIssues = activeTab.findings.length;
  const ext = getExtension(activeTab.language);

  return (
    <div style={{
      minHeight: "100vh", background: "#010409",
      color: "#e6edf3", fontFamily: "'JetBrains Mono', monospace",
      display: "flex", flexDirection: "column",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        @keyframes scanline { from{top:-2px}to{top:100%} }
        * { box-sizing: border-box; }
        textarea { resize: none; }
        textarea::placeholder { color: #2d333b; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Nav */}
      <header style={{
        background: "rgba(1,4,9,0.95)", backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 20px", height: 48,
        display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
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
            { label: "dashboard", href: "/dashboard" },
            { label: "review", href: "/review", active: true },
            { label: "repos", href: "/repos" },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              fontSize: 12, padding: "4px 10px", borderRadius: 5,
              background: item.active ? "rgba(255,255,255,0.06)" : "transparent",
              color: item.active ? "#e6edf3" : "#484f58",
              textDecoration: "none",
            }}>{item.label}</Link>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: activeTab.loading ? "#f5c518" : "#4ade80",
            animation: activeTab.loading ? "pulse 1s ease infinite" : "none",
          }} />
          <span style={{ fontSize: 11, color: "#484f58" }}>
            {activeTab.loading ? scanPhase : activeTab.hasReviewed ? `${totalIssues} issue${totalIssues !== 1 ? "s" : ""} found` : "ready"}
          </span>
        </div>

        {activeTab.hasReviewed && totalIssues > 0 && (
          <div style={{ display: "flex", gap: 10 }}>
            {SEV_ORDER.map(s => counts[s] > 0 && (
              <span key={s} style={{ fontSize: 10, color: SEV[s].color, fontWeight: 600 }}>
                {counts[s]} {SEV[s].label}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Tabs bar */}
      <div style={{
        display: "flex", alignItems: "center",
        background: "#0d1117",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        overflowX: "auto", flexShrink: 0,
      }}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTabId(tab.id)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 14px", cursor: "pointer", flexShrink: 0,
              borderRight: "1px solid rgba(255,255,255,0.06)",
              background: tab.id === activeTabId ? "#010409" : "transparent",
              borderBottom: tab.id === activeTabId ? "1px solid #010409" : "1px solid transparent",
              marginBottom: tab.id === activeTabId ? -1 : 0,
            }}
          >
            <span style={{ fontSize: 12, color: tab.id === activeTabId ? "#e6edf3" : "#484f58" }}>
              {tab.fileName}.{getExtension(tab.language)}
            </span>
            {tab.findings.length > 0 && (
              <span style={{
                fontSize: 9, padding: "1px 5px", borderRadius: 8,
                background: "rgba(255,68,68,0.15)", color: "#ff4444",
              }}>{tab.findings.length}</span>
            )}
            {tabs.length > 1 && (
              <span
                onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                style={{ fontSize: 12, color: "#484f58", cursor: "pointer", lineHeight: 1 }}
              >×</span>
            )}
          </div>
        ))}
        <button
          onClick={() => addTab({ code: "", fileName: "untitled" })}
          style={{
            padding: "8px 12px", background: "transparent", border: "none",
            color: "#484f58", cursor: "pointer", fontSize: 16, fontFamily: "inherit",
          }}
        >+</button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".py,.js,.ts,.go,.java,.rs,.php,.rb"
          multiple
          style={{ display: "none" }}
          onChange={e => {
            const files = Array.from(e.target.files || []);
            files.forEach((file, i) => {
              const reader = new FileReader();
              reader.onload = ev => {
                const content = ev.target?.result as string;
                const name = file.name.replace(/\.[^.]+$/, "");
                const lang = file.name.endsWith(".py") ? "python" :
                  file.name.endsWith(".ts") ? "typescript" :
                  file.name.endsWith(".js") ? "javascript" : "python";
                if (i === 0 && activeTab.code === EXAMPLE_CODE) {
                  updateTab(activeTab.id, { fileName: name, code: content, language: lang });
                } else {
                  addTab({ fileName: name, code: content, language: lang });
                }
              };
              reader.readAsText(file);
            });
          }}
        />

        <div style={{ flex: 1 }} />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            fontSize: 11, padding: "4px 12px", marginRight: 8,
            background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
            color: "#484f58", borderRadius: 4, cursor: "pointer", fontFamily: "inherit",
          }}
        >upload files</button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 400px", overflow: "hidden" }}>

        {/* Editor */}
        <div
          style={{
            borderRight: "1px solid rgba(255,255,255,0.06)",
            display: "flex", flexDirection: "column",
            background: dragOver ? "rgba(74,222,128,0.02)" : "#0d1117",
            transition: "background 0.2s",
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          {/* Editor toolbar */}
          <div style={{
            padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
              ))}
            </div>

            {/* Editable filename */}
            {editingName ? (
              <input
                ref={nameInputRef}
                autoFocus
                value={activeTab.fileName}
                onChange={e => updateTab(activeTab.id, { fileName: e.target.value })}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingName(false); }}
                style={{
                  fontSize: 12, background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(74,222,128,0.3)", borderRadius: 4,
                  color: "#e6edf3", padding: "2px 8px", outline: "none",
                  fontFamily: "inherit", width: 160,
                }}
              />
            ) : (
              <span
                onClick={() => setEditingName(true)}
                title="Click to rename"
                style={{
                  fontSize: 12, color: "#8b949e", cursor: "text",
                  padding: "2px 6px", borderRadius: 4,
                  border: "1px solid transparent",
                  transition: "border-color 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
              >
                {activeTab.fileName}.{ext}
                <span style={{ fontSize: 10, color: "#2d333b", marginLeft: 5 }}>✎</span>
              </span>
            )}

            <div style={{ flex: 1 }} />

            <select
              value={activeTab.language}
              onChange={e => updateTab(activeTab.id, { language: e.target.value })}
              style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "#161b22", color: "#8b949e",
                cursor: "pointer", fontFamily: "inherit", outline: "none",
              }}
            >
              {["python", "javascript", "typescript", "go", "java", "rust", "php", "ruby"].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <button
              onClick={() => updateTab(activeTab.id, { code: "", findings: [], hasReviewed: false, feedbackState: {} })}
              style={{
                fontSize: 11, padding: "3px 8px", borderRadius: 4,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "transparent", cursor: "pointer",
                color: "#484f58", fontFamily: "inherit",
              }}
            >clear</button>
          </div>

          {/* Drag overlay */}
          {dragOver && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(1,4,9,0.8)",
              border: "2px dashed rgba(74,222,128,0.4)",
              borderRadius: 8, margin: 8,
              pointerEvents: "none",
            }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⬆</div>
                <p style={{ fontSize: 14, color: "#4ade80" }}>drop .py files here</p>
              </div>
            </div>
          )}

          {/* Line numbers + textarea */}
          <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
            <div style={{
              width: 48, background: "#0d1117",
              borderRight: "1px solid rgba(255,255,255,0.04)",
              padding: "16px 0", userSelect: "none", overflowY: "hidden", flexShrink: 0,
            }}>
              {activeTab.code.split("\n").map((_, i) => (
                <div key={i} style={{
                  fontSize: 13, lineHeight: "1.65",
                  color: "#2d333b", textAlign: "right", paddingRight: 10,
                }}>
                  {i + 1}
                </div>
              ))}
            </div>

            <textarea
              value={activeTab.code}
              onChange={e => updateTab(activeTab.id, { code: e.target.value })}
              spellCheck={false}
              placeholder="// paste code or drop files here..."
              style={{
                flex: 1, background: "#0d1117", border: "none", outline: "none",
                color: "#e6edf3", fontSize: 14, lineHeight: 1.65,
                padding: "16px 16px", fontFamily: "inherit", overflowY: "auto",
              }}
            />

            {/* Scan line */}
            {activeTab.loading && (
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.4), transparent)",
                  animation: "scanline 2s linear infinite",
                }} />
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{
            padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 11, color: "#2d333b" }}>
              {activeTab.code.split("\n").length} lines · {activeTab.code.length} chars
            </span>
            <button
              onClick={runReview}
              disabled={activeTab.loading || !activeTab.code.trim()}
              style={{
                fontSize: 12, fontWeight: 600, padding: "7px 18px", borderRadius: 5,
                background: activeTab.loading ? "rgba(74,222,128,0.05)" : "rgba(74,222,128,0.12)",
                color: activeTab.loading ? "#2d6e4a" : "#4ade80",
                border: `1px solid ${activeTab.loading ? "rgba(74,222,128,0.1)" : "rgba(74,222,128,0.3)"}`,
                cursor: activeTab.loading || !activeTab.code.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {activeTab.loading ? (
                <>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    border: "1.5px solid rgba(74,222,128,0.2)", borderTopColor: "#4ade80",
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

        {/* Results panel */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "#010409" }}>
          <div style={{
            padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, color: "#484f58", letterSpacing: "0.06em" }}>FINDINGS</span>
            {activeTab.hasReviewed && (
              <span style={{ fontSize: 10, color: "#484f58" }}>{totalIssues} total</span>
            )}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
            {!activeTab.hasReviewed && !activeTab.loading && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.15 }}>
                  <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" stroke="#e6edf3" strokeWidth="1.2"/>
                </svg>
                <p style={{ fontSize: 12, color: "#2d333b", textAlign: "center", margin: 0, lineHeight: 1.6 }}>
                  paste code and run scan<br />or drop .py files onto the editor
                </p>
              </div>
            )}

            {activeTab.loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[80, 60, 70].map((w, i) => (
                  <div key={i} style={{
                    background: "#0d1117", border: "1px solid rgba(255,255,255,0.04)",
                    borderLeft: "2px solid rgba(255,255,255,0.06)",
                    borderRadius: "0 6px 6px 0", padding: "12px 14px",
                    animation: "pulse 1.4s ease infinite", animationDelay: `${i * 0.2}s`,
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

            {activeTab.hasReviewed && totalIssues === 0 && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M5 9l3 3 5-5" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <p style={{ fontSize: 12, color: "#4ade80", margin: 0 }}>no vulnerabilities detected</p>
              </div>
            )}

            {activeTab.hasReviewed && activeTab.findings.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {activeTab.findings.map(f => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    feedbackState={activeTab.feedbackState}
                    onFeedback={handleFeedback}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{
            padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "#0d1117", display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 9, color: "#2d333b", letterSpacing: "0.06em" }}>
              CLAUDE + OWASP TOP 10
            </span>
            <Link href="/dashboard" style={{ fontSize: 9, color: "#2d333b", textDecoration: "none" }}>
              view history →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
