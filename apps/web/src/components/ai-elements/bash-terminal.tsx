"use client";

import { cn } from "~/lib/utils";

export type ParsedBashArgs = {
  command: string;
  description?: string;
};

export function parseBashArgs(args: string): ParsedBashArgs | null {
  try {
    const parsed = JSON.parse(args);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.command === "string"
    ) {
      return {
        command: parsed.command,
        description:
          typeof parsed.description === "string" ? parsed.description : undefined,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function isBashTool(name: string): boolean {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  return key === "bash" || key === "shell" || key === "exec" || key === "run";
}

type BashTerminalProps = {
  command: string;
  result?: string;
  description?: string;
  error?: boolean;
  className?: string;
};

export function BashTerminal({
  command,
  result,
  description,
  error,
  className,
}: BashTerminalProps) {
  return (
    <div className={cn("flex w-full max-w-full flex-col gap-1.5", className)}>
      <div className="overflow-hidden rounded-md border border-border bg-muted/40">
        <div className="flex items-baseline gap-2 border-b border-border px-3 py-2 font-mono text-label-2xs leading-5">
          <span aria-hidden className="select-none text-muted-foreground">
            $
          </span>
          <code className="flex-1 whitespace-pre-wrap break-all text-foreground">
            {command}
          </code>
        </div>
        {result && (
          <div
            className={cn(
              "max-h-64 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-[1.45] whitespace-pre-wrap break-all",
              error ? "text-error-base" : "text-muted-foreground",
            )}
          >
            {result}
          </div>
        )}
      </div>
      {description && (
        <span className="px-1 font-mono text-label-2xs text-muted-foreground/70">
          {description}
        </span>
      )}
    </div>
  );
}
