import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { daemonConvex, jsonError, readDeviceAuth } from "~/lib/daemon-convex";

const MAX_POLL_MS = 25_000;
const STEP_MS = 750;

export async function GET(req: Request) {
  const auth = readDeviceAuth(req);
  if (!auth) return jsonError("Unauthorized", 401);
  const client = daemonConvex();
  const args = {
    deviceId: auth.deviceId as Id<"devices">,
    token: auth.token,
  };
  const deadline = Date.now() + MAX_POLL_MS;
  try {
    while (Date.now() < deadline) {
      const run = await client.query(api.runs.pending, args);
      if (run) return Response.json({ run });
      if (req.signal.aborted) return Response.json({ run: null });
      await new Promise((r) => setTimeout(r, STEP_MS));
    }
    return Response.json({ run: null });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Forbidden", 401);
  }
}
