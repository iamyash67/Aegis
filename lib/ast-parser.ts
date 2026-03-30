import { parser } from "@lezer/python";

export interface FunctionInfo {
  name: string;
  startLine: number;
  endLine: number;
  parameters: string[];
}

export interface ASTMetadata {
  functions: FunctionInfo[];
  imports: string[];
  dangerousCalls: string[];
  dangerousImports: string[];
  classes: string[];
  globalCalls: string[];
}

const DANGEROUS_CALLS = ["eval", "exec", "compile", "__import__", "getattr", "setattr"];
const DANGEROUS_IMPORTS = ["pickle", "subprocess", "os", "sys", "ctypes", "importlib"];

function getLineNumber(input: string, pos: number): number {
  return input.slice(0, pos).split("\n").length;
}

function extractName(input: string, node: any): string {
  return input.slice(node.from, node.to);
}

export function parsePython(code: string): ASTMetadata {
  const tree = parser.parse(code);
  const cursor = tree.cursor();

  const functions: FunctionInfo[] = [];
  const imports: string[] = [];
  const dangerousCalls: string[] = [];
  const dangerousImports: string[] = [];
  const classes: string[] = [];
  const globalCalls: string[] = [];

  do {
    const { type, from, to } = cursor;
    const nodeName = type.name;

    // Function definitions
    if (nodeName === "FunctionDefinition") {
      const inner = cursor.node.cursor();
      let funcName = "";
      const params: string[] = [];
      const startLine = getLineNumber(code, from);
      const endLine = getLineNumber(code, to);

      inner.firstChild();
      do {
        if (inner.type.name === "def") continue;
        if (inner.type.name === "VariableName" && !funcName) {
          funcName = extractName(code, inner);
        }
        if (inner.type.name === "ParamList") {
          const paramCursor = inner.node.cursor();
          paramCursor.firstChild();
          do {
            if (
              paramCursor.type.name === "VariableName" ||
              paramCursor.type.name === "AssignStatement"
            ) {
              const paramName = extractName(code, paramCursor).split("=")[0].trim();
              if (paramName && paramName !== "self") params.push(paramName);
            }
          } while (paramCursor.nextSibling());
        }
      } while (inner.nextSibling());

      if (funcName) {
        functions.push({ name: funcName, startLine, endLine, parameters: params });
      }
    }

    // Import statements
    if (nodeName === "ImportStatement" || nodeName === "ImportFrom") {
      const importText = code.slice(from, to).trim();
      imports.push(importText);
      DANGEROUS_IMPORTS.forEach((d) => {
        if (importText.includes(d) && !dangerousImports.includes(d)) {
          dangerousImports.push(d);
        }
      });
    }

    // Class definitions
    if (nodeName === "ClassDefinition") {
      const inner = cursor.node.cursor();
      inner.firstChild();
      do {
        if (inner.type.name === "VariableName") {
          classes.push(extractName(code, inner));
          break;
        }
      } while (inner.nextSibling());
    }

    // Call expressions — catch dangerous ones
    if (nodeName === "CallExpression") {
      const callText = code.slice(from, to);
      const funcPart = callText.split("(")[0].trim();
      DANGEROUS_CALLS.forEach((d) => {
        if (funcPart === d || funcPart.endsWith(`.${d}`)) {
          if (!dangerousCalls.includes(d)) dangerousCalls.push(d);
        }
      });
      // Track all top-level calls for context
      if (funcPart && !funcPart.includes("\n")) {
        globalCalls.push(`${funcPart}() at line ${getLineNumber(code, from)}`);
      }
    }
  } while (cursor.next());

  // Deduplicate global calls — keep first 20 most relevant
  const uniqueCalls = [...new Set(globalCalls)].slice(0, 20);

  return {
    functions,
    imports,
    dangerousCalls,
    dangerousImports,
    classes,
    globalCalls: uniqueCalls,
  };
}

export function buildASTContext(metadata: ASTMetadata): string {
  const lines: string[] = ["=== Code Structure (AST Analysis) ===\n"];

  if (metadata.functions.length > 0) {
    lines.push("Functions detected:");
    metadata.functions.forEach((f) => {
      const params = f.parameters.length > 0 ? f.parameters.join(", ") : "none";
      lines.push(`  - ${f.name}() at lines ${f.startLine}–${f.endLine}, parameters: [${params}]`);
    });
    lines.push("");
  }

  if (metadata.classes.length > 0) {
    lines.push(`Classes detected: ${metadata.classes.join(", ")}\n`);
  }

  if (metadata.imports.length > 0) {
    lines.push("Imports:");
    metadata.imports.forEach((i) => lines.push(`  - ${i}`));
    lines.push("");
  }

  if (metadata.dangerousImports.length > 0) {
    lines.push(`⚠️  Dangerous imports detected: ${metadata.dangerousImports.join(", ")}\n`);
  }

  if (metadata.dangerousCalls.length > 0) {
    lines.push(`⚠️  Dangerous calls detected: ${metadata.dangerousCalls.join(", ")}\n`);
  }

  if (metadata.globalCalls.length > 0) {
    lines.push("Notable calls:");
    metadata.globalCalls.slice(0, 10).forEach((c) => lines.push(`  - ${c}`));
    lines.push("");
  }

  lines.push("=== End of AST Analysis ===");
  return lines.join("\n");
}
// Extract just the signatures from a file — used for dependency injection
export function extractSignatures(code: string): string[] {
  const tree = parser.parse(code);
  const cursor = tree.cursor();
  const signatures: string[] = [];

  do {
    if (cursor.type.name === "FunctionDefinition") {
      const inner = cursor.node.cursor();
      let funcName = "";
      let params: string[] = [];

      inner.firstChild();
      do {
        if (inner.type.name === "VariableName" && !funcName) {
          funcName = code.slice(inner.from, inner.to);
        }
        if (inner.type.name === "ParamList") {
          const paramCursor = inner.node.cursor();
          paramCursor.firstChild();
          do {
            if (
              paramCursor.type.name === "VariableName" ||
              paramCursor.type.name === "AssignStatement"
            ) {
              const p = code.slice(paramCursor.from, paramCursor.to).split("=")[0].trim();
              if (p && p !== "self") params.push(p);
            }
          } while (paramCursor.nextSibling());
        }
      } while (inner.nextSibling());

      if (funcName) {
        signatures.push(`def ${funcName}(${params.join(", ")}): ...`);
      }
    }

    if (cursor.type.name === "ClassDefinition") {
      const inner = cursor.node.cursor();
      inner.firstChild();
      do {
        if (inner.type.name === "VariableName") {
          signatures.push(`class ${code.slice(inner.from, inner.to)}: ...`);
          break;
        }
      } while (inner.nextSibling());
    }
  } while (cursor.next());

  return signatures;
}

// Extract import names from Python code
export function extractImportNames(code: string): string[] {
  const tree = parser.parse(code);
  const cursor = tree.cursor();
  const imports: string[] = [];

  do {
    const { type, from, to } = cursor;

    if (type.name === "ImportStatement") {
      const text = code.slice(from, to);
      // "import os, sys" → ["os", "sys"]
      const match = text.match(/^import\s+(.+)$/);
      if (match) {
        match[1].split(",").forEach(m => {
          imports.push(m.trim().split(" as ")[0].trim());
        });
      }
    }

    if (type.name === "ImportFrom") {
      const text = code.slice(from, to);
      // "from user_model import User" → ["user_model"]
      const match = text.match(/^from\s+(\S+)\s+import/);
      if (match) {
        imports.push(match[1].replace(/^\.+/, ""));
      }
    }
  } while (cursor.next());

  return [...new Set(imports)];
}