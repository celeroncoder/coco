import { spawn, type ChildProcess } from "node:child_process";
import { startOpencodeAutoApprover } from "./opencode-auto-approve.ts";

export type OpencodeServerHandle = {
  stop: () => void;
};

export function startOpencodeServer(): OpencodeServerHandle | null {
  if (process.env.COCO_OPENCODE_SERVER === "0") {
    console.log("[opencode] autostart disabled (COCO_OPENCODE_SERVER=0)");
    return null;
  }

  const port = process.env.OPENCODE_SERVER_PORT ?? "4096";
  const hostname = process.env.OPENCODE_SERVER_HOSTNAME ?? "127.0.0.1";
  const autoApprove = process.env.COCO_OPENCODE_AUTO_APPROVE !== "0";

  let child: ChildProcess | null = null;
  let stopping = false;
  let restartTimer: NodeJS.Timeout | null = null;

  const launch = () => {
    if (stopping) return;
    console.log(`[opencode] starting serve on ${hostname}:${port}`);
    const proc = spawn(
      "opencode",
      ["serve", "--port", port, "--hostname", hostname],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    child = proc;

    proc.stdout?.on("data", (d: Buffer) => {
      process.stdout.write(`[opencode] ${d.toString("utf8")}`);
    });
    proc.stderr?.on("data", (d: Buffer) => {
      process.stderr.write(`[opencode] ${d.toString("utf8")}`);
    });
    proc.on("error", (err) => {
      console.error(
        `[opencode] failed to spawn: ${err instanceof Error ? err.message : String(err)}. ` +
          "is the opencode CLI installed and on PATH?",
      );
    });
    proc.on("exit", (code, signal) => {
      child = null;
      if (stopping) return;
      console.warn(
        `[opencode] exited (code=${code ?? signal}); restarting in 2s`,
      );
      restartTimer = setTimeout(launch, 2000);
    });
  };

  launch();

  const approver = autoApprove
    ? startOpencodeAutoApprover({ hostname, port })
    : null;

  return {
    stop: () => {
      stopping = true;
      if (restartTimer) clearTimeout(restartTimer);
      approver?.stop();
      if (child && !child.killed) {
        try {
          child.kill("SIGTERM");
        } catch {}
      }
    },
  };
}
