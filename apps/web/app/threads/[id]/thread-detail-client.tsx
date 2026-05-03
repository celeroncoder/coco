"use client";

import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ChevronDown,
  ICON_SIZES,
  MoreHorizontal,
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
import { agentMeta } from "~/lib/agents";
import { pulse, Matrix, snake } from "@/components/ui/matrix";
import {
  appendToLastAssistant,
  buildModelGroups,
  Composer,
  MessageBubble,
  normalizeRole,
  safeStringify,
  translatePartToEvents,
  type ModelGroup,
  type OpenCodeMessage,
  type OpenCodeProvidersResponse,
  type PermissionRequest,
  type RunEvent,
  type ThreadWithOpenCode,
} from "./_components";

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
            <ArrowLeft size={ICON_SIZES.md} strokeWidth={1.5} />
          </Button>
          <h1 className="truncate text-xs text-muted-foreground">
            {thread.title}
          </h1>
        </div>
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
            <ChevronDown size={ICON_SIZES.md} />
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

