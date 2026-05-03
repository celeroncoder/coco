import { jsonError } from "~/lib/daemon-convex";
import {
  buildOpenCodeHeaders,
  getOpenCodeAuth,
  opencodeUrl,
} from "~/lib/opencode";

export async function GET() {
  const auth = getOpenCodeAuth();
  const providerUrl = opencodeUrl("/provider");
  if (!providerUrl) return jsonError("OpenCode server not configured", 400);

  const providerResp = await fetch(providerUrl, {
    headers: {
      ...buildOpenCodeHeaders(auth),
    },
    cache: "no-store",
  });

  if (providerResp.ok) {
    const data = await providerResp.json();
    return Response.json(data);
  }

  const configUrl = opencodeUrl("/config/providers");
  if (!configUrl) return jsonError("OpenCode server not configured", 400);
  const configResp = await fetch(configUrl, {
    headers: {
      ...buildOpenCodeHeaders(auth),
    },
    cache: "no-store",
  });

  if (!configResp.ok) {
    const text = await configResp.text();
    return jsonError(text || "OpenCode providers fetch failed", configResp.status);
  }

  const data = await configResp.json();
  return Response.json(data);
}
