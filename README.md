# Aegis — AI-Powered Security Code Reviewer

> Automated security analysis for every pull request. Powered by Claude, AST parsing, and RAG.

**Live demo:** https://aegis-ai-reviewer.vercel.app

---

## What it does

Aegis reviews code for security vulnerabilities across the OWASP Top 10. It analyses pull requests automatically via GitHub webhooks and posts structured findings as PR comments — with severity levels, line numbers, OWASP classifications, and fix recommendations.

Unlike simple LLM wrappers, Aegis uses a four-layer pipeline to produce findings that are precise, context-aware, and improve over time.

---

## Architecture

```
                        ┌─────────────────────────────────────────┐
                        │           Aegis Pipeline                │
                        │                                         │
  Code Input            │  ┌─────────┐    ┌──────────────────┐   │
  (PR or manual) ──────►│  │   AST   │───►│  Dependency      │   │
                        │  │ Parser  │    │  Resolver        │   │
                        │  └─────────┘    └────────┬─────────┘   │
                        │       │                  │             │
                        │       ▼                  ▼             │
                        │  ┌─────────┐    ┌──────────────────┐   │
                        │  │   RAG   │    │  Feedback        │   │
                        │  │Retrieval│    │  Injection       │   │
                        │  └─────────┘    └────────┬─────────┘   │
                        │       │                  │             │
                        │       └──────────┬───────┘             │
                        │                  ▼                     │
                        │          ┌──────────────┐              │
                        │          │    Claude     │              │
                        │          │  (Sonnet 4)  │              │
                        │          └──────┬───────┘              │
                        │                 │                      │
                        └─────────────────┼──────────────────────┘
                                          │
                                          ▼
                               Structured Findings
                               (OWASP · Severity · Line · Fix)
```

### Layer 1 — AST Parsing
Extracts code structure before sending to the LLM — function names, parameters, import statements, dangerous calls (`eval`, `exec`, `os.system`, `pickle`). Claude receives structured metadata alongside raw code, making findings more precise.

### Layer 2 — Cross-File Dependency Resolution
When reviewing `auth_service.py`, the system automatically detects `import user_model` and pulls `user_model.py`'s function signatures from the vector store. Claude reasons across file boundaries — finding vulnerabilities in dependencies of the file being reviewed.

### Layer 3 — RAG Pipeline
Every ingested file is chunked, embedded with `voyage-code-3` (Voyage AI's code-specific model), and stored in Supabase with pgvector. At review time, the top-5 semantically similar chunks are retrieved and injected as context — giving Claude awareness of patterns across the entire codebase.

### Layer 4 — Feedback Loop
Developers accept or dispute each finding. Disputes are stored with their reasons and embeddings. Future reviews on similar code retrieve past disputes and inject them into the prompt — Claude adjusts confidence and tone based on historical developer feedback. This is a lightweight implementation of preference learning.

---

## Features

- **Automatic PR reviews** — GitHub webhook fires on every pull request, findings posted as formatted comments
- **OWASP Top 10 classification** — every finding mapped to the relevant category
- **Cross-file analysis** — resolves imports and pulls dependency signatures automatically
- **Feedback loop** — accept or dispute findings, disputes improve future reviews
- **Structured observability** — RAG hit rate, review duration, severity breakdown logged per request
- **Rate limiting** — sliding window middleware, 20 req/min per IP with proper headers
- **Concurrency handling** — batch limiting for large PRs, instant "in progress" comment on webhook receipt
- **Dark terminal UI** — JetBrains Mono, severity-coded findings, collapsible cards

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, TypeScript, JetBrains Mono |
| LLM | Anthropic Claude (claude-sonnet-4) |
| Embeddings | Voyage AI (voyage-code-3, 1024 dimensions) |
| Vector Store | Supabase with pgvector |
| AST Parsing | @lezer/python |
| GitHub Integration | Webhooks + REST API |
| Deployment | Vercel |
| Rate Limiting | Next.js middleware, in-memory sliding window |

---

## Getting Started

### Prerequisites
- Node.js 18+
- Anthropic API key
- Voyage AI API key
- Supabase project with pgvector enabled
- GitHub account

### Installation

```bash
git clone https://github.com/iamyash67/aegis.git
cd aegis
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
ANTHROPIC_API_KEY=your_anthropic_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
VOYAGE_API_KEY=your_voyage_key
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_TOKEN=your_github_token
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Database Setup

Run these in your Supabase SQL editor:

```sql
create extension if not exists vector;

create table code_chunks (
  id bigserial primary key,
  repo_id text not null,
  file_path text not null,
  start_line integer,
  end_line integer,
  content text not null,
  embedding vector(1024),
  created_at timestamp with time zone default now()
);

create table feedback (
  id bigserial primary key,
  finding_id text not null,
  code_snippet text not null,
  finding_title text not null,
  finding_severity text not null,
  owasp_category text not null,
  verdict text not null check (verdict in ('accepted', 'disputed')),
  dispute_reason text,
  embedding vector(1024),
  created_at timestamp with time zone default now()
);
```

### Run Locally

```bash
npm run dev
```

Visit `http://localhost:3000`

### GitHub Webhook Setup

1. Go to your repo Settings → Webhooks → Add webhook
2. Set Payload URL to `https://your-domain.vercel.app/api/webhook/github`
3. Content type: `application/json`
4. Select **Pull requests** events only

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/review` | POST | Review code with AST + RAG + feedback context |
| `/api/ingest` | POST | Ingest files into vector store |
| `/api/feedback` | POST | Store accept/dispute feedback |
| `/api/webhook/github` | POST | GitHub PR webhook handler |

---

## Research Angle

Aegis is designed as an ablation study platform. Each pipeline layer can be toggled independently, enabling measurement of:

- Claude only (no AST, no RAG, no feedback) vs full pipeline
- False positive rate change over time with feedback injection
- RAG hit rate and similarity score distribution across codebases
- Cross-file dependency resolution impact on finding precision

Evaluated against the Juliet Test Suite and DVWA for ground-truth vulnerability detection.

---

## Roadmap

- [ ] GitHub OAuth authentication
- [ ] Multi-language AST support (JavaScript, TypeScript)
- [ ] Security heatmap — visual risk map across project files
- [ ] "Why was this flagged?" — surface similar past disputes inline
- [ ] Auto fix-it PRs — Claude generates corrected code as a new PR
- [ ] Fine-tuning dataset export from feedback store

---

## Author

**Yashwanth Reddy** — MSc Data Science, University of Glasgow  
[GitHub](https://github.com/iamyash67) · [LinkedIn](https://www.linkedin.com/in/yashwanth-reddy-c-519069260/)

---

*Aegis — always watching, never sleeping.*
