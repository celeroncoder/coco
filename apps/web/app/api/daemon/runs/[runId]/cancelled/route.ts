import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { daemonConvex, jsonError, readDeviceAuth } from "~/lib/daemon-convex";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const auth = readDeviceAuth(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const { runId } = await params;
  try {
    const result = await daemonConvex().query(api.runs.isCancelled, {
      deviceId: auth.deviceId as Id<"devices">,
      token: auth.token,
      runId: runId as Id<"runs">,
    });
    return Response.json(result);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Forbidden", 401);
  }
}
