import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { daemonConvex, jsonError, readDeviceAuth } from "~/lib/daemon-convex";

export async function POST(req: Request) {
  const auth = readDeviceAuth(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const body = (await req.json()) as {
    runId: string;
    event: { type: string; text?: string };
  };
  try {
    await daemonConvex().mutation(api.runs.appendEvent, {
      deviceId: auth.deviceId as Id<"devices">,
      token: auth.token,
      runId: body.runId as Id<"runs">,
      event: body.event,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Forbidden", 401);
  }
}
