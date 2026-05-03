// Subscribes to the local opencode server's SSE event stream and auto-approves
// every permission request, so opencode behaves like claude's bypass mode.

const RECONNECT_MS = 2000;

export function startOpencodeAutoApprover(opts: {
  hostname: string;
  port: string;
}): { stop: () => void } {
  const base = `http://${opts.hostname}:${opts.port}`;
  let stopping = false;
  let ac: AbortController | null = null;
  let retryTimer: NodeJS.Timeout | null = null;

  const connect = async () => {
    if (stopping) return;
    ac = new AbortController();
    try {
      const resp = await fetch(`${base}/event`, {
        headers: { Accept: "text/event-stream" },
        signal: ac.signal,
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`event stream ${resp.status}`);
      }
      console.log("[opencode-auto] subscribed to permission stream");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (!stopping) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const payload = chunk
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim())
            .join("\n")
            .trim();
          if (!payload) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(payload) as Record<string, unknown>;
          } catch {
            continue;
          }
          await maybeApprove(base, evt);
        }
      }
    } catch (err) {
      if (stopping) return;
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("aborted")) {
        console.warn(`[opencode-auto] stream error: ${msg} (reconnecting)`);
      }
    } finally {
      ac = null;
      if (!stopping) retryTimer = setTimeout(connect, RECONNECT_MS);
    }
  };

  void connect();

  return {
    stop: () => {
      stopping = true;
      if (retryTimer) clearTimeout(retryTimer);
      ac?.abort();
    },
  };
}

async function maybeApprove(base: string, evt: Record<string, unknown>) {
  const t = String(evt.type ?? "");
  if (
    t !== "permission.request" &&
    t !== "permission.requested" &&
    t !== "permission" &&
    t !== "session.permission.requested"
  ) {
    return;
  }
  const props = (evt.properties as Record<string, unknown>) ?? {};
  const req = (props.permission ?? props ?? evt) as Record<string, unknown>;

  const sessionId = String(
    props.sessionId ??
      props.sessionID ??
      props.session_id ??
      evt.sessionId ??
      evt.sessionID ??
      "",
  );
  const permissionId = String(
    req.permissionId ?? req.permissionID ?? evt.permissionId ?? "",
  );
  if (!sessionId || !permissionId) return;

  try {
    const resp = await fetch(
      `${base}/session/${sessionId}/permissions/${permissionId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: "always", remember: true }),
      },
    );
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      console.warn(
        `[opencode-auto] approve failed (${resp.status}): ${text.slice(0, 200)}`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[opencode-auto] approve error: ${msg}`);
  }
}
