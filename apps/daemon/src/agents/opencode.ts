import { spawnLines } from "./spawn-stream.ts";
import { promptWithHistory, type AgentEvent, type AgentRunner } from "./types.ts";

export const opencodeRunner: AgentRunner = async function* (input, signal) {
  const args: string[] = [
    "run",
    "--format",
    "json",
    "--thinking",
    "--dangerously-skip-permissions",
  ];

  if (input.mode) {
    args.push("--agent", input.mode);
  }

  if (input.model && input.model !== "default") {
    args.push("-m", input.model);
  }

  const userPrompt = promptWithHistory(input);
  const prompt = input.systemPrompt
    ? `${input.systemPrompt}\n\n---\n\n${userPrompt}`
    : userPrompt;

  args.push(prompt);

  for await (const line of spawnLines({
    cmd: "opencode",
    args,
    cwd: input.cwd,
    signal,
  })) {
    if (line.stream === "stderr") {
      const t = line.text.trim();
      if (t) yield { type: "info", text: t };
      continue;
    }
    const t = line.text.trim();
    if (!t) continue;
    let evt: unknown;
    try {
      evt = JSON.parse(t);
    } catch {
      yield { type: "text-delta", text: line.text };
      continue;
    }
    yield* translate(evt);
  }
};

function* translate(evt: unknown): Generator<AgentEvent> {
  if (!evt || typeof evt !== "object") return;
  const e = evt as Record<string, unknown>;
  const t = String(e.type ?? "");

  // opencode emits events on its bus. The shapes that matter for us:
  // - assistant text (delta or final)
  // - thinking blocks
  // - tool calls and their results
  // - errors

  if (
    t === "message.part.updated" ||
    t === "message.part.added" ||
    t === "session.message.updated"
  ) {
    const props = (e.properties as Record<string, unknown> | undefined) ?? {};
    const part = (e.part ?? props.part ?? {}) as Record<string, unknown>;
    yield* translatePart(part);
    return;
  }

  if (t === "text" || t === "text.delta" || t === "message.delta") {
    const text = String(e.text ?? e.delta ?? e.content ?? "");
    if (text) yield { type: "text-delta", text };
    return;
  }

  if (t === "thinking" || t === "reasoning") {
    const text = String(e.text ?? e.delta ?? e.content ?? "");
    if (text) yield { type: "thinking", text };
    return;
  }

  if (t === "tool.call" || t === "tool_call") {
    const name = String(e.name ?? e.tool ?? "tool");
    const argStr = safeStringify(e.input ?? e.args ?? e.arguments);
    yield { type: "tool-call", text: `${name}(${argStr})` };
    return;
  }

  if (t === "tool.result" || t === "tool_result") {
    const text = String(e.output ?? e.result ?? e.text ?? "");
    if (text) yield { type: "tool-result", text: text.slice(0, 1500) };
    return;
  }

  if (t === "error" || t === "session.error") {
    const text = String(e.message ?? e.error ?? "opencode error");
    yield { type: "error", text };
    return;
  }

  // Walk top-level "parts" array if present (some shapes wrap it).
  const parts = e.parts;
  if (Array.isArray(parts)) {
    for (const p of parts as Array<Record<string, unknown>>) {
      yield* translatePart(p);
    }
  }
}

function* translatePart(part: Record<string, unknown>): Generator<AgentEvent> {
  const pt = String(part.type ?? "");
  if (pt === "text" && typeof part.text === "string") {
    yield { type: "text-delta", text: part.text };
    return;
  }
  if (pt === "reasoning" || pt === "thinking") {
    const text = String(part.text ?? part.content ?? "");
    if (text) yield { type: "thinking", text };
    return;
  }
  if (pt === "tool" || pt === "tool-invocation") {
    const name = String(part.tool ?? part.name ?? "tool");
    const inputStr = safeStringify(part.input ?? part.args);
    yield { type: "tool-call", text: `${name}(${inputStr})` };
    const out = part.output ?? part.result;
    if (out) {
      const text =
        typeof out === "string" ? out : safeStringify(out);
      yield { type: "tool-result", text: text.slice(0, 1500) };
    }
  }
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
