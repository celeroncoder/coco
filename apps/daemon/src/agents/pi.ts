import { spawnLines } from "./spawn-stream.ts";
import { promptWithHistory, type AgentEvent, type AgentRunner } from "./types.ts";

export const piRunner: AgentRunner = async function* (input, signal) {
  const args: string[] = ["--print", "--mode", "json"];

  if (input.model && input.model !== "default") {
    // pi accepts "provider/model" directly via --model
    args.push("--model", input.model);
  }

  if (input.systemPrompt) {
    args.push("--append-system-prompt", input.systemPrompt);
  }

  args.push(promptWithHistory(input));

  for await (const line of spawnLines({
    cmd: "pi",
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

  switch (t) {
    case "text":
    case "text.delta":
    case "message.delta":
    case "assistant.delta": {
      const text = String(e.text ?? e.delta ?? e.content ?? "");
      if (text) yield { type: "text-delta", text };
      return;
    }
    case "thinking":
    case "thinking.delta":
    case "reasoning": {
      const text = String(e.text ?? e.delta ?? e.content ?? "");
      if (text) yield { type: "thinking", text };
      return;
    }
    case "tool_call":
    case "tool.call":
    case "function_call": {
      const name = String(e.name ?? e.tool ?? "tool");
      const argStr = safeStringify(e.input ?? e.args ?? e.arguments);
      yield { type: "tool-call", text: `${name}(${argStr})` };
      return;
    }
    case "tool_result":
    case "tool.result":
    case "function_call_output": {
      const text = String(e.output ?? e.result ?? e.text ?? "");
      if (text) yield { type: "tool-result", text: text.slice(0, 1500) };
      return;
    }
    case "error": {
      const text = String(e.message ?? e.error ?? "pi error");
      yield { type: "error", text };
      return;
    }
    case "assistant":
    case "message": {
      // Some modes emit a final message with content blocks
      const content = e.content;
      if (Array.isArray(content)) {
        for (const block of content as Array<Record<string, unknown>>) {
          if (block.type === "text" && typeof block.text === "string") {
            yield { type: "text-delta", text: block.text };
          } else if (
            (block.type === "thinking" || block.type === "reasoning") &&
            typeof (block.text ?? block.content) === "string"
          ) {
            yield {
              type: "thinking",
              text: String(block.text ?? block.content),
            };
          }
        }
      } else if (typeof content === "string") {
        yield { type: "text-delta", text: content };
      } else if (typeof e.text === "string") {
        yield { type: "text-delta", text: e.text };
      }
      return;
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
