import { claudeRunner } from "./claude.ts";
import { codexRunner } from "./codex.ts";
import { opencodeRunner } from "./opencode.ts";
import { piRunner } from "./pi.ts";
import type { AgentRunner } from "./types.ts";

const RUNNERS: Record<string, AgentRunner> = {
  claude: claudeRunner,
  codex: codexRunner,
  opencode: opencodeRunner,
  pi: piRunner,
};

export function getRunner(agent: string): AgentRunner {
  const r = RUNNERS[agent];
  if (!r) {
    throw new Error(
      `agent '${agent}' is not yet supported by the per-CLI runner. ` +
        `Supported: ${Object.keys(RUNNERS).join(", ")}`,
    );
  }
  return r;
}

export type { AgentEvent, AgentRunner, RunInput } from "./types.ts";
