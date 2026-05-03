import type {
  ModelGroup,
  OpenCodeMessage,
  OpenCodeProvidersResponse,
  RunEvent,
} from "./types";

export function normalizeRole(role: unknown): "user" | "assistant" | "system" {
  if (role === "assistant" || role === "system") return role;
  return "user";
}

export function appendToLastAssistant(
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

export function buildModelGroups(
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

export function translatePartToEvents(part: Record<string, unknown>): RunEvent[] {
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

export function safeStringify(v: unknown): string {
  if (v === undefined || v === null) return "";
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    return s.length > 800 ? s.slice(0, 800) + "..." : s;
  } catch {
    return "<unserializable>";
  }
}
