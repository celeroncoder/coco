import { spawnLines } from "./spawn-stream.ts";
import { promptWithHistory, type AgentEvent, type AgentRunner } from "./types.ts";

export const codexRunner: AgentRunner = async function* (input, signal) {
  const args: string[] = ["exec", "--json", "--skip-git-repo-check"];

  if (input.mode === "agent-full-access" || input.mode === "auto") {
    args.push("--full-auto");
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
    cmd: "codex",
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
    yield* translateCodexEvent(evt);
  }
};

function* translateCodexEvent(evt: unknown): Generator<AgentEvent> {
  if (!evt || typeof evt !== "object") return;
  const e = evt as Record<string, unknown>;
  const msg = (e.msg ?? e) as Record<string, unknown>;
  const t = String(msg.type ?? e.type ?? "");

  switch (t) {
    case "agent_message_delta":
    case "message_delta": {
      const delta = String(msg.delta ?? "");
      if (delta) yield { type: "text-delta", text: delta };
      return;
    }
    case "agent_message":
    case "message": {
      const text = String(msg.message ?? msg.text ?? "");
      if (text) yield { type: "text-delta", text };
      return;
    }
    case "exec_command_begin":
    case "tool_call":
    case "function_call": {
      const name = String(msg.command ?? msg.name ?? "tool");
      yield { type: "tool-call", text: name };
      return;
    }
    case "exec_command_end":
    case "tool_result":
    case "function_call_output": {
      const out = String(msg.stdout ?? msg.output ?? msg.text ?? "");
      if (out) yield { type: "tool-result", text: out.slice(0, 1500) };
      return;
    }
    case "error":
    case "task_error": {
      const text = String(msg.message ?? msg.error ?? "codex error");
      yield { type: "error", text };
      return;
    }
    case "task_started":
    case "task_complete":
    case "session_configured":
      return;
  }
}
