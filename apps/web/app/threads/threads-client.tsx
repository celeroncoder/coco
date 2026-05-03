"use client";

import { api } from "@coco/convex/api";
import { useQuery } from "convex/react";
import { ChevronRight, MessagesSquare } from "@/components/icons";
import Link from "next/link";
import { agentMeta } from "~/lib/agents";

export function ThreadsClient() {
  const threads = useQuery(api.threads.list, {});

  return (
    <div className="flex flex-col gap-4">
      {threads === undefined && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {threads && threads.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm font-medium">No threads yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open a workspace in the sidebar and click + to start a thread.
          </p>
        </div>
      )}

      {threads && threads.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          {threads.map((t) => (
            <Link
              key={t._id}
              href={`/threads/${t._id}`}
              className="flex items-center justify-between gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <MessagesSquare size={16} strokeWidth={1.2} />
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="truncate text-sm font-medium">
                    {t.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {agentMeta(t.agent)?.label ?? t.agent}
                    {t.mode ? ` · ${t.mode}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {new Date(t._creationTime).toLocaleString()}
                <ChevronRight size={14} strokeWidth={1.2} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
