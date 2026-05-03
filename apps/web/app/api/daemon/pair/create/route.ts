import { api } from "@coco/convex/api";
import { daemonConvex, jsonError } from "~/lib/daemon-convex";

export async function POST(req: Request) {
  let body: { deviceName?: string; platform?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  if (!body.deviceName) return jsonError("deviceName required", 400);
  const result = await daemonConvex().mutation(api.pairing.createCode, {
    deviceName: body.deviceName,
    platform: body.platform,
  });
  return Response.json(result);
}
