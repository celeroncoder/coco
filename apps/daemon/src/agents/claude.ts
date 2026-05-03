import { spawnLines } from "./spawn-stream.ts";
import { promptWithHistory, type AgentEvent, type AgentRunner } from "./types.ts";

const VALID_MODES = new Set([
  "default",
  "acceptEdits",
  "plan",
  "bypassPermissions",
]);

export const claudeRunner: AgentRunner = async function* (input, signal) {
  const args: string[] = [
    "--print",
    "--output-format",
    "stream-json",
    "--verbose",
  ];

  if (input.mode && VALID_MODES.has(input.mode)) {
    args.push("--permission-mode", input.mode);
  } else if (!input.mode) {
    args.push("--permission-mode", "bypassPermissions");
  }

  if (input.model && input.model !== "default") {
    args.push("--model", input.model);
  }

  if (input.systemPrompt) {
    args.push("--append-system-prompt", input.systemPrompt);
  }

  args.push(promptWithHistory(input));

  for await (const line of spawnLines({
    cmd: "claude",
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
    yield* translateClaudeEvent(evt);
  }
};

function* translateClaudeEvent(evt: unknown): Generator<AgentEvent> {
  if (!evt || typeof evt !== "object") return;
  const e = evt as Record<string, unknown>;

  switch (e.type) {
    case "system":
      return;
    case "assistant": {
      const message = e.message as { content?: unknown } | undefined;
      const content = Array.isArray(message?.content) ? message!.content : [];
      for (const block of content as Array<Record<string, unknown>>) {
        if (block.type === "text" && typeof block.text === "string") {
          yield { type: "text-delta", text: block.text };
        } else if (
          block.type === "thinking" &&
          typeof block.thinking === "string"
        ) {
          yield { type: "thinking", text: block.thinking };
        } else if (block.type === "tool_use") {
          const name = String(block.name ?? "tool");
          const inputStr = safeStringify(block.input);
          yield { type: "tool-call", text: `${name}(${inputStr})` };
        }
      }
      return;
    }
    case "user": {
      const message = e.message as { content?: unknown } | undefined;
      const content = Array.isArray(message?.content) ? message!.content : [];
      for (const block of content as Array<Record<string, unknown>>) {
        if (block.type === "tool_result") {
          const text = extractToolResultText(block.content);
          if (text) yield { type: "tool-result", text };
        }
      }
      return;
    }
    case "result": {
      if (e.subtype === "error_max_turns" || e.is_error === true) {
        const text =
          (typeof e.result === "string" && e.result) ||
          (typeof e.error === "string" && e.error) ||
          `claude reported error (${String(e.subtype ?? "unknown")})`;
        yield { type: "error", text };
      }
      return;
    }
  }
}

function safeStringify(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s.length > 800 ? s.slice(0, 800) + "…" : s;
  } catch {
    return "<unserializable>";
  }
}

function extractToolResultText(content: unknown): string {
  if (typeof content === "string") return content.slice(0, 1500);
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content as Array<Record<string, unknown>>) {
      if (block && block.type === "text" && typeof block.text === "string") {
        parts.push(block.text);
      }
    }
    return parts.join("\n").slice(0, 1500);
  }
  return "";
}
