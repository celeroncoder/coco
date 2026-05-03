import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { daemonConvex, jsonError, readDeviceAuth } from "~/lib/daemon-convex";

export async function POST(req: Request) {
  const auth = readDeviceAuth(req);
  if (!auth) return jsonError("Unauthorized", 401);
  let installedAgents: string[] | undefined;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      installedAgents?: string[];
    };
    if (Array.isArray(body.installedAgents)) {
      installedAgents = body.installedAgents.filter(
        (s): s is string => typeof s === "string",
      );
    }
  } catch {}
  try {
    await daemonConvex().mutation(api.devices.heartbeat, {
      deviceId: auth.deviceId as Id<"devices">,
      token: auth.token,
      installedAgents,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Unauthorized", 401);
  }
}
