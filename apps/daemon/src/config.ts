import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir, hostname, platform } from "node:os";
import { join } from "node:path";

export type DaemonConfig = {
  serverUrl: string;
  deviceId: string;
  deviceToken: string;
};

const CONFIG_DIR = join(homedir(), ".coco");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export const SKILLS_DIR = join(homedir(), ".agents", "skills");

const DEFAULT_SERVER_URL =
  process.env.NODE_ENV === "production"
    ? "https://coco.celeroncoder.com"
    : "http://localhost:3000";

export async function readConfig(): Promise<DaemonConfig | null> {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed.serverUrl) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeConfig(cfg: DaemonConfig): Promise<void> {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

export function defaultDeviceName(): string {
  return `${hostname()} (${platform()})`;
}

export function detectPlatform(): string {
  return platform();
}

export function resolveServerUrl(explicit?: string): string {
  const url = explicit ?? process.env.COCO_SERVER ?? DEFAULT_SERVER_URL;
  return url.replace(/\/$/, "");
}
