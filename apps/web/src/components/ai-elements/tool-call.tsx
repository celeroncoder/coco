"use client";

import { ICON_SIZES, Wrench } from "@/components/icons";
import { useState } from "react";
import { cn } from "~/lib/utils";
import { BashTerminal, isBashTool, parseBashArgs } from "./bash-terminal";
import {
  CodeView,
  isGrepTool,
  isGlobTool,
  isReadTool,
  isWriteTool,
  parseGlobResult,
  parseGrepResult,
  parseReadArgs,
  parseWriteArgs,
  stripReadLineNumbers,
} from "./code-view";
import { EditDiff, parseEditArgs } from "./edit-diff";
import { GlobTreeView } from "./glob-tree-view";
import { GrepCodeView } from "./grep-code-view";

export type ToolCallProps = {
  name: string;
  args?: string;
  result?: string;
  state?: "running" | "done" | "error";
  className?: string;
};

export function ToolCall({
  name,
  args,
  result,
  state = "done",
  className,
}: ToolCallProps) {
  const [open, setOpen] = useState(false);
  const hasBody = Boolean(args || result);

  return (
    <div className={cn("flex flex-col gap-1 text-label-xs", className)}>
      <button
        type="button"
        onClick={() => hasBody && setOpen((v) => !v)}
        disabled={!hasBody}
        className={cn(
          "group flex w-fit items-center gap-1.5 bg-transparent p-0 text-left text-muted-foreground transition-colors",
          hasBody && "cursor-pointer hover:text-foreground",
        )}
      >
        <Wrench
          size={ICON_SIZES.xs}
          strokeWidth={1.5}
          className="shrink-0 text-muted-foreground/70"
        />
        <span className="truncate font-mono text-label-2xs">{name}</span>
        {state === "running" && (
          <span className="ml-1 inline-flex items-center gap-1 text-label-2xs text-muted-foreground/70">
            <span className="size-1 animate-pulse rounded-full bg-muted-foreground/70" />
            running
          </span>
        )}
        {state === "error" && (
          <span className="ml-1 text-label-2xs text-error-base">error</span>
        )}
      </button>
      {open && hasBody && (
        <div className="ml-3 space-y-1 border-l border-border pl-2 py-0.5">
          {args && isBashTool(name) && (() => {
            const bash = parseBashArgs(args);
            if (!bash) return null;
            return (
              <BashTerminal
                command={bash.command}
                description={bash.description}
                result={result}
                error={state === "error"}
              />
            );
          })()}
          {args && !isBashTool(name) && (() => {
            if (isWriteTool(name)) {
              const w = parseWriteArgs(args);
              if (w && w.kind === "write") {
                return (
                  <CodeView
                    filePath={w.filePath}
                    code={w.content}
                    isIncomplete={w.isIncomplete || state === "running"}
                  />
                );
              }
            }
            if (isReadTool(name)) {
              const r = parseReadArgs(args);
              if (r && r.kind === "read" && result) {
                return (
                  <CodeView
                    filePath={r.filePath}
                    code={stripReadLineNumbers(result)}
                    isIncomplete={state === "running"}
                  />
                );
              }
            }
            if (isGlobTool(name) && result) {
              const paths = parseGlobResult(result);
              if (paths.length > 0) return <GlobTreeView paths={paths} />;
            }
            if (isGrepTool(name) && result) {
              const parsed = parseGrepResult(result);
              if (parsed)
                return (
                  <GrepCodeView
                    code={parsed.code}
                    matchCount={parsed.matchCount}
                  />
                );
            }
            const parsed = parseEditArgs(args);
            if (parsed) {
              if ("truncated" in parsed) {
                return (
                  <div className="font-mono text-label-2xs text-muted-foreground/70">
                    args truncated — diff unavailable
                  </div>
                );
              }
              if (state === "error") {
                return (
                  <div className="rounded border border-error-base/30 bg-error-base/5 px-2 py-1.5 font-mono text-label-2xs text-error-base">
                    {result ?? "tool call failed"}
                  </div>
                );
              }
              return <EditDiff {...parsed} />;
            }
            return (
              <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-label-2xs text-muted-foreground">
                {args}
              </pre>
            );
          })()}
          {result &&
            !isBashTool(name) &&
            !isWriteTool(name) &&
            !isReadTool(name) &&
            !isGlobTool(name) &&
            !isGrepTool(name) &&
            !parseEditArgs(args ?? "") && (
              <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-label-2xs text-muted-foreground/70">
                {result}
              </pre>
            )}
        </div>
      )}
    </div>
  );
}
