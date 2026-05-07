export type AgentId =
  | "claude"
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
