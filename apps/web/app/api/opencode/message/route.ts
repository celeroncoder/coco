import { jsonError } from "~/lib/daemon-convex";
import {
  buildOpenCodeHeaders,
  getOpenCodeAuth,
  opencodeUrl,
} from "~/lib/opencode";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    sessionId: string;
    message: {
      messageID?: string;
      model?: string;
      agent?: string;
      noReply?: boolean;
      system?: string;
      tools?: unknown;
      parts: unknown[];
    };
  };

  if (!body.sessionId) return jsonError("Missing sessionId", 400);
  const url = opencodeUrl(`/session/${body.sessionId}/message`);
  if (!url) return jsonError("OpenCode server not configured", 400);

  const auth = getOpenCodeAuth();
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildOpenCodeHeaders(auth),
    },
    body: JSON.stringify(body.message),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return jsonError(text || "OpenCode message failed", resp.status);
  }

  const data = await resp.json();
  return Response.json(data);
}
