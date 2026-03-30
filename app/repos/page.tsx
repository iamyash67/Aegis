"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

interface IngestResult {
  repoId: string;
  filesFound: number;
  filesIngested: number;
  chunksStored: number;
  fileList: string[];
}

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

export default function ReposPage() {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [repoName, setRepoName] = useState("");
  const [phase, setPhase] = useState("");

  async function ingestRepo() {
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const phases = [
      "connecting to github...",
      "fetching file tree...",
      "downloading python files...",
      "generating embeddings...",
      "storing in vector db...",
    ];
    let i = 0;
    setPhase(phases[0]);
    const interval = setInterval(() => {
      i = (i + 1) % phases.length;
      setPhase(phases[i]);
    }, 2000);

    try {
      const response = await fetch("/api/ingest-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, forceReingest: false }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ingestion failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      clearInterval(interval);
      setPhase("");
      setLoading(false);
    }
  }

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".py"));
    if (files.length === 0) {
      setError("Only Python (.py) files are supported currently");
      return;
    }

    const read = await Promise.all(
      files.map(f => f.text().then(content => ({
        name: f.name,
        content,
        size: f.size,
      })))
    );
    setUploadedFiles(prev => [...prev, ...read]);
    setError(null);
  }, []);

  async function ingestUploaded() {
    if (uploadedFiles.length === 0 || !repoName.trim()) return;
    setUploadLoading(true);
    setError(null);
    setUploadResult(null);

    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: repoName.trim(),
          forceReingest: true,
          files: uploadedFiles.map(f => ({ path: f.name, content: f.content })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setUploadResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploadLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#010409",
      color: "#e6edf3",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } @keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.4} }`}</style>

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
            { label: "dashboard", href: "/dashboard" },
            { label: "review", href: "/review" },
            { label: "repos", href: "/repos", active: true },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              fontSize: 12, padding: "4px 10px", borderRadius: 5,
              background: item.active ? "rgba(255,255,255,0.06)" : "transparent",
              color: item.active ? "#e6edf3" : "#484f58",
              textDecoration: "none",
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

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Repositories</h1>
          <p style={{ fontSize: 13, color: "#484f58" }}>
            Ingest a repo to enable cross-file context and RAG-powered reviews
          </p>
        </div>

        {/* GitHub URL ingestion */}
        <div style={{
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: 24, marginBottom: 20,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "#e6edf3" }}>
            Import from GitHub
          </h2>
          <p style={{ fontSize: 12, color: "#484f58", marginBottom: 16 }}>
            Paste a public GitHub repo URL — Aegis will fetch and embed all Python files
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <input
              type="text"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ingestRepo()}
              placeholder="https://github.com/username/repo"
              style={{
                flex: 1, fontSize: 13, padding: "9px 12px",
                background: "#161b22", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6, color: "#e6edf3", outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={ingestRepo}
              disabled={loading || !repoUrl.trim()}
              style={{
                fontSize: 12, fontWeight: 600, padding: "9px 20px",
                borderRadius: 6,
                background: loading ? "rgba(74,222,128,0.05)" : "rgba(74,222,128,0.12)",
                color: loading ? "#2d6e4a" : "#4ade80",
                border: "1px solid rgba(74,222,128,0.25)",
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
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
                  {phase}
                </>
              ) : "ingest repo →"}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div style={{
              marginTop: 16,
              background: "rgba(74,222,128,0.04)",
              border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: 8, padding: 16,
            }}>
              <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                {[
                  { label: "files found", value: result.filesFound },
                  { label: "files ingested", value: result.filesIngested },
                  { label: "chunks stored", value: result.chunksStored },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: "#484f58", letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, color: "#484f58", marginBottom: 8 }}>
                repo_id: <span style={{ color: "#8b949e" }}>{result.repoId}</span>
              </div>

              <div style={{
                maxHeight: 160, overflowY: "auto",
                background: "#010409", borderRadius: 6,
                padding: "8px 12px",
              }}>
                {result.fileList.map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#484f58", padding: "2px 0" }}>
                    <span style={{ color: "#4ade80", marginRight: 8 }}>+</span>{f}
                  </div>
                ))}
              </div>

              <Link href="/review" style={{
                display: "inline-block", marginTop: 14,
                fontSize: 12, padding: "6px 16px", borderRadius: 5,
                background: "#4ade80", color: "#010409",
                textDecoration: "none", fontWeight: 600,
              }}>
                review this repo →
              </Link>
            </div>
          )}
        </div>

        {/* Drag and drop */}
        <div style={{
          background: "#0d1117",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 10, padding: 24,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: "#e6edf3" }}>
            Upload files
          </h2>
          <p style={{ fontSize: 12, color: "#484f58", marginBottom: 16 }}>
            Drag and drop Python files directly — no GitHub account needed
          </p>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "rgba(74,222,128,0.5)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8, padding: "32px 20px",
              textAlign: "center", marginBottom: 16,
              background: dragOver ? "rgba(74,222,128,0.03)" : "transparent",
              transition: "all 0.2s", cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8, opacity: 0.4 }}>⬆</div>
            <p style={{ fontSize: 13, color: "#484f58", margin: 0 }}>
              drop .py files here
            </p>
            <p style={{ fontSize: 11, color: "#2d333b", margin: "4px 0 0" }}>
              multiple files supported
            </p>
          </div>

          {/* Uploaded files list */}
          {uploadedFiles.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 10, color: "#484f58", letterSpacing: "0.06em",
                marginBottom: 8,
              }}>
                {uploadedFiles.length} FILE{uploadedFiles.length !== 1 ? "S" : ""} READY
              </div>
              {uploadedFiles.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 5, marginBottom: 4,
                }}>
                  <span style={{ fontSize: 12, color: "#8b949e" }}>{f.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 10, color: "#484f58" }}>
                      {(f.size / 1024).toFixed(1)}kb
                    </span>
                    <button
                      onClick={() => setUploadedFiles(prev => prev.filter((_, j) => j !== i))}
                      style={{
                        background: "none", border: "none", color: "#484f58",
                        cursor: "pointer", fontSize: 12, padding: 0,
                        fontFamily: "inherit",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}

              {/* Repo name input */}
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <input
                  type="text"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  placeholder="project name (used as repo ID)"
                  style={{
                    flex: 1, fontSize: 12, padding: "8px 12px",
                    background: "#161b22",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 6, color: "#e6edf3",
                    outline: "none", fontFamily: "inherit",
                  }}
                />
                <button
                  onClick={ingestUploaded}
                  disabled={uploadLoading || !repoName.trim()}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "8px 18px",
                    borderRadius: 6,
                    background: "rgba(74,222,128,0.12)",
                    color: "#4ade80",
                    border: "1px solid rgba(74,222,128,0.25)",
                    cursor: uploadLoading || !repoName.trim() ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 8,
                    whiteSpace: "nowrap",
                    opacity: !repoName.trim() ? 0.4 : 1,
                  }}
                >
                  {uploadLoading ? (
                    <>
                      <div style={{
                        width: 10, height: 10, borderRadius: "50%",
                        border: "1.5px solid rgba(74,222,128,0.2)",
                        borderTopColor: "#4ade80",
                        animation: "spin 0.7s linear infinite",
                      }} />
                      ingesting...
                    </>
                  ) : "ingest files →"}
                </button>
              </div>
            </div>
          )}

          {/* Upload result */}
          {uploadResult && (
            <div style={{
              padding: 14,
              background: "rgba(74,222,128,0.04)",
              border: "1px solid rgba(74,222,128,0.2)",
              borderRadius: 8,
            }}>
              <div style={{ fontSize: 13, color: "#4ade80", marginBottom: 6 }}>
                ✓ ingestion complete
              </div>
              <div style={{ fontSize: 11, color: "#484f58" }}>
                {uploadResult.chunksStored} chunks stored · repo_id: {repoName}
              </div>
              <Link href="/review" style={{
                display: "inline-block", marginTop: 12,
                fontSize: 12, padding: "6px 16px", borderRadius: 5,
                background: "#4ade80", color: "#010409",
                textDecoration: "none", fontWeight: 600,
              }}>
                review these files →
              </Link>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 16, padding: "10px 14px",
            background: "rgba(255,68,68,0.06)",
            border: "1px solid rgba(255,68,68,0.2)",
            borderRadius: 6, fontSize: 12, color: "#ff4444",
          }}>
            error: {error}
          </div>
        )}
      </main>
    </div>
  );
}