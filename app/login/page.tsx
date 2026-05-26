"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/review";

  return (
    <div style={{
      minHeight: "100vh", background: "#010409",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`* { box-sizing: border-box; }`}</style>

      {/* Background grid */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(74,222,128,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(74,222,128,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }} />

      <div style={{
        position: "relative", zIndex: 1,
        background: "#0d1117",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12, padding: "40px 36px",
        width: "100%", maxWidth: 380,
        textAlign: "center",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 28 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7L12 2z" stroke="#4ade80" strokeWidth="1.5" fill="none"/>
            <path d="M9 12l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: 18, fontWeight: 600, color: "#e6edf3" }}>aegis</span>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 600, color: "#e6edf3", marginBottom: 8 }}>
          Sign in to continue
        </h1>
        <p style={{ fontSize: 13, color: "#484f58", marginBottom: 28, lineHeight: 1.6 }}>
          Connect your GitHub account to start reviewing code for security vulnerabilities
        </p>

        <button
          onClick={() => signIn("github", { callbackUrl })}
          style={{
            width: "100%", padding: "12px 20px",
            background: "#e6edf3", color: "#010409",
            border: "none", borderRadius: 7,
            fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#010409">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>

        <p style={{ fontSize: 11, color: "#2d333b", marginTop: 20, lineHeight: 1.6 }}>
          By signing in you agree to allow Aegis to identify your GitHub account.
          We never access your repositories without explicit permission.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}