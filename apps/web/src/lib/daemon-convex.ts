import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { env } from "~/env/client";

let _client: ConvexHttpClient | null = null;
export function daemonConvex(): ConvexHttpClient {
  if (!_client) _client = new ConvexHttpClient(env.NEXT_PUBLIC_CONVEX_URL);
  return _client;
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export type DeviceAuth = { deviceId: string; token: string };

export function readDeviceAuth(req: Request): DeviceAuth | null {
  const auth = req.headers.get("authorization");
  const deviceId = req.headers.get("x-device-id");
  if (!auth?.startsWith("Bearer ") || !deviceId) return null;
  return { deviceId, token: auth.slice(7) };
}
