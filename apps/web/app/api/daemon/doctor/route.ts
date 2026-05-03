import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { daemonConvex, jsonError, readDeviceAuth } from "~/lib/daemon-convex";

export async function GET(req: Request) {
  const auth = readDeviceAuth(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const client = daemonConvex();
  const args = {
    deviceId: auth.deviceId as Id<"devices">,
    token: auth.token,
  };
  try {
    const workspaces = await client.query(api.workspaces.listForDevice, args);
    const queued = await client.query(api.runs.queuedSummary, args);
    return Response.json({
      ok: true,
      deviceId: auth.deviceId,
      workspaces: workspaces.map((w) => ({
        _id: w._id,
        name: w.name,
        path: w.path,
      })),
      queued,
    });
  } catch (err) {
    return jsonError(
      err instanceof Error ? err.message : "Forbidden",
      401,
    );
  }
}
