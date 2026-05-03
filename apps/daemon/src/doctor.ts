import { detectInstalledAgents } from "./agents/detect.ts";
import { CocoApi, type Auth } from "./api.ts";
import { readConfig } from "./config.ts";

export async function doctor() {
  const cfg = await readConfig();
  if (!cfg) {
    console.error("Not paired. Run \x1b[1mcoco-agent pair\x1b[0m first.");
    process.exit(1);
  }
  console.log(`server:   ${cfg.serverUrl}`);
  console.log(`deviceId: ${cfg.deviceId}`);

  const installedAgents = await detectInstalledAgents();
  console.log(
    `installed agents: ${
      installedAgents.length > 0 ? installedAgents.join(", ") : "(none)"
    }`,
  );

  const api = new CocoApi(cfg.serverUrl);
  const auth: Auth = { deviceId: cfg.deviceId, deviceToken: cfg.deviceToken };

  try {
    await api.heartbeat(auth, installedAgents);
    console.log("✓ heartbeat ok");
  } catch (err) {
    console.error("✗ heartbeat failed:", errMsg(err));
    process.exit(1);
  }

  let res: Awaited<ReturnType<CocoApi["doctor"]>>;
  try {
    res = await api.doctor(auth);
  } catch (err) {
    console.error("✗ doctor endpoint failed:", errMsg(err));
    console.error(
      "  (This usually means the web app needs to be redeployed/restarted to pick up the new /api/daemon/doctor route.)",
    );
    process.exit(1);
  }

  console.log(`\nworkspaces (${res.workspaces.length}):`);
  if (res.workspaces.length === 0) {
    console.log(
      "  (none — create one in /workspaces in the web app, scoped to THIS device)",
    );
  } else {
    for (const w of res.workspaces) {
      console.log(`  - ${w.name}  ${w.path}  [${w._id}]`);
    }
  }

  console.log(`\nqueued runs for this device: ${res.queued.count}`);
  for (const r of res.queued.runs) {
    console.log(
      `  - ${r._id}  ${r.agent}${r.mode ? ` [${r.mode}]` : ""} @ ${r.workspacePath}`,
    );
    console.log(`      ${r.prompt}`);
  }

  if (res.queued.count === 0) {
    console.log(
      "\nIf the web UI shows a thread \"waiting for daemon\" but nothing is queued here,\n" +
        "the thread/run is bound to a DIFFERENT deviceId — likely an older pairing.\n" +
        "Check the web /devices page and re-create the workspace against this device.",
    );
  } else {
    console.log(
      "\nRuns are queued for this device. If they're not being picked up,\n" +
        "make sure `coco-agent start` is running (not just `doctor`).",
    );
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
