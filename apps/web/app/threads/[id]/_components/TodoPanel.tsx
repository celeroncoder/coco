"use client";

import { useState } from "react";
import type { RunEvent } from "./types";

export type TodoItem = {
  id: string;
  content: string;
  status: "pending" | "in_progress" | "completed";
  priority?: "high" | "medium" | "low";
};

export function parseTodosFromEvents(events: RunEvent[]): TodoItem[] {
  let latest: TodoItem[] = [];
  for (const e of events) {
    if (e.type !== "tool-call") continue;
    const text = e.text ?? "";
    const m = text.match(/^TodoWrite\(([\s\S]*)\)$/);
    if (!m) continue;
    try {
      const parsed = JSON.parse(m[1]!) as unknown;
      if (Array.isArray(parsed)) latest = parsed as TodoItem[];
    } catch {
      // ignore
    }
  }
  return latest;
}

export function TodoPanel({ todos }: { todos: TodoItem[] }) {
  const [collapsed, setCollapsed] = useState(false);

  if (todos.length === 0) return null;

  const done = todos.filter((t) => t.status === "completed").length;
  const inProgress = todos.filter((t) => t.status === "in_progress").length;
  const pending = todos.filter((t) => t.status === "pending").length;

  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-border bg-background/95 shadow-sm backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2">
          <span className="text-label-xs font-medium text-foreground">Tasks</span>
          <div className="flex items-center gap-2">
            {done > 0 && (
              <span className="text-label-2xs text-emerald-500 dark:text-emerald-400">
                {done} done
              </span>
            )}
            {inProgress > 0 && (
              <span className="text-label-2xs text-primary">
                {inProgress} working
              </span>
            )}
            {pending > 0 && (
              <span className="text-label-2xs text-muted-foreground">
                {pending} pending
              </span>
            )}
          </div>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={[
            "shrink-0 text-muted-foreground/60 transition-transform duration-150",
            collapsed ? "" : "rotate-180",
          ].join(" ")}
        >
          <path
            d="M2.5 4.5L6 8l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-1 border-t border-border px-3 py-2">
          {todos.map((todo) => (
            <div key={todo.id} className="flex items-start gap-2">
              <StatusIcon status={todo.status} />
              <span
                className={[
                  "flex-1 text-paragraph-xs leading-relaxed",
                  todo.status === "completed"
                    ? "text-muted-foreground/50 line-through"
                    : "text-foreground/80",
                ].join(" ")}
              >
                {todo.content}
              </span>
              {todo.priority === "high" && (
                <span className="shrink-0 rounded px-1 py-0.5 text-label-2xs bg-error-base/10 text-error-base">
                  high
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: TodoItem["status"] }) {
  if (status === "completed") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="mt-0.5 shrink-0 text-emerald-500 dark:text-emerald-400"
      >
        <circle
          cx="7"
          cy="7"
          r="6"
          fill="currentColor"
          fillOpacity="0.15"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path
          d="M4.5 7l2 2 3-3"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "in_progress") {
    return (
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        className="mt-0.5 shrink-0 animate-spin text-primary"
        style={{ animationDuration: "1.5s" }}
      >
        <circle
          cx="7"
          cy="7"
          r="6"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity="0.2"
        />
        <path
          d="M7 1a6 6 0 0 1 6 6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className="mt-0.5 shrink-0 text-muted-foreground/35"
    >
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
