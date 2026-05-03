import { api } from "@coco/convex/api";
import { daemonConvex, jsonError } from "~/lib/daemon-convex";

const MAX_POLL_MS = 25_000;
const STEP_MS = 1_000;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return jsonError("code required", 400);

  const client = daemonConvex();
  const deadline = Date.now() + MAX_POLL_MS;
  while (Date.now() < deadline) {
    const res = await client.query(api.pairing.poll, { code });
    if (!res || res.status !== "pending") {
      return Response.json(res ?? { status: "not_found" });
    }
    if (req.signal.aborted) return Response.json({ status: "pending" });
    await new Promise((r) => setTimeout(r, STEP_MS));
  }
  return Response.json({ status: "pending" });
}
