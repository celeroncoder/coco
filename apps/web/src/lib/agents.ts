export type AgentId =
  | "claude"
  // | "codex"
  // | "copilot"
  // | "gemini"
  // | "cursor"
  // | "opencode"
  // | "droid"
  // | "pi"
  ;

export type AgentModel = { id: string; label: string };

export type AgentMeta = {
  id: AgentId;
  label: string;
  modes: { id: string; label: string }[];
  models: AgentModel[];
};

export const AGENTS: AgentMeta[] = [
  {
    id: "claude",
    label: "Claude Code",
    modes: [
      { id: "default", label: "Default" },
      { id: "acceptEdits", label: "Accept edits" },
      { id: "plan", label: "Plan" },
      { id: "bypassPermissions", label: "Bypass permissions" },
    ],
    models: [
      { id: "default", label: "Default (CLI default)" },
      { id: "opus", label: "Opus" },
      { id: "sonnet", label: "Sonnet" },
      { id: "haiku", label: "Haiku" },
    ],
  },
  // {
  //   id: "codex",
  //   label: "Codex",
  //   modes: [
  //     { id: "ask", label: "Ask" },
  //     { id: "auto", label: "Auto" },
  //     { id: "agent-full-access", label: "Full access" },
  //   ],
  //   models: [
  //     { id: "default", label: "Default" },
  //     { id: "gpt-5", label: "GPT-5" },
  //     { id: "gpt-5-codex", label: "GPT-5 Codex" },
  //     { id: "o3", label: "o3" },
  //   ],
  // },
  // {
  //   id: "opencode",
  //   label: "OpenCode",
  //   modes: [
  //     { id: "build", label: "Build" },
  //     { id: "plan", label: "Plan" },
  //   ],
  //   models: [
  //     { id: "default", label: "Default" },
  //     { id: "vercel/claude-3-7-sonnet", label: "Vercel · Claude 3.7 Sonnet" },
  //     { id: "vercel/claude-3-5-sonnet", label: "Vercel · Claude 3.5 Sonnet" },
  //     { id: "vercel/gpt-4o", label: "Vercel · GPT-4o" },
  //     { id: "vercel/o4-mini", label: "Vercel · o4-mini" },
  //   ],
  // },
  // {
  //   id: "cursor",
  //   label: "Cursor",
  //   modes: [
  //     { id: "agent", label: "Agent" },
  //     { id: "ask", label: "Ask" },
  //   ],
  //   models: [{ id: "default", label: "Default" }],
  // },
  // {
  //   id: "copilot",
  //   label: "Copilot",
  //   modes: [{ id: "agent", label: "Agent" }],
  //   models: [
  //     { id: "default", label: "Default" },
  //     { id: "claude-sonnet-4", label: "Claude Sonnet 4" },
  //     { id: "gpt-5", label: "GPT-5" },
  //   ],
  // },
  // {
  //   id: "gemini",
  //   label: "Gemini",
  //   modes: [{ id: "default", label: "Default" }],
  //   models: [
  //     { id: "default", label: "Default" },
  //     { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  //     { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  //   ],
  // },
  // {
  //   id: "droid",
  //   label: "Droid",
  //   modes: [{ id: "default", label: "Default" }],
  //   models: [{ id: "default", label: "Default" }],
  // },
  // {
  //   id: "pi",
  //   label: "Pi",
  //   modes: [{ id: "yolo", label: "YOLO" }],
  //   models: [
  //     { id: "default", label: "Default" },
  //     { id: "anthropic/claude-opus-4-7", label: "Anthropic · Claude Opus 4.7" },
  //     { id: "anthropic/claude-sonnet-4-6", label: "Anthropic · Claude Sonnet 4.6" },
  //     { id: "openai/gpt-5", label: "OpenAI · GPT-5" },
  //     { id: "google/gemini-2.5-pro", label: "Google · Gemini 2.5 Pro" },
  //   ],
  // },
];

export function agentMeta(id: string): AgentMeta | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function defaultModeFor(id: string): string {
  return agentMeta(id)?.modes[0]?.id ?? "default";
}

export function defaultModelFor(id: string): string {
  return agentMeta(id)?.models[0]?.id ?? "default";
}
