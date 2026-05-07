export type Auth = { deviceId: string; deviceToken: string };

export type PendingRun = {
  _id: string;
  threadId: string;
  agent: string;
  mode?: string;
  model?: string;
  workspacePath: string;
  prompt: string;
  history: { role: "user" | "assistant" | "system"; text: string }[];
  skills: { name: string; path?: string }[];
};

export class CocoApi {
  constructor(public readonly serverUrl: string) {}

  private headers(auth?: Auth): Record<string, string> {
    const h: Record<string, string> = { "content-type": "application/json" };
    if (auth) {
      h["authorization"] = `Bearer ${auth.deviceToken}`;
      h["x-device-id"] = auth.deviceId;
    }
    return h;
  }

  private async request<T>(
    path: string,
    init: RequestInit & { auth?: Auth } = {},
  ): Promise<T> {
    const { auth, ...rest } = init;
    let res: Response;
    try {
      res = await fetch(`${this.serverUrl}${path}`, {
        ...rest,
        headers: { ...this.headers(auth), ...(rest.headers as object) },
      });
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Cannot reach coco server at ${this.serverUrl} (${cause}). ` +
          `Set COCO_SERVER or pass --server <url>.`,
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status} ${path}: ${text}`);
    }
    return (await res.json()) as T;
  }

  pairCreate(input: { deviceName: string; platform: string }) {
    return this.request<{ code: string; expiresAt: number }>(
      "/api/daemon/pair/create",
      { method: "POST", body: JSON.stringify(input) },
    );
  }

  pairPoll(code: string, signal?: AbortSignal) {
    return this.request<
      | { status: "pending" | "expired" | "not_found" }
      | { status: "claimed"; deviceId: string; deviceToken: string }
    >(`/api/daemon/pair/poll?code=${encodeURIComponent(code)}`, { signal });
  }

  heartbeat(auth: Auth, installedAgents?: string[]) {
    return this.request<{ ok: true }>("/api/daemon/heartbeat", {
      method: "POST",
      auth,
      body: JSON.stringify(installedAgents ? { installedAgents } : {}),
    });
  }

  syncSkills(
    auth: Auth,
    skills: { name: string; description?: string; path: string }[],
  ) {
    return this.request<{ ok: true }>("/api/daemon/skills", {
      method: "POST",
      auth,
      body: JSON.stringify({ skills }),
    });
  }

  pollPendingRun(auth: Auth, signal?: AbortSignal) {
    return this.request<{ run: PendingRun | null }>(
      "/api/daemon/runs/pending",
      { auth, signal },
    );
  }

  doctor(auth: Auth) {
    return this.request<{
      ok: true;
      deviceId: string;
      workspaces: { _id: string; name: string; path: string }[];
      queued: {
        count: number;
        runs: {
          _id: string;
          agent: string;
          mode?: string;
          workspacePath: string;
          prompt: string;
        }[];
      };
    }>("/api/daemon/doctor", { auth });
  }

  claimRun(auth: Auth, runId: string) {
    return this.request<{ ok: boolean }>("/api/daemon/runs/claim", {
      method: "POST",
      auth,
      body: JSON.stringify({ runId }),
    });
  }

  appendEvent(
    auth: Auth,
    runId: string,
    event: { type: string; text?: string },
  ) {
    return this.request<{ ok: true }>("/api/daemon/runs/event", {
      method: "POST",
      auth,
      body: JSON.stringify({ runId, event }),
    });
  }

  checkRunCancelled(auth: Auth, runId: string) {
    return this.request<{ cancelled: boolean }>(
      `/api/daemon/runs/${runId}/cancelled`,
      { auth },
    );
  }

  finishRun(
    auth: Auth,
    runId: string,
    status: "done" | "error",
    error?: string,
    planPath?: string,
    planContent?: string,
  ) {
    const body: Record<string, unknown> = { runId, status };
    if (error != null) body.error = error;
    if (planPath != null) body.planPath = planPath;
    if (planContent != null) body.planContent = planContent;
    return this.request<{ ok: true }>("/api/daemon/runs/finish", {
      method: "POST",
      auth,
      body: JSON.stringify(body),
    });
  }
}
