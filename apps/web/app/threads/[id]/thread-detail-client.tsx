"use client";

import { api } from "@coco/convex/api";
import type { Doc, Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  MoreHorizontal,
  Sparkles,
  Square,
  TriangleAlert,
  Trash2,
} from "@/components/icons";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Response } from "~/components/ai-elements/response";
import { Thinking } from "~/components/ai-elements/thinking";
import {
  ToolCallTimeline,
  type ToolCallEvent,
} from "~/components/ai-elements/timeline";
import { agentMeta } from "~/lib/agents";
import { cn } from "~/lib/utils";
import { pulse, Matrix } from "@/components/ui/matrix"


const EFFORTS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

export function ThreadDetailClient({ threadId }: { threadId: string }) {
  const tid = threadId as Id<"threads">;
  const router = useRouter();
  const thread = useQuery(api.threads.get, { threadId: tid });
  const threadWithOpenCode = thread as ThreadWithOpenCode | null | undefined;
  const messages = useQuery(api.threads.messages, { threadId: tid });
  const runs = useQuery(api.threads.runs, { threadId: tid });
  const skills = useQuery(
    api.skills.listForUser,
    thread ? { deviceId: thread.deviceId } : "skip",
  );
  const send = useMutation(api.threads.send);
  const setOpenCodeSession = useMutation(api.threads.setOpenCodeSession);
  const updateMode = useMutation(api.threads.updateMode);
  const updateModel = useMutation(api.threads.updateModel);
  const removeThread = useMutation(api.threads.remove);

  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [effort, setEffort] = useState("medium");
  const [opencodeSessionId, setOpencodeSessionId] = useState<string | null>(null);
  const [opencodeEvents, setOpencodeEvents] = useState<RunEvent[]>([]);
  const [opencodeMessages, setOpencodeMessages] = useState<OpenCodeMessage[]>([]);
  const [opencodeModels, setOpencodeModels] = useState<ModelGroup[]>([]);
  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>(
    [],
  );
  const [pendingPermissions, setPendingPermissions] = useState<
    Record<string, "pending" | "approved" | "rejected">
  >({});

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // First time messages arrive, always scroll to bottom regardless of position
    if (!initialScrollDone.current) {
      initialScrollDone.current = true;
      el.scrollTo({ top: el.scrollHeight, behavior: "instant" });
      return;
    }
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (atBottom) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, runs, opencodeEvents, permissionRequests]);

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

  useEffect(() => {
    if (!threadWithOpenCode || threadWithOpenCode.agent !== "opencode") return;
    if (threadWithOpenCode.opencodeSessionId) {
      setOpencodeSessionId(threadWithOpenCode.opencodeSessionId);
      return;
    }
    void (async () => {
      try {
        const resp = await fetch("/api/opencode/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId: threadWithOpenCode._id,
            title: threadWithOpenCode.title,
          }),
        });
        if (!resp.ok) return;
        const data = (await resp.json()) as { sessionId: string; serverUrl: string };
        setOpencodeSessionId(data.sessionId);
        await setOpenCodeSession({
          threadId: tid,
          sessionId: data.sessionId,
          serverUrl: data.serverUrl,
        });
      } catch {}
    })();
  }, [threadWithOpenCode, tid, setOpenCodeSession]);

  useEffect(() => {
    if (!opencodeSessionId) return;
    let cancelled = false;
    const backfill = async () => {
      try {
        const resp = await fetch(
          `/api/opencode/messages?sessionId=${encodeURIComponent(opencodeSessionId)}&limit=50`,
        );
        if (!resp.ok) return;
        const items = (await resp.json()) as Array<{
          info?: Record<string, unknown>;
          parts?: Array<Record<string, unknown>>;
        }>;
        const events: RunEvent[] = [];
        const messages: OpenCodeMessage[] = [];
        for (const item of items) {
          const info = item.info ?? {};
          const role = normalizeRole(info.role);
          const messageId = String(
            info.id ?? info._id ?? info.ID ?? `${Date.now()}-${messages.length}`,
          );
          const parts = item.parts ?? [];
          const textParts: string[] = [];
          for (const part of parts) {
            const evts = translatePartToEvents(part);
            if (evts.length > 0) events.push(...evts);
            if (part.type === "text" && typeof part.text === "string") {
              textParts.push(part.text);
            }
          }
          messages.push({ id: messageId, role, text: textParts.join("") });
        }
        if (!cancelled) {
          setOpencodeMessages(messages);
          setOpencodeEvents(events);
        }
      } catch {}
    };
    void backfill();
    return () => {
      cancelled = true;
    };
  }, [opencodeSessionId]);

  useEffect(() => {
    if (!threadWithOpenCode || threadWithOpenCode.agent !== "opencode") return;
    let cancelled = false;
    const loadModels = async () => {
      try {
        const resp = await fetch("/api/opencode/models");
        if (!resp.ok) return;
        const data = (await resp.json()) as OpenCodeProvidersResponse;
        const groups = buildModelGroups(data);
        if (!cancelled) setOpencodeModels(groups);
      } catch {}
    };
    void loadModels();
    return () => {
      cancelled = true;
    };
  }, [threadWithOpenCode]);

  useEffect(() => {
    if (!opencodeSessionId) return;
    const ac = new AbortController();
    const connect = async () => {
      try {
        const resp = await fetch("/api/opencode/events", {
          signal: ac.signal,
        });
        if (!resp.ok || !resp.body) return;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const chunk of parts) {
            const dataLines = chunk
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trim());
            if (dataLines.length === 0) continue;
            const payload = dataLines.join("\n").trim();
            if (!payload) continue;
            let evt: Record<string, unknown> | null = null;
            try {
              evt = JSON.parse(payload) as Record<string, unknown>;
            } catch {
              continue;
            }
            if (!evt) continue;
            const t = String(evt.type ?? "");
            const props = (evt.properties as Record<string, unknown>) ?? {};
            const sessionId = String(
              props.sessionId ??
                props.sessionID ??
                props.session_id ??
                evt.sessionId ??
                evt.sessionID ??
                "",
            );
            if (sessionId && sessionId !== opencodeSessionId) continue;
            if (!sessionId && t === "server.connected") continue;

            if (
              t === "permission.request" ||
              t === "permission.requested" ||
              t === "permission" ||
              t === "session.permission.requested"
            ) {
              const req = (props.permission ?? props ?? evt) as Record<string, unknown>;
              const permissionId = String(
                req.permissionId ?? req.permissionID ?? evt.permissionId ?? "",
              );
              if (!permissionId) continue;
              const title = String(req.title ?? req.action ?? "Permission request");
              const description = String(req.description ?? req.prompt ?? "");
              setPermissionRequests((prev) => {
                if (prev.some((p) => p.permissionId === permissionId)) return prev;
                return [
                  ...prev,
                  { permissionId, title, description, raw: req },
                ];
              });
              continue;
            }

            if (
              t === "message.part.updated" ||
              t === "message.part.added" ||
              t === "session.message.updated"
            ) {
              const part = (evt.part ?? props.part ?? {}) as Record<string, unknown>;
              const evts = translatePartToEvents(part);
              if (evts.length > 0) {
                setOpencodeEvents((prev) => [...prev, ...evts]);
              }
              continue;
            }

            const messageParts = (evt.message as Record<string, unknown> | undefined)?.parts;
            if (Array.isArray(messageParts)) {
              const evts = messageParts.flatMap((p) =>
                translatePartToEvents(p as Record<string, unknown>),
              );
              if (evts.length > 0) {
                setOpencodeEvents((prev) => [...prev, ...evts]);
              }
            }

            if (t === "text" || t === "text.delta" || t === "message.delta") {
              const text = String(evt.text ?? evt.delta ?? evt.content ?? "");
              if (text) {
                setOpencodeEvents((prev) => [
                  ...prev,
                  { type: "text-delta", text, ts: Date.now() },
                ]);
                setOpencodeMessages((prev) => appendToLastAssistant(prev, text));
              }
              continue;
            }

            if (t === "thinking" || t === "reasoning") {
              const text = String(evt.text ?? evt.delta ?? evt.content ?? "");
              if (text) {
                setOpencodeEvents((prev) => [
                  ...prev,
                  { type: "thinking", text, ts: Date.now() },
                ]);
              }
              continue;
            }

            if (t === "tool.call" || t === "tool_call") {
              const name = String(evt.name ?? evt.tool ?? "tool");
              const args = safeStringify(evt.input ?? evt.args ?? evt.arguments);
              setOpencodeEvents((prev) => [
                ...prev,
                { type: "tool-call", text: `${name}(${args})`, ts: Date.now() },
              ]);
              continue;
            }

            if (t === "tool.result" || t === "tool_result") {
              const text = String(evt.output ?? evt.result ?? evt.text ?? "");
              if (text) {
                setOpencodeEvents((prev) => [
                  ...prev,
                  { type: "tool-result", text, ts: Date.now() },
                ]);
              }
            }
          }
        }
      } catch {}
    };
    void connect();
    return () => ac.abort();
  }, [opencodeSessionId]);

  const selectedSkills = useMemo(() => {
    const matches = prompt.matchAll(/@skill:([\w.-]+)/g);
    const out = new Set<string>();
    for (const m of matches) if (m[1]) out.add(m[1]);
    return Array.from(out);
  }, [prompt]);

  const submit = useCallback(async () => {
    if (!prompt.trim() || submitting) return;
    setSubmitting(true);
    try {
      if (threadWithOpenCode?.agent === "opencode" && opencodeSessionId) {
        const userText = prompt.trim();
        setOpencodeEvents([]);
        setOpencodeMessages((prev) => [
          ...prev,
          { id: `local-user-${Date.now()}`, role: "user", text: userText },
          { id: `local-assistant-${Date.now()}`, role: "assistant", text: "" },
        ]);
        await send({ threadId: tid, prompt: userText, skills: selectedSkills });
        await fetch("/api/opencode/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: opencodeSessionId,
            message: {
              parts: [{ type: "text", text: userText }],
            },
          }),
        });
      } else {
        await send({
          threadId: tid,
          prompt: prompt.trim(),
          skills: selectedSkills,
        });
      }
      setPrompt("");
    } finally {
      setSubmitting(false);
    }
  }, [
    prompt,
    submitting,
    send,
    tid,
    selectedSkills,
    threadWithOpenCode,
    opencodeSessionId,
  ]);

  if (thread === undefined) {
    return (
      <div className="flex h-svh items-center justify-center text-paragraph-sm text-muted-foreground">
        <Matrix size={4} rows={7} cols={7} frames={pulse} fps={12} />
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
  const modelGroups =
    threadWithOpenCode?.agent === "opencode" && opencodeModels.length > 0
      ? opencodeModels
      : [{ label: "Models", options: modelOptions }];
  const displayMessages =
    threadWithOpenCode?.agent !== "opencode"
      ? (messages?.map((m) => ({
          id: m._id,
          role: m.role,
          text: m.text,
        })) ?? null)
      : opencodeMessages.length > 0
        ? opencodeMessages
        : (messages?.map((m) => ({
            id: m._id,
            role: m.role,
            text: m.text,
          })) ?? null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative flex h-[calc(100vh-4rem)] min-w-0 flex-col overflow-x-hidden bg-background">
      {/* slim header */}
      <header className="flex h-10 shrink-0 items-center justify-between gap-2 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => router.back()}
            aria-label="Back"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
          </Button>
          <h1 className="truncate text-xs text-muted-foreground">
            {thread.title}
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-xs">
                <MoreHorizontal size={14} strokeWidth={1.5} />
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
              <Trash2 size={14} strokeWidth={1.5} />
              Delete thread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* message feed */}
      <div ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-6 px-4 py-6 pb-44">
          {displayMessages?.map((m, idx) => {
            const isLastAssistant =
              thread.agent === "opencode" &&
              m.role === "assistant" &&
              (displayMessages?.slice(idx + 1).find((n) => n.role === "assistant") ??
                null) === null;
            return (
              <MessageBubble
                key={m.id}
                role={m.role}
                text={m.text}
                run={runByMessage.get(m.id)}
                opencodeEvents={isLastAssistant ? opencodeEvents : undefined}
                permissionRequests={isLastAssistant ? permissionRequests : undefined}
                onPermissionAction={async (permissionId, response) => {
                  if (!opencodeSessionId) return;
                  setPendingPermissions((prev) => ({
                    ...prev,
                    [permissionId]: response === "reject" ? "rejected" : "approved",
                  }));
                  await fetch("/api/opencode/permissions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      sessionId: opencodeSessionId,
                      permissionId,
                      response,
                      remember: response === "always",
                    }),
                  });
                  setPermissionRequests((prev) =>
                    prev.filter((p) => p.permissionId !== permissionId),
                  );
                }}
                pendingPermissions={pendingPermissions}
              />
            );
          })}
        </div>
      </div>

      {/* bottom fade gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-44 bg-linear-to-t from-background via-background/80 to-transparent"
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
            <ChevronDown size={13} />
          </button>
        </div>
      )}

      {/* floating input */}
      <div className="pointer-events-none absolute bottom-4 left-0 right-0 z-10 px-4">
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <Composer
            agentLabel={meta?.label ?? thread.agent}
            value={prompt}
            onChange={setPrompt}
            onSubmit={submit}
            submitting={submitting}
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
    </div>
  );
}

type Skill = { _id: string; name: string; description?: string };

function Composer({
  agentLabel,
  value,
  onChange,
  onSubmit,
  submitting,
  skills,
  mode,
  modes,
  onModeChange,
  model,
  modelGroups,
  onModelChange,
  effort,
  onEffortChange,
}: {
  agentLabel: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  skills: Skill[];
  mode: string;
  modes: { id: string; label: string }[];
  onModeChange: (m: string) => void;
  model: string;
  modelGroups: ModelGroup[];
  onModelChange: (m: string) => void;
  effort: string;
  onEffortChange: (e: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{
    query: string;
    start: number;
    end: number;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  const filteredSkills = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    const list = q
      ? skills.filter((s) => s.name.toLowerCase().includes(q))
      : skills;
    return list.slice(0, 8);
  }, [mention, skills]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mention?.query]);

  const detectMention = useCallback(
    (text: string, caret: number) => {
      // Find the most recent @ before caret with no whitespace between
      let i = caret - 1;
      while (i >= 0) {
        const ch = text[i] ?? "";
        if (ch === "@") {
          const before = i === 0 ? " " : (text[i - 1] ?? " ");
          if (/\s/.test(before) || i === 0) {
            const query = text.slice(i + 1, caret);
            if (/^[\w.-]*$/.test(query)) {
              setMention({ query, start: i, end: caret });
              return;
            }
          }
          break;
        }
        if (/\s/.test(ch)) break;
        i--;
      }
      setMention(null);
    },
    [],
  );

  const insertSkill = useCallback(
    (skill: Skill) => {
      if (!mention) return;
      const insertion = `@skill:${skill.name} `;
      const next =
        value.slice(0, mention.start) + insertion + value.slice(mention.end);
      onChange(next);
      setMention(null);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = mention.start + insertion.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [mention, value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && filteredSkills.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filteredSkills.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (i) => (i - 1 + filteredSkills.length) % filteredSkills.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const target = filteredSkills[activeIndex];
        if (target) insertSkill(target);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="relative flex flex-col gap-2 rounded-2xl border border-border bg-background px-3 pt-2.5 pb-2 transition-colors focus-within:border-foreground"
    >
      {mention && filteredSkills.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-regular-md">
          {filteredSkills.map((s, idx) => (
            <button
              key={s._id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertSkill(s);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left",
                idx === activeIndex
                  ? "bg-muted"
                  : "hover:bg-muted/60",
              )}
            >
              <span className="truncate text-label-xs font-medium text-foreground">
                @skill:{s.name}
              </span>
              {s.description && (
                <span className="line-clamp-1 text-label-2xs text-muted-foreground">
                  {s.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detectMention(e.target.value, e.target.selectionStart ?? 0);
        }}
        onKeyUp={(e) => {
          const t = e.currentTarget;
          detectMention(t.value, t.selectionStart ?? 0);
        }}
        onClick={(e) => {
          const t = e.currentTarget;
          detectMention(t.value, t.selectionStart ?? 0);
        }}
        onBlur={() => setTimeout(() => setMention(null), 100)}
        placeholder={`Ask ${agentLabel} anything…`}
        rows={1}
        className="min-h-6 w-full resize-none bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        onKeyDown={handleKeyDown}
      />

      <div className="flex flex-wrap items-center justify-end gap-1">
        <PillSelect
          value={model}
          onChange={onModelChange}
          groups={modelGroups}
          disabled={modelGroups.flatMap((g) => g.options).length <= 1}
        />
        <PillSelect
          value={mode}
          onChange={onModeChange}
          options={modes}
          disabled={modes.length <= 1}
        />
        <PillSelect
          value={effort}
          onChange={onEffortChange}
          options={EFFORTS}
        />
        <Button
          type="submit"
          size="icon-xs"
          disabled={submitting || !value.trim()}
          aria-label="Send"
          className="ml-1 shrink-0"
        >
          <ArrowUp size={14} strokeWidth={1.5} />
        </Button>
      </div>
    </form>
  );
}

function PillSelect({
  value,
  onChange,
  options,
  groups,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: { id: string; label: string }[];
  groups?: ModelGroup[];
  disabled?: boolean;
}) {
  const effectiveGroups = useMemo(
    () => groups ?? [{ label: "Options", options: options ?? [] }],
    [groups, options],
  );
  const flatOptions = useMemo(
    () => effectiveGroups.flatMap((g) => g.options),
    [effectiveGroups],
  );
  const current = useMemo(
    () => flatOptions.find((o) => o.id === value) ?? flatOptions[0],
    [flatOptions, value],
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
              "data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
            )}
          >
            <span className="truncate">{current?.label ?? value}</span>
            <ChevronDown size={12} strokeWidth={1.5} className="shrink-0" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
        {effectiveGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            {group.options.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onClick={() => onChange(o.id)}
                className={cn(
                  "text-sm",
                  o.id === value && "bg-muted font-medium",
                )}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type RunEvent = { type: string; text?: string; ts: number };
type RunInfo = { status: string; error?: string; events: RunEvent[] };

type DisplayMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

type OpenCodeMessage = DisplayMessage;

type ThreadWithOpenCode = Doc<"threads"> & {
  opencodeSessionId?: string;
  opencodeServerUrl?: string;
};

type ModelGroup = {
  label: string;
  options: { id: string; label: string }[];
};

type OpenCodeProvidersResponse = {
  providers?: Array<{
    id?: string;
    name?: string;
    label?: string;
    models?: Array<{ id?: string; model?: string; name?: string; label?: string }>;
  }>;
  all?: Array<{
    id?: string;
    name?: string;
    label?: string;
    models?: Array<{ id?: string; model?: string; name?: string; label?: string }>;
  }>;
  default?: Record<string, string>;
  connected?: string[];
};

function normalizeRole(role: unknown): "user" | "assistant" | "system" {
  if (role === "assistant" || role === "system") return role;
  return "user";
}

function appendToLastAssistant(
  messages: OpenCodeMessage[],
  text: string,
): OpenCodeMessage[] {
  if (messages.length === 0) return messages;
  const next = [...messages];
  for (let i = next.length - 1; i >= 0; i--) {
    if (next[i]?.role === "assistant") {
      next[i] = { ...next[i]!, text: next[i]!.text + text };
      return next;
    }
  }
  return messages;
}

function buildModelGroups(
  data: OpenCodeProvidersResponse,
): ModelGroup[] {
  const providers = data.providers ?? data.all ?? [];
  const connected = data.connected ?? [];
  const connectedSet = new Set(
    connected.map((id) => id.trim()).filter((id) => id.length > 0),
  );
  return providers
    .filter((provider) =>
      connectedSet.size > 0
        ? connectedSet.has(String(provider.id ?? ""))
        : true,
    )
    .map((provider) => {
      const label =
        provider.label ?? provider.name ?? provider.id ?? "Provider";
      const rawModels = provider.models ?? [];
      const models = Array.isArray(rawModels)
        ? rawModels
        : Object.values(rawModels as Record<string, unknown>);
      const options = models
        .map((m) => ({
          id: String(m.id ?? m.model ?? "default"),
          label: String(m.label ?? m.name ?? m.id ?? m.model ?? "Default"),
        }))
        .filter((m) => m.id.length > 0);
      return { label, options };
    })
    .filter((group) => group.options.length > 0);
}

type PermissionRequest = {
  permissionId: string;
  title: string;
  description?: string;
  raw?: Record<string, unknown>;
};

function MessageBubble({
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
        <ShimmerLoader label="Waiting for daemon…" />
      )}

      {/* loading — no content yet */}
      {!hasContent && isStreaming && <ShimmerLoader />}

      {/* blocks in original order: thinking → tool batches → text → … */}
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
            <Copy size={11} />
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
          <TriangleAlert size={14} className="mt-0.5 shrink-0 text-error-base" />
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

const SHIMMER_PHRASES = ["Thinking…", "Working on it…", "One moment…"];

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

function translatePartToEvents(part: Record<string, unknown>): RunEvent[] {
  const out: RunEvent[] = [];
  const pt = String(part.type ?? "");
  if (pt === "text" && typeof part.text === "string") {
    out.push({ type: "text-delta", text: part.text, ts: Date.now() });
  }
  if (pt === "reasoning" || pt === "thinking") {
    const text = String(part.text ?? part.content ?? "");
    if (text) out.push({ type: "thinking", text, ts: Date.now() });
  }
  if (pt === "tool" || pt === "tool-invocation") {
    const name = String(part.tool ?? part.name ?? "tool");
    const inputStr = safeStringify(part.input ?? part.args ?? part.arguments);
    out.push({ type: "tool-call", text: `${name}(${inputStr})`, ts: Date.now() });
    const outValue = part.output ?? part.result;
    if (outValue) {
      const text = typeof outValue === "string" ? outValue : safeStringify(outValue);
      out.push({ type: "tool-result", text, ts: Date.now() });
    }
  }
  return out;
}

function safeStringify(v: unknown): string {
  if (v === undefined || v === null) return "";
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > 800 ? s.slice(0, 800) + "…" : s;
  } catch {
    return "<unserializable>";
  }
}

