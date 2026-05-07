"use client";

import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ChevronDown,
  ICON_SIZES,
  MoreHorizontal,
  Terminal,
  Trash2,
} from "@/components/icons";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { agentMeta } from "~/lib/agents";
import { Matrix, snake } from "@/components/ui/matrix";
import {
  Composer,
  MessageBubble,
  parseTodosFromEvents,
  RightSidebar,
  TodoPanel,
  type ModelGroup,
} from "./_components";

export function ThreadDetailClient({ threadId }: { threadId: string }) {
  const tid = threadId as Id<"threads">;
  const router = useRouter();
  const thread = useQuery(api.threads.get, { threadId: tid });
  const messages = useQuery(api.threads.messages, { threadId: tid });
  const runs = useQuery(api.threads.runs, { threadId: tid });
  const skills = useQuery(
    api.skills.listForUser,
    thread ? { deviceId: thread.deviceId } : "skip",
  );
  const plans = useQuery(
    api.plans.byThread,
    thread ? { threadId: tid } : "skip",
  );
  const devices = useQuery(api.devices.list, {});
  const workspace = useQuery(
    api.workspaces.getById,
    thread ? { workspaceId: thread.workspaceId } : "skip",
  );
  const localtermAvailable = useMemo(
    () => devices?.some((d) => d.installedAgents?.includes("localterm")) ?? false,
    [devices],
  );
  const send = useMutation(api.threads.send);
  const cancelRun = useMutation(api.runs.cancelRun);
  const updateMode = useMutation(api.threads.updateMode);
  const updateModel = useMutation(api.threads.updateModel);
  const removeThread = useMutation(api.threads.remove);

  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [effort, setEffort] = useState("medium");

  const isRunning = useMemo(
    () => runs?.some((r) => r.status === "queued" || r.status === "running") ?? false,
    [runs],
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"plan" | "terminal">("plan");

  const planByRunId = useMemo(() => {
    const map = new Map<string, { filePath: string; content: string }>();
    plans?.forEach((p) => {
      if (p.content) map.set(p.runId, { filePath: p.filePath ?? "plan.md", content: p.content });
    });
    return map;
  }, [plans]);

  const latestPlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    const p = plans[0]!;
    return { filePath: p.filePath ?? "plan.md", content: p.content };
  }, [plans]);

  const [implementingPlan, setImplementingPlan] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const initialScrollDone = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const runByMessage = useMemo(() => {
    const map = new Map<
      string,
      {
        status: string;
        error?: string;
        events: { type: string; text?: string; ts: number }[];
      }
    >();
    runs?.forEach((r) => {
      if (r.assistantMessageId)
        map.set(r.assistantMessageId, {
          status: r.status,
          error: r.error,
          events: r.events ?? [],
        });
    });
    return map;
  }, [runs]);

  const todos = useMemo(() => {
    const latestRun = runs?.at(-1);
    return parseTodosFromEvents(latestRun?.events ?? []);
  }, [runs]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
      return;
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (atBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, runs, plans]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      setShowScrollBtn(!atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const selectedSkills = useMemo(() => {
    const matches = prompt.matchAll(/@skill:([\w.-]+)/g);
    const out = new Set<string>();
    for (const m of matches) if (m[1]) out.add(m[1]);
    return Array.from(out);
  }, [prompt]);

  const stopSession = useCallback(async () => {
    await cancelRun({ threadId: tid });
  }, [cancelRun, tid]);

  const implementPlan = useCallback(async () => {
    setImplementingPlan(true);
    try {
      await updateMode({ threadId: tid, mode: "default" });
      setSidebarOpen(false);
      await send({
        threadId: tid,
        prompt: "Implement plan",
        skills: [],
      });
    } catch (err) {
      console.error("Failed to implement plan:", err);
    } finally {
      setImplementingPlan(false);
    }
  }, [updateMode, send, tid]);

  const submit = useCallback(async () => {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    try {
      await send({
        threadId: tid,
        prompt: prompt.trim(),
        skills: selectedSkills,
      });
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  }, [prompt, submitting, send, tid, selectedSkills]);

  if (thread === undefined) {
    return (
      <div className="flex h-svh items-center justify-center text-paragraph-sm text-muted-foreground">
        <Matrix size={4} rows={7} cols={7} frames={snake} fps={12} />
      </div>
    );
  }
  if (thread === null) {
    return (
      <div className="flex h-svh items-center justify-center text-paragraph-sm text-muted-foreground">
        Thread not found.
      </div>
    );
  }

  const meta = agentMeta(thread.agent);
  const currentMode = thread.mode ?? meta?.modes[0]?.id ?? "default";
  const currentModel = thread.model ?? meta?.models[0]?.id ?? "default";
  const modelOptions = meta?.models ?? [{ id: "default", label: "Default" }];
  const modelGroups: ModelGroup[] = [{ label: "Models", options: modelOptions }];
  const displayMessages =
    messages?.map((m) => ({
      id: m._id,
      role: m.role,
      text: m.text,
    })) ?? null;

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-w-0 flex-col overflow-x-hidden bg-background rounded-b-lg">
      {/* slim header */}
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft size={ICON_SIZES.md} strokeWidth={1.5} />
          </Button>
          <h1 className="truncate text-xs text-muted-foreground">
            {thread.title}
          </h1>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    if (localtermAvailable) {
                      setSidebarTab("terminal");
                      setSidebarOpen((p) => !p);
                    }
                  }}
                  aria-label={localtermAvailable ? "Toggle terminal" : "Terminal unavailable"}
                  className={
                    sidebarOpen && sidebarTab === "terminal" ? "text-foreground" : ""
                  }
                >
                  <Terminal size={ICON_SIZES.md} strokeWidth={1.5} />
                </Button>
              }
            />
            <TooltipContent side="bottom" sideOffset={4}>
              {localtermAvailable
                ? sidebarOpen && sidebarTab === "terminal"
                  ? "Close terminal"
                  : "Open terminal"
                : "Terminal unavailable — install localterm to enable"}
            </TooltipContent>
          </Tooltip>
          <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal size={ICON_SIZES.md} strokeWidth={1.5} />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                await removeThread({ threadId: tid });
                router.push("/threads");
              }}
            >
              <Trash2 size={ICON_SIZES.md} strokeWidth={1.5} />
              Delete thread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      {/* message feed */}
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-4 py-6 pb-44">
          {displayMessages?.map((m) => {
            const run = runByMessage.get(m.id);
            let planContent: string | undefined;
            let onExpandPlan: (() => void) | undefined;
            if (run) {
              for (const r of runs ?? []) {
                if (r.assistantMessageId === m.id && planByRunId.has(r._id)) {
                  planContent = planByRunId.get(r._id)!.content;
                  onExpandPlan = () => {
                    setSidebarTab("plan");
                    setSidebarOpen(true);
                  };
                  break;
                }
              }
            }
            return (
              <MessageBubble
                key={m.id}
                role={m.role}
                text={m.text}
                run={run}
                planContent={planContent}
                onExpandPlan={onExpandPlan}
              />
            );
          })}
        </div>
      </div>

      {/* bottom fade gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 bg-linear-to-t from-background via-background/80 to-transparent rounded-b-lg"
      />

      {/* scroll-to-bottom button */}
      {showScrollBtn && (
        <div className="pointer-events-none absolute bottom-32 left-0 right-0 flex justify-center">
          <button
            type="button"
            onClick={scrollToBottom}
            className="pointer-events-auto flex size-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Scroll to bottom"
          >
            <ChevronDown size={ICON_SIZES.md} />
          </button>
        </div>
      )}

      {/* floating input */}
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 px-4">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <TodoPanel todos={todos} />
          <Composer
            agentLabel={meta?.label ?? thread.agent}
            value={prompt}
            onChange={setPrompt}
            onSubmit={submit}
            submitting={submitting}
            isRunning={isRunning}
            onStop={stopSession}
            skills={skills ?? []}
            mode={currentMode}
            modes={meta?.modes ?? [{ id: "default", label: "Default" }]}
            onModeChange={(m) => updateMode({ threadId: tid, mode: m })}
            model={currentModel}
            modelGroups={modelGroups}
            onModelChange={(m) => updateModel({ threadId: tid, model: m })}
            effort={effort}
            onEffortChange={setEffort}
          />
        </div>
      </div>
      <RightSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        defaultTab={sidebarTab}
        plan={latestPlan}
        onImplement={implementPlan}
        implementing={implementingPlan}
        workspacePath={workspace?.path ?? ""}
      />
    </div>
  );
}

