import { supabase } from "./supabase";
import { extractImportNames, extractSignatures } from "./ast-parser";
import { parsePython } from "./ast-parser";

export interface ResolvedDependency {
  moduleName: string;
  filePath: string;
  signatures: string[];
  isSecurityRelevant: boolean;
}

// Modules that are security-relevant and should always be flagged
const SECURITY_RELEVANT_MODULES = [
  "auth", "login", "user", "account", "password", "token",
  "session", "permission", "role", "access", "credential",
  "crypto", "hash", "encrypt", "decrypt", "sign", "verify",
  "db", "database", "query", "model", "schema", "migration",
  "config", "settings", "env", "secret", "key",
  "request", "response", "route", "middleware", "handler",
  "upload", "file", "storage", "s3", "blob",
];

function isSecurityRelevant(moduleName: string): boolean {
  const lower = moduleName.toLowerCase();
  return SECURITY_RELEVANT_MODULES.some(m => lower.includes(m));
}

// Look up a module in the vector store by file path
async function findModuleInStore(
  moduleName: string,
  repoId: string
): Promise<{ filePath: string; content: string } | null> {
  // Try common file patterns: user_model.py, user/model.py, models/user.py
  const patterns = [
    `${moduleName}.py`,
    `${moduleName.replace(".", "/")}.py`,
    `${moduleName.replace("_", "/")}.py`,
  ];

  for (const pattern of patterns) {
    const { data, error } = await supabase
      .from("code_chunks")
      .select("file_path, content")
      .eq("repo_id", repoId)
      .ilike("file_path", `%${pattern}`)
      .order("start_line", { ascending: true })
      .limit(10);

    if (error || !data || data.length === 0) continue;

    // Reconstruct file content from chunks
    const content = data.map((d: any) => d.content).join("\n");
    return { filePath: data[0].file_path, content };
  }

  return null;
}

// Main resolver — takes code, finds its imports, resolves them from vector store
export async function resolveDependencies(
  code: string,
  repoId: string
): Promise<ResolvedDependency[]> {
  const importNames = extractImportNames(code);
  if (importNames.length === 0) return [];

  const resolved: ResolvedDependency[] = [];

  for (const moduleName of importNames) {
    // Skip stdlib and third-party packages — focus on project files
    if (isStdlibOrThirdParty(moduleName)) continue;

    const found = await findModuleInStore(moduleName, repoId);
    if (!found) continue;

    // Extract just signatures — not full source
    let signatures: string[] = [];
    try {
      signatures = extractSignatures(found.content);
    } catch {
      signatures = [`# ${moduleName} — signatures unavailable`];
    }

    resolved.push({
      moduleName,
      filePath: found.filePath,
      signatures,
      isSecurityRelevant: isSecurityRelevant(moduleName),
    });
  }

  return resolved;
}

// Build context string from resolved dependencies
export function buildDependencyContext(deps: ResolvedDependency[]): string {
  if (deps.length === 0) return "";

  const lines: string[] = ["=== Dependency Context (Cross-File Analysis) ===\n"];

  deps.forEach(dep => {
    const tag = dep.isSecurityRelevant ? "⚠️  security-relevant" : "module";
    lines.push(`[${tag}] ${dep.filePath}:`);
    lines.push("```python");
    dep.signatures.forEach(sig => lines.push(sig));
    lines.push("```\n");
  });

  lines.push("=== End of Dependency Context ===");
  return lines.join("\n");
}

// Heuristic to skip stdlib and common third-party packages
function isStdlibOrThirdParty(name: string): boolean {
  const SKIP = [
    "os", "sys", "re", "json", "time", "datetime", "math", "random",
    "pathlib", "typing", "collections", "itertools", "functools",
    "subprocess", "threading", "asyncio", "logging", "unittest",
    "pickle", "io", "copy", "hashlib", "hmac", "base64", "urllib",
    "http", "socket", "ssl", "email", "html", "xml", "csv", "sqlite3",
    "flask", "django", "fastapi", "sqlalchemy", "requests", "numpy",
    "pandas", "torch", "tensorflow", "sklearn", "scipy", "celery",
    "redis", "pymongo", "psycopg2", "boto3", "pydantic", "aiohttp",
    "pytest", "click", "dotenv", "jwt", "bcrypt", "cryptography",
  ];
  return SKIP.includes(name.toLowerCase());
}