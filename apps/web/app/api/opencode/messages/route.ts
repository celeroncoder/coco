import { jsonError } from "~/lib/daemon-convex";
import {
  buildOpenCodeHeaders,
  getOpenCodeAuth,
  opencodeUrl,
} from "~/lib/opencode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const limit = searchParams.get("limit");
  if (!sessionId) return jsonError("Missing sessionId", 400);

  const url = opencodeUrl(
    `/session/${sessionId}/message${limit ? `?limit=${encodeURIComponent(limit)}` : ""}`,
  );
  if (!url) return jsonError("OpenCode server not configured", 400);

  const auth = getOpenCodeAuth();
  const resp = await fetch(url, {
    headers: {
      ...buildOpenCodeHeaders(auth),
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return jsonError(text || "OpenCode message list failed", resp.status);
  }

  const data = await resp.json();
  return Response.json(data);
}
