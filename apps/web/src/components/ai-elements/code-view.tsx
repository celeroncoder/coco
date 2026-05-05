"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { codeToHtml } from "shiki/bundle/web";
import { cn } from "~/lib/utils";

type CodeViewProps = {
  filePath: string;
  code: string;
  isIncomplete?: boolean;
  className?: string;
};

export type ParsedCodeArgs =
  | { kind: "write"; filePath: string; content: string; isIncomplete: boolean }
  | { kind: "read"; filePath: string }
  | null;

const READ_NAMES = new Set([
  "read",
  "view",
  "cat",
  "open",
  "fileread",
  "readfile",
  "viewfile",
  "openfile",
]);

const WRITE_NAMES = new Set([
  "write",
  "create",
  "createfile",
  "writefile",
  "newfile",
]);

function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

export function isReadTool(name: string): boolean {
  return READ_NAMES.has(normalize(name));
}

export function isWriteTool(name: string): boolean {
  return WRITE_NAMES.has(normalize(name));
}

const EXT_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "jsonc",
  md: "markdown",
  mdx: "mdx",
  css: "css",
  scss: "scss",
  html: "html",
  py: "python",
  rb: "ruby",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  h: "c",
  cpp: "cpp",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  swift: "swift",
  kt: "kotlin",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  sql: "sql",
  graphql: "graphql",
  gql: "graphql",
  vue: "vue",
  svelte: "svelte",
  prisma: "prisma",
  dockerfile: "docker",
  xml: "xml",
};

export function truncatePath(path: string, maxLen = 48): string {
  if (path.length <= maxLen) return path;
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return path;
  let out = parts[parts.length - 1]!;
  for (let i = parts.length - 2; i >= 0; i--) {
    const next = `${parts[i]}/${out}`;
    if (next.length + 2 > maxLen) break;
    out = next;
  }
  return `…/${out}`;
}

export function languageFromPath(path: string): string {
  const lower = path.toLowerCase();
  if (lower.endsWith("dockerfile") || lower.endsWith("/dockerfile"))
    return "docker";
  const m = lower.match(/\.([a-z0-9]+)$/);
  if (!m) return "text";
  return EXT_LANG[m[1]!] ?? "text";
}

// Strip the `cat -n` style line-number prefix that the Read tool prepends
// (e.g. "   123\tactual line"). If not present, returns input unchanged.
function stripReadLineNumbers(code: string): string {
  const lines = code.split("\n");
  let stripped = 0;
  const out = lines.map((line) => {
    const m = line.match(/^\s*\d+\t(.*)$/);
    if (m) {
      stripped++;
      return m[1]!;
    }
    return line;
  });
  // Only strip if the majority of non-empty lines matched, otherwise leave alone
  const nonEmpty = lines.filter((l) => l.trim().length > 0).length;
  if (nonEmpty > 0 && stripped / nonEmpty > 0.6) return out.join("\n");
  return code;
}

export function CodeView({
  filePath,
  code,
  isIncomplete,
  className,
}: CodeViewProps) {
  const language = languageFromPath(filePath);
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "github-dark" : "github-light";
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    codeToHtml(code, {
      lang: language,
      theme,
    })
      .then((res) => {
        if (!cancelled) setHtml(res);
      })
      .catch(() => {
        if (!cancelled) setHtml(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code, language, theme]);

  const baseClass = cn(
    "max-h-80 overflow-auto font-mono text-[11px] leading-[1.5]",
    "[&_pre]:!bg-transparent [&_pre]:!m-0 [&_pre]:!p-0 [&_pre]:whitespace-pre",
    "[&_code]:!bg-transparent",
    isIncomplete && "opacity-80",
  );

  return (
    <div className={cn("mt-1 flex flex-col gap-1", className)}>
      <div
        className="font-mono text-label-2xs text-muted-foreground/70 truncate"
        title={filePath}
      >
        {truncatePath(filePath)}
      </div>
      {html ? (
        <div className={baseClass} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className={cn(baseClass, "whitespace-pre text-muted-foreground")}>
          {code}
        </pre>
      )}
    </div>
  );
}

function tryParseJSON(s: string): unknown | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function extractStreamingString(args: string, key: string): string | null {
  const keyMatch = new RegExp(`"${key}"\\s*:\\s*"`).exec(args);
  if (!keyMatch) return null;
  const start = keyMatch.index + keyMatch[0].length;
  let i = start;
  while (i < args.length) {
    const c = args[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === '"') break;
    i++;
  }
  const raw = args.slice(start, i);
  // Try to parse as a complete JSON string first (handles \n, \t, \", etc.)
  const parsed = tryParseJSON(`"${raw}"`);
  if (typeof parsed === "string") return parsed;
  // Fall back: manually decode the common escapes so streaming content still
  // displays with real newlines instead of literal \n sequences.
  return raw
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
}

function extractFilePath(args: string): string {
  const m = args.match(/"file_path"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
  if (!m) return "file";
  const parsed = tryParseJSON(`"${m[1]}"`);
  return typeof parsed === "string" ? parsed : m[1] ?? "file";
}

export function parseWriteArgs(args: string): ParsedCodeArgs {
  const parsed = tryParseJSON(args);
  if (
    parsed &&
    typeof parsed === "object" &&
    typeof (parsed as Record<string, unknown>).file_path === "string" &&
    typeof (parsed as Record<string, unknown>).content === "string"
  ) {
    const o = parsed as { file_path: string; content: string };
    return {
      kind: "write",
      filePath: o.file_path,
      content: o.content,
      isIncomplete: false,
    };
  }
  if (args.includes('"content"')) {
    const filePath = extractFilePath(args);
    const content = extractStreamingString(args, "content") ?? "";
    return {
      kind: "write",
      filePath,
      content,
      isIncomplete: true,
    };
  }
  return null;
}

export function parseReadArgs(args: string): ParsedCodeArgs {
  const parsed = tryParseJSON(args);
  if (
    parsed &&
    typeof parsed === "object" &&
    typeof (parsed as Record<string, unknown>).file_path === "string"
  ) {
    return {
      kind: "read",
      filePath: (parsed as { file_path: string }).file_path,
    };
  }
  if (args.includes('"file_path"')) {
    return { kind: "read", filePath: extractFilePath(args) };
  }
  return null;
}

export { stripReadLineNumbers };
