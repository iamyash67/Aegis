"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const FEATURES = [
  {
    icon: "⬡",
    title: "AST-enriched analysis",
    description: "Extracts function signatures, imports, and dangerous calls before sending to Claude. Findings reference exact function names and parameters — not just line numbers.",
  },
  {
    icon: "⬡",
    title: "Cross-file dependency resolution",
    description: "Automatically detects imports and pulls function signatures from dependency files. Finds vulnerabilities in code your file depends on — not just the file being reviewed.",
  },
  {
    icon: "⬡",
    title: "RAG-powered context",
    description: "Every file in your repo is embedded with voyage-code-3 and stored in a vector database. Reviews retrieve semantically similar code chunks for codebase-aware analysis.",
  },
  {
    icon: "⬡",
    title: "Feedback loop",
    description: "Accept or dispute findings. Disputes are stored with embeddings and injected into future prompts — Claude learns from your team's judgment over time.",
  },
  {
    icon: "⬡",
    title: "GitHub PR integration",
    description: "Webhook fires on every pull request. Findings posted as formatted PR comments within seconds — no manual review step required.",
  },
  {
    icon: "⬡",
    title: "OWASP Top 10 coverage",
    description: "Every finding mapped to an OWASP category. SQL injection, broken access control, insecure deserialisation, cryptographic failures — all covered.",
  },
];

const OWASP_CATEGORIES = [
  "A01 Broken Access Control",
  "A02 Cryptographic Failures",
  "A03 Injection",
  "A04 Insecure Design",
  "A05 Security Misconfiguration",
  "A06 Vulnerable Components",
  "A07 Auth Failures",
  "A08 Data Integrity Failures",
  "A09 Logging Failures",
  "A10 SSRF",
];

const DEMO_FINDINGS = [
  { severity: "critical", title: "SQL Injection in login()", line: "14", owasp: "A03:2021" },
  { severity: "critical", title: "Insecure deserialisation via pickle", line: "21", owasp: "A08:2021" },
  { severity: "high", title: "Command injection via os.system()", line: "33", owasp: "A03:2021" },
  { severity: "medium", title: "Missing authorization check", line: "47", owasp: "A01:2021" },
  { severity: "low", title: "Sensitive data in logs", line: "58", owasp: "A09:2021" },
];

const SEV_COLORS: Record<string, string> = {
  critical: "#ff4444",
  high: "#ff8c00",
  medium: "#f5c518",
  low: "#4ade80",
  info: "#60a5fa",
};

function TypingText({ texts }: { texts: string[] }) {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    if (!deleting && displayed.length < current.length) {
      const t = setTimeout(() => setDisplayed(current.slice(0, displayed.length + 1)), 40);
      return () => clearTimeout(t);
    }
    if (!deleting && displayed.length === current.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 20);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((idx + 1) % texts.length);
    }
  }, [displayed, deleting, idx, texts]);

  return (
    <span style={{ color: "#4ade80" }}>
      {displayed}
      <span style={{ animation: "blink 1s step-end infinite", opacity: 1 }}>█</span>
    </span>
  );
}

export default function LandingPage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#010409",
      color: "#e6edf3",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      overflowX: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scanline { from { top: -2px; } to { top: 100%; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(74,222,128,0.2); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(1,4,9,0.85)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 40px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" stroke="#4ade80" strokeWidth="1.5" fill="none"/>
            <path d="M9 12l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.02em" }}>aegis</span>
          <span style={{
            fontSize: 9, color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)",
            borderRadius: 3, padding: "1px 5px", letterSpacing: "0.08em",
          }}>BETA</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {["docs", "github"].map(item => (
            <a key={item} href={item === "github" ? "https://github.com/iamyash67/aegis" : "#"}
              style={{ fontSize: 12, color: "#484f58", textDecoration: "none", letterSpacing: "0.04em" }}
            >
              {item}
            </a>
          ))}
          <Link href="/review" style={{
            fontSize: 12, padding: "6px 16px", borderRadius: 5,
            background: "rgba(74,222,128,0.1)", color: "#4ade80",
            border: "1px solid rgba(74,222,128,0.25)",
            textDecoration: "none", letterSpacing: "0.04em", fontWeight: 500,
          }}>
            launch app →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 40px 80px", position: "relative",
      }}>
        {/* Grid background */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }} />

        {/* Glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(74,222,128,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 800 }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)",
            borderRadius: 20, padding: "5px 14px", marginBottom: 32,
            animation: "fadeUp 0.5s ease both",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "pulse 2s ease infinite" }} />
            <span style={{ fontSize: 11, color: "#4ade80", letterSpacing: "0.06em" }}>
              POWERED BY CLAUDE + OWASP TOP 10
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: 56, fontWeight: 700, lineHeight: 1.1,
            marginBottom: 16, letterSpacing: "-0.02em",
            animation: "fadeUp 0.5s ease 0.1s both",
          }}>
            Security reviews that{" "}
            <TypingText texts={["never sleep.", "catch what humans miss.", "learn over time.", "ship with your code."]} />
          </h1>

          <p style={{
            fontSize: 17, color: "#8b949e", lineHeight: 1.7,
            marginBottom: 40, maxWidth: 560, margin: "0 auto 40px",
            animation: "fadeUp 0.5s ease 0.2s both",
          }}>
            Aegis automatically reviews every pull request for security vulnerabilities using a four-layer AI pipeline — AST parsing, RAG retrieval, dependency resolution, and feedback-augmented prompting.
          </p>

          {/* CTAs */}
          <div style={{
            display: "flex", gap: 12, justifyContent: "center",
            animation: "fadeUp 0.5s ease 0.3s both",
          }}>
            <Link href="/review" style={{
              fontSize: 13, fontWeight: 600, padding: "11px 28px", borderRadius: 6,
              background: "#4ade80", color: "#010409",
              textDecoration: "none", letterSpacing: "0.04em",
              display: "inline-flex", alignItems: "center", gap: 8,
            }}>
              try it free →
            </Link>
            <a href="https://github.com/iamyash67/aegis" style={{
              fontSize: 13, padding: "11px 28px", borderRadius: 6,
              background: "transparent", color: "#e6edf3",
              border: "1px solid rgba(255,255,255,0.1)",
              textDecoration: "none", letterSpacing: "0.04em",
            }}>
              view source
            </a>
          </div>

          {/* Stats */}
          <div style={{
            display: "flex", gap: 40, justifyContent: "center",
            marginTop: 56, animation: "fadeUp 0.5s ease 0.4s both",
          }}>
            {[
              { value: "4", label: "pipeline layers" },
              { value: "10", label: "OWASP categories" },
              { value: "<10s", label: "time to first comment" },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#4ade80" }}>{stat.value}</div>
                <div style={{ fontSize: 11, color: "#484f58", letterSpacing: "0.06em", marginTop: 2 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo finding preview */}
      <section style={{ padding: "0 40px 100px", maxWidth: 900, margin: "0 auto" }}>
        <div style={{
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 10, overflow: "hidden",
          position: "relative",
        }}>
          {/* Terminal bar */}
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 10,
            background: "#161b22",
          }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.8 }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "#484f58", flex: 1, textAlign: "center" }}>
              aegis — security review — auth_service.py
            </span>
            <span style={{ fontSize: 10, color: "#4ade80" }}>● live</span>
          </div>

          {/* Findings */}
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {DEMO_FINDINGS.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.04)",
                borderLeft: `2px solid ${SEV_COLORS[f.severity]}`,
                borderRadius: "0 6px 6px 0",
                animation: `fadeUp 0.4s ease ${i * 0.08}s both`,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: SEV_COLORS[f.severity],
                  minWidth: 50, letterSpacing: "0.06em",
                }}>
                  {f.severity.toUpperCase()}
                </span>
                <span style={{ fontSize: 13, color: "#e6edf3", flex: 1 }}>{f.title}</span>
                <span style={{ fontSize: 10, color: "#484f58" }}>:{f.line}</span>
                <span style={{
                  fontSize: 10, color: "#484f58",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 3, padding: "1px 5px",
                  fontFamily: "monospace",
                }}>{f.owasp}</span>
              </div>
            ))}
          </div>

          {/* Scan line animation */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", borderRadius: 10 }}>
            <div style={{
              position: "absolute", left: 0, right: 0, height: 1,
              background: "linear-gradient(90deg, transparent, rgba(74,222,128,0.3), transparent)",
              animation: "scanline 3s linear infinite",
            }} />
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <p style={{ fontSize: 11, color: "#4ade80", letterSpacing: "0.1em", marginBottom: 12 }}>
            ARCHITECTURE
          </p>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>
            Four layers. One pipeline.
          </h2>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {FEATURES.map((feature, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                background: hoveredFeature === i ? "#0d1117" : "rgba(255,255,255,0.01)",
                border: `1px solid ${hoveredFeature === i ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 10, padding: "24px",
                transition: "all 0.2s", cursor: "default",
              }}
            >
              <div style={{
                fontSize: 20, color: "#4ade80", marginBottom: 14,
                transform: hoveredFeature === i ? "scale(1.1)" : "scale(1)",
                transition: "transform 0.2s", display: "inline-block",
              }}>
                {feature.icon}
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: "#e6edf3" }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.65 }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* OWASP coverage */}
      <section style={{ padding: "80px 40px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontSize: 11, color: "#4ade80", letterSpacing: "0.1em", marginBottom: 12 }}>COVERAGE</p>
          <h2 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>OWASP Top 10</h2>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {OWASP_CATEGORIES.map((cat, i) => (
            <div key={i} style={{
              fontSize: 12, padding: "7px 14px",
              background: "rgba(74,222,128,0.04)",
              border: "1px solid rgba(74,222,128,0.15)",
              borderRadius: 5, color: "#8b949e",
            }}>
              {cat}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "80px 40px 120px", textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h2 style={{ fontSize: 40, fontWeight: 700, marginBottom: 16, letterSpacing: "-0.02em" }}>
          Ready to secure your codebase?
        </h2>
        <p style={{ fontSize: 15, color: "#8b949e", marginBottom: 36 }}>
          Free to use. No credit card required.
        </p>
        <Link href="/review" style={{
          fontSize: 14, fontWeight: 600, padding: "13px 36px", borderRadius: 6,
          background: "#4ade80", color: "#010409",
          textDecoration: "none", letterSpacing: "0.04em",
          display: "inline-block",
        }}>
          start scanning →
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "24px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" stroke="#4ade80" strokeWidth="1.5" fill="none"/>
          </svg>
          <span style={{ fontSize: 12, color: "#484f58" }}>aegis — always watching, never sleeping</span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="https://github.com/iamyash67/aegis" style={{ fontSize: 11, color: "#484f58", textDecoration: "none" }}>github</a>
          <a href="/review" style={{ fontSize: 11, color: "#484f58", textDecoration: "none" }}>app</a>
        </div>
      </footer>
    </div>
  );
}
