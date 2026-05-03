"use client";

import { Copy, ICON_SIZES, TriangleAlert } from "@/components/icons";
import { Response } from "~/components/ai-elements/response";
import { Thinking } from "~/components/ai-elements/thinking";
import {
  ToolCallTimeline,
  type ToolCallEvent,
} from "~/components/ai-elements/timeline";
import { Button } from "~/components/ui/button";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PermissionRequest, RunEvent, RunInfo } from "./types";

export function MessageBubble({
  role,
  text,
  run,
  opencodeEvents,
  permissionRequests,
  onPermissionAction,
  pendingPermissions,
}: {
  role: "user" | "assistant" | "system";
  text: string;
  run?: RunInfo;
  opencodeEvents?: RunEvent[];
  permissionRequests?: PermissionRequest[];
  onPermissionAction?: (
    permissionId: string,
    response: "once" | "always" | "reject",
  ) => void;
  pendingPermissions?: Record<string, "pending" | "approved" | "rejected">;
}) {
  const isUser = role === "user";
  const blocks = useAssistantBlocks(opencodeEvents ?? run?.events ?? []);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  // User bubble
  if (isUser) {
    const mentions = extractMentions(text);
    const cleanText = stripMentions(text);
    return (
      <div className="flex min-w-0 justify-end">
        <div className="flex max-w-[80%] flex-col items-end gap-1.5">
          {mentions.length > 0 && (
            <div className="flex flex-wrap justify-end gap-1">
              {mentions.map((m) => (
                <span
                  key={m}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-label-2xs text-muted-foreground"
                >
                  <span className="opacity-50">@</span>
                  {m}
                </span>
              ))}
            </div>
          )}
          <div className="whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-paragraph-sm text-foreground">
            {cleanText}
          </div>
        </div>
      </div>
    );
  }

  const hasContent = text.length > 0 || blocks.length > 0;
  const isStreaming = run?.status === "running" || (opencodeEvents?.length ?? 0) > 0;
  const hasError = run?.status === "error";

  return (
    <div className="group/msg flex w-full min-w-0 flex-col gap-2">
      {/* queued */}
      {!hasContent && run?.status === "queued" && !opencodeEvents && (
        <ShimmerLoader label="Waiting for daemon..." />
      )}

      {/* loading — no content yet */}
      {!hasContent && isStreaming && <ShimmerLoader />}

      {/* blocks in original order: thinking → tool batches → text → ... */}
      {(() => {
        const nodes: React.ReactNode[] = [];
        let toolBatch: ToolCallEvent[] = [];
        const flushTools = (key: string) => {
          if (toolBatch.length === 0) return;
          nodes.push(
            <ToolCallTimeline key={`tl-${key}`} calls={toolBatch} />,
          );
          toolBatch = [];
        };
        blocks.forEach((block, i) => {
          if (block.kind === "tool") {
            const tb = block as Extract<AssistantBlock, { kind: "tool" }>;
            toolBatch.push({
              id: `tc-${i}`,
              name: tb.name,
              args: tb.args,
              result: tb.result,
              state: tb.state,
              startedAt: tb.ts,
            });
            return;
          }
          flushTools(String(i));
          const isLast = i === blocks.length - 1;
          if (block.kind === "thinking") {
            nodes.push(
              <Thinking
                key={`th-${i}`}
                text={block.text}
                streaming={isStreaming && isLast}
              />,
            );
          } else if (block.kind === "text") {
            nodes.push(
              <div key={`tx-${i}`} className="relative">
                <Response>{block.text}</Response>
                {isStreaming && isLast && (
                  <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-muted-foreground/70 align-middle" />
                )}
              </div>,
            );
          }
        });
        flushTools("end");
        return nodes;
      })()}

      {/* copy button — shown after streaming ends */}
      {!isStreaming && text && (
        <div className="mt-1.5 opacity-0 transition-opacity group-hover/msg:opacity-100">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 bg-transparent p-0 text-label-2xs text-muted-foreground/70 transition-colors hover:text-muted-foreground"
          >
            <Copy size={ICON_SIZES.sm} />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      {/* no output */}
      {!hasContent && run?.status === "done" && !hasError && (
        <span className="text-paragraph-sm text-muted-foreground/70">
          run finished with no output
        </span>
      )}

      {/* error card */}
      {hasError && (
        <div className="flex items-start gap-3 rounded-lg border border-error-base/20 bg-error-base/5 py-3 pl-3 pr-4 [border-left:2px_solid_var(--color-error-base)]">
          <TriangleAlert size={ICON_SIZES.md} className="mt-0.5 shrink-0 text-error-base" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-label-xs font-medium text-error-base">
              hit an error
            </span>
            <span className="text-label-xs text-muted-foreground">
              {run?.error ?? "unknown error"}
            </span>
          </div>
        </div>
      )}

      {/* permission requests */}
      {permissionRequests && permissionRequests.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
          {permissionRequests.map((p) => (
            <div key={p.permissionId} className="flex flex-col gap-2">
              <div className="text-label-sm font-medium text-foreground">
                {p.title}
              </div>
              {p.description && (
                <div className="text-label-xs text-muted-foreground">
                  {p.description}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="xs"
                  onClick={() => onPermissionAction?.(p.permissionId, "once")}
                >
                  Approve once
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => onPermissionAction?.(p.permissionId, "always")}
                >
                  Always approve
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => onPermissionAction?.(p.permissionId, "reject")}
                >
                  Reject
                </Button>
                {pendingPermissions?.[p.permissionId] && (
                  <span className="text-label-2xs text-muted-foreground">
                    {pendingPermissions[p.permissionId] === "approved"
                      ? "Approved"
                      : "Rejected"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function extractMentions(text: string): string[] {
  const matches = text.matchAll(/@skill:([\w.-]+)/g);
  return Array.from(new Set(Array.from(matches).map((m) => m[1] ?? "").filter(Boolean)));
}

function stripMentions(text: string): string {
  return text.replace(/@skill:[\w.-]+\s*/g, "").trim();
}

const SHIMMER_PHRASES = ["Thinking...", "Working on it...", "One moment..."];

function ShimmerLoader({ label }: { label?: string }) {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (label) return;
    const id = setInterval(
      () => setPhraseIdx((i) => (i + 1) % SHIMMER_PHRASES.length),
      2000,
    );
    return () => clearInterval(id);
  }, [label]);

  return (
    <div className="flex items-center gap-2">
      {/* pixel pulse grid */}
      <div className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className="block size-1 rounded-sm bg-muted-foreground/70"
            style={{
              animation: `pulse 1.4s ease-in-out infinite`,
              animationDelay: `${(i * 140) % 700}ms`,
            }}
          />
        ))}
      </div>
      <span className="animate-pulse text-paragraph-xs italic text-muted-foreground/70">
        {label ?? SHIMMER_PHRASES[phraseIdx]}
      </span>
    </div>
  );
}

type AssistantBlock =
  | { kind: "thinking"; text: string }
  | { kind: "text"; text: string }
  | {
      kind: "tool";
      name: string;
      args?: string;
      result?: string;
      state: "running" | "done" | "error";
      ts: number;
    };

function useAssistantBlocks(events: RunEvent[]): AssistantBlock[] {
  return useMemo(() => {
    const blocks: AssistantBlock[] = [];
    let pendingThinking: string[] = [];
    let pendingText: string[] = [];

    const flushThinking = () => {
      if (pendingThinking.length === 0) return;
      blocks.push({ kind: "thinking", text: pendingThinking.join("") });
      pendingThinking = [];
    };
    const flushText = () => {
      if (pendingText.length === 0) return;
      blocks.push({ kind: "text", text: pendingText.join("") });
      pendingText = [];
    };

    for (let i = 0; i < events.length; i++) {
      const e = events[i]!;
      if (e.type === "thinking") {
        flushText();
        pendingThinking.push(e.text ?? "");
        continue;
      }
      if (e.type === "text-delta") {
        flushThinking();
        pendingText.push(e.text ?? "");
        continue;
      }
      if (e.type === "tool-call") {
        flushThinking();
        flushText();
        const { name, args } = parseToolCall(e.text ?? "");
        // Look ahead for the matching tool-result
        let result: string | undefined;
        const next = events[i + 1];
        if (next && next.type === "tool-result") {
          result = next.text;
          i++;
        }
        blocks.push({
          kind: "tool",
          name,
          args,
          result,
          state: result ? "done" : "running",
          ts: e.ts,
        });
      }
    }
    flushThinking();
    flushText();
    return blocks;
  }, [events]);
}

function parseToolCall(text: string): { name: string; args?: string } {
  const m = text.match(/^([^(]+)\((.*)\)$/s);
  if (!m) return { name: text };
  return { name: m[1]!.trim(), args: m[2] };
}
