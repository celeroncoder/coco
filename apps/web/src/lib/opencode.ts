import "server-only";
import { env } from "~/env/server";

export type OpenCodeAuth = { username?: string; password?: string };

export function getOpenCodeServerUrl(): string | null {
  return env.OPENCODE_SERVER_URL ?? null;
}

export function getOpenCodeAuth(): OpenCodeAuth | null {
  const username = env.OPENCODE_SERVER_USERNAME;
  const password = env.OPENCODE_SERVER_PASSWORD;
  if (!username && !password) return null;
  return { username, password };
}

export function buildOpenCodeHeaders(auth?: OpenCodeAuth | null): HeadersInit {
  if (!auth?.password && !auth?.username) return {};
  const user = auth?.username || "opencode";
  const pass = auth?.password || "";
  const token = Buffer.from(`${user}:${pass}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

export function opencodeUrl(path: string): string | null {
  const base = getOpenCodeServerUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
}
