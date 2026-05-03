import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { daemonConvex, jsonError } from "~/lib/daemon-convex";
import {
  buildOpenCodeHeaders,
  getOpenCodeAuth,
  getOpenCodeServerUrl,
  opencodeUrl,
} from "~/lib/opencode";

export async function POST(req: Request) {
  const serverUrl = getOpenCodeServerUrl();
  if (!serverUrl) return jsonError("OpenCode server not configured", 400);

  const body = (await req.json()) as {
    threadId: string;
    title?: string;
    parentId?: string;
  };
  if (!body.threadId) return jsonError("Missing threadId", 400);

  const auth = getOpenCodeAuth();
  const url = opencodeUrl("/session");
  if (!url) return jsonError("OpenCode server not configured", 400);

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildOpenCodeHeaders(auth),
    },
    body: JSON.stringify({ title: body.title, parentID: body.parentId }),
    cache: "no-store",
  });

  if (!resp.ok) {
    const text = await resp.text();
    return jsonError(text || "OpenCode session create failed", resp.status);
  }

  const session = (await resp.json()) as { id?: string; _id?: string; ID?: string };
  const sessionId = session.id ?? session._id ?? session.ID;
  if (!sessionId) return jsonError("OpenCode session id missing", 500);

  await daemonConvex().mutation(api.threads.setOpenCodeSession, {
    threadId: body.threadId as Id<"threads">,
    sessionId,
    serverUrl,
  });

  return Response.json({ sessionId, serverUrl });
}
