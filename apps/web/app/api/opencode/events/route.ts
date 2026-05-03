import { jsonError } from "~/lib/daemon-convex";
import {
  buildOpenCodeHeaders,
  getOpenCodeAuth,
  opencodeUrl,
} from "~/lib/opencode";

export async function GET() {
  const url = opencodeUrl("/event");
  if (!url) return jsonError("OpenCode server not configured", 400);
  const auth = getOpenCodeAuth();
  const resp = await fetch(url, {
    headers: {
      Accept: "text/event-stream",
      ...buildOpenCodeHeaders(auth),
    },
    cache: "no-store",
  });

  if (!resp.ok || !resp.body) {
    const text = await resp.text();
    return jsonError(text || "OpenCode event stream failed", resp.status);
  }

  return new Response(resp.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
