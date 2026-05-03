import { jsonError } from "~/lib/daemon-convex";
import {
  buildOpenCodeHeaders,
  getOpenCodeAuth,
  opencodeUrl,
} from "~/lib/opencode";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId: string;
    permissionId: string;
    response: "once" | "always" | "reject";
    remember?: boolean;
  };

  if (!body.sessionId || !body.permissionId) {
    return jsonError("Missing sessionId or permissionId", 400);
  }

  const url = opencodeUrl(
    `/session/${body.sessionId}/permissions/${body.permissionId}`,
  );
  if (!url) return jsonError("OpenCode server not configured", 400);

  const auth = getOpenCodeAuth();
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildOpenCodeHeaders(auth),
    },
    body: JSON.stringify({ response: body.response, remember: body.remember }),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return jsonError(text || "OpenCode permission failed", resp.status);
  }

  const data = await resp.json();
  return Response.json(data);
}
