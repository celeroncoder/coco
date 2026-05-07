import { spawn } from "node:child_process";

const AGENT_BINARIES: Record<string, string[]> = {
  claude: ["claude"],
  localterm: ["localterm"],
};

const cache = new Map<string, boolean>();

function which(bin: string): Promise<boolean> {
  if (cache.has(bin)) return Promise.resolve(cache.get(bin)!);
  return new Promise((resolve) => {
    const child = spawn("which", [bin], { stdio: "ignore" });
    child.on("error", () => {
      cache.set(bin, false);
      resolve(false);
    });
    child.on("close", (code) => {
      const ok = code === 0;
      cache.set(bin, ok);
      resolve(ok);
    });
  });
}

/** Returns the list of agent ids whose CLI is on PATH. */
export async function detectInstalledAgents(): Promise<string[]> {
  const installed: string[] = [];
  await Promise.all(
    Object.entries(AGENT_BINARIES).map(async ([id, bins]) => {
      for (const b of bins) {
        if (await which(b)) {
          installed.push(id);
          return;
        }
      }
    }),
  );
  installed.sort();
  return installed;
}

export function clearDetectionCache() {
  cache.clear();
}
