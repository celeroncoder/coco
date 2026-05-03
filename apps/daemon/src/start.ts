import { clearDetectionCache, detectInstalledAgents } from "./agents/detect.ts";
import { getRunner } from "./agents/index.ts";
import type { AgentEvent } from "./agents/types.ts";
import { CocoApi, type Auth, type PendingRun } from "./api.ts";
import { readConfig } from "./config.ts";
import { startOpencodeServer } from "./opencode-server.ts";
import { readSkillContent, scanSkills } from "./skills.ts";

const HEARTBEAT_MS = 30_000;
const SKILLS_RESCAN_MS = 60_000;
const AGENTS_RESCAN_MS = 5 * 60_000;
const FLUSH_MS = 200;

export async function start() {
  const cfg = await readConfig();
  if (!cfg) {
    console.error("Not paired. Run \x1b[1mcoco-agent pair\x1b[0m first.");
    process.exit(1);
  }
  const api = new CocoApi(cfg.serverUrl);
  const auth: Auth = {
    deviceId: cfg.deviceId,
    deviceToken: cfg.deviceToken,
  };

  console.log(`coco-agent connected via ${cfg.serverUrl}`);
  console.log(`device: ${cfg.deviceId}`);

  const opencodeServer = startOpencodeServer();

  let stopping = false;
  const aborters = new Set<AbortController>();

  let installedAgents = await detectInstalledAgents();
  console.log(
    installedAgents.length > 0
      ? `installed agents: ${installedAgents.join(", ")}`
      : "installed agents: (none detected — check that CLIs are on PATH)",
  );
  let heartbeatWarned = false;
  const tryHeartbeat = async () => {
    try {
      await api.heartbeat(auth, installedAgents);
      if (heartbeatWarned) {
        console.log("[heartbeat] reconnected to coco server");
        heartbeatWarned = false;
      }
    } catch (err) {
      if (!heartbeatWarned) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[heartbeat] ${msg} (will retry)`);
        heartbeatWarned = true;
      }
    }
  };
  await tryHeartbeat();
  const heartbeat = setInterval(tryHeartbeat, HEARTBEAT_MS);
  const agentsTimer = setInterval(async () => {
    clearDetectionCache();
    const next = await detectInstalledAgents();
    if (next.join(",") !== installedAgents.join(",")) {
      installedAgents = next;
      console.log(`installed agents updated: ${installedAgents.join(", ")}`);
    }
  }, AGENTS_RESCAN_MS);

  syncSkills(api, auth).catch(() => {});
  const skillsTimer = setInterval(() => {
    syncSkills(api, auth).catch(() => {});
  }, SKILLS_RESCAN_MS);

  let pollCount = 0;
  let lastLog = 0;
  void (async () => {
    while (!stopping) {
      try {
        const { run } = await api.pollPendingRun(auth);
        pollCount++;
        if (run) {
          console.log(`[poll] picked up run ${run._id}`);
          await handleRun(api, auth, run, aborters);
        } else if (Date.now() - lastLog > 60_000) {
          console.log(
            `[poll] idle (${pollCount} polls so far, no runs queued for this device)`,
          );
          lastLog = Date.now();
        }
      } catch (err) {
        if (stopping) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[poll] error:", msg);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  })();

  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log("\nshutting down...");
    clearInterval(heartbeat);
    clearInterval(skillsTimer);
    clearInterval(agentsTimer);
    for (const ac of aborters) ac.abort();
    opencodeServer?.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

async function syncSkills(api: CocoApi, auth: Auth) {
  const skills = await scanSkills();
  await api.syncSkills(
    auth,
    skills.map((s) => ({
      name: s.name,
      description: s.description,
      path: s.path,
    })),
  );
}

async function handleRun(
  api: CocoApi,
  auth: Auth,
  run: PendingRun,
  aborters: Set<AbortController>,
) {
  const claim = await api.claimRun(auth, run._id);
  if (!claim.ok) return;

  console.log(
    `\n[run ${run._id}] ${run.agent}${run.mode ? ` [${run.mode}]` : ""} @ ${run.workspacePath}`,
  );

  const ac = new AbortController();
  aborters.add(ac);

  let buffer = "";
  let lastFlush = Date.now();
  const flushText = async () => {
    if (!buffer) return;
    const text = buffer;
    buffer = "";
    lastFlush = Date.now();
    await api.appendEvent(auth, run._id, { type: "text-delta", text });
  };

  try {
    const runner = getRunner(run.agent);
    const systemPrompt = await buildSystemPrompt(run.skills);

    for await (const evt of runner(
      {
        prompt: run.prompt,
        cwd: run.workspacePath,
        mode: run.mode,
        model: run.model,
        systemPrompt,
        history: run.history,
      },
      ac.signal,
    )) {
      await emitEvent(api, auth, run._id, evt, {
        flushText,
        appendBuffer: (t) => {
          buffer += t;
        },
        shouldFlush: () => Date.now() - lastFlush >= FLUSH_MS,
      });
    }

    await flushText();
    await api.finishRun(auth, run._id, "done");
    console.log(`\n[run ${run._id}] done`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[run ${run._id}] error:`, message);
    try {
      await flushText();
      await api.appendEvent(auth, run._id, { type: "error", text: message });
      await api.finishRun(auth, run._id, "error", message);
    } catch {}
  } finally {
    aborters.delete(ac);
  }
}

type EmitCtx = {
  flushText: () => Promise<void>;
  appendBuffer: (t: string) => void;
  shouldFlush: () => boolean;
};

async function emitEvent(
  api: CocoApi,
  auth: Auth,
  runId: string,
  evt: AgentEvent,
  ctx: EmitCtx,
) {
  if (evt.type === "text-delta") {
    process.stdout.write(evt.text);
    ctx.appendBuffer(evt.text);
    if (ctx.shouldFlush()) await ctx.flushText();
    return;
  }
  await ctx.flushText();
  await api.appendEvent(auth, runId, { type: evt.type, text: evt.text });
  if (evt.type === "tool-call") console.log(`\n[tool] ${evt.text}`);
  else if (evt.type === "error") console.error(`\n[error] ${evt.text}`);
}

async function buildSystemPrompt(
  skills: { name: string; path?: string }[],
): Promise<string | undefined> {
  if (skills.length === 0) return undefined;
  const parts: string[] = [
    "The user has attached the following skills. Apply them as relevant:",
  ];
  for (const s of skills) {
    if (!s.path) continue;
    const content = await readSkillContent(s.path);
    if (content) {
      parts.push(`\n## Skill: ${s.name}\n\n${content}`);
    } else {
      parts.push(`\n## Skill: ${s.name}`);
    }
  }
  return parts.join("\n");
}
