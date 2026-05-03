export type AgentEvent =
  | { type: "text-delta"; text: string }
  | { type: "thinking"; text: string }
  | { type: "tool-call"; text: string }
  | { type: "tool-result"; text: string }
  | { type: "info"; text: string }
  | { type: "error"; text: string };

export type RunInput = {
  prompt: string;
  cwd: string;
  mode?: string;
  model?: string;
  systemPrompt?: string;
  history?: { role: "user" | "assistant" | "system"; text: string }[];
};

export type AgentRunner = (
  input: RunInput,
  signal: AbortSignal,
) => AsyncIterable<AgentEvent>;

export function formatHistoryTranscript(
  history: RunInput["history"],
): string | undefined {
  if (!history || history.length === 0) return undefined;
  const lines: string[] = ["<conversation_history>"];
  for (const m of history) {
    const tag =
      m.role === "user" ? "User" : m.role === "assistant" ? "Assistant" : "System";
    lines.push(`[${tag}]: ${m.text}`);
  }
  lines.push("</conversation_history>");
  return lines.join("\n\n");
}

export function promptWithHistory(input: RunInput): string {
  const transcript = formatHistoryTranscript(input.history);
  if (!transcript) return input.prompt;
  return `${transcript}\n\n[User]: ${input.prompt}`;
}
