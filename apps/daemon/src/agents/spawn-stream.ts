import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export type SpawnStreamOptions = {
  cmd: string;
  args: string[];
  cwd: string;
  env?: Record<string, string | undefined>;
  stdin?: string;
  signal: AbortSignal;
};

export type SpawnStreamLine = {
  stream: "stdout" | "stderr";
  text: string;
};

export class SpawnStreamError extends Error {
  constructor(
    public readonly code: number | null,
    public readonly signalName: NodeJS.Signals | null,
    public readonly stderrTail: string,
  ) {
    super(
      stderrTail
        ? `process exited (${code ?? signalName}): ${stderrTail}`
        : `process exited (${code ?? signalName})`,
    );
  }
}

/** Spawns a CLI and yields one logical line per chunk from stdout/stderr. */
export async function* spawnLines(
  opts: SpawnStreamOptions,
): AsyncGenerator<SpawnStreamLine> {
  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn(opts.cmd, opts.args, {
      cwd: opts.cwd,
      env: { ...process.env, ...(opts.env ?? {}) },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`failed to spawn '${opts.cmd}': ${msg}`);
  }

  const onAbort = () => {
    if (!child.killed) child.kill("SIGTERM");
  };
  opts.signal.addEventListener("abort", onAbort, { once: true });

  if (opts.stdin !== undefined) {
    child.stdin.end(opts.stdin);
  } else {
    child.stdin.end();
  }

  const queue: SpawnStreamLine[] = [];
  let resolveNext: (() => void) | null = null;
  let finished = false;
  type ExitInfo = { code: number | null; signal: NodeJS.Signals | null };
  const state: { exit: ExitInfo | null; error: Error | null } = {
    exit: null,
    error: null,
  };
  const stderrChunks: string[] = [];

  const wake = () => {
    if (resolveNext) {
      const r = resolveNext;
      resolveNext = null;
      r();
    }
  };

  const buffers = { stdout: "", stderr: "" };
  const onData = (which: "stdout" | "stderr") => (data: Buffer) => {
    const text = data.toString("utf8");
    buffers[which] += text;
    if (which === "stderr") {
      stderrChunks.push(text);
      if (stderrChunks.length > 50) stderrChunks.shift();
    }
    let nl: number;
    while ((nl = buffers[which].indexOf("\n")) !== -1) {
      const line = buffers[which].slice(0, nl);
      buffers[which] = buffers[which].slice(nl + 1);
      queue.push({ stream: which, text: line });
    }
    wake();
  };

  child.stdout.on("data", onData("stdout"));
  child.stderr.on("data", onData("stderr"));
  child.on("error", (err) => {
    state.error = err;
    finished = true;
    wake();
  });
  child.on("close", (code, sig) => {
    if (buffers.stdout)
      queue.push({ stream: "stdout", text: buffers.stdout });
    if (buffers.stderr)
      queue.push({ stream: "stderr", text: buffers.stderr });
    buffers.stdout = "";
    buffers.stderr = "";
    state.exit = { code, signal: sig };
    finished = true;
    wake();
  });

  try {
    while (true) {
      if (queue.length > 0) {
        yield queue.shift()!;
        continue;
      }
      if (finished) break;
      await new Promise<void>((resolve) => {
        resolveNext = resolve;
      });
    }
  } finally {
    opts.signal.removeEventListener("abort", onAbort);
    if (!child.killed) {
      try {
        child.kill("SIGTERM");
      } catch {}
    }
  }

  if (state.error) throw state.error;
  if (state.exit && state.exit.code !== 0 && state.exit.code !== null) {
    const tail = stderrChunks.join("").trim().slice(-500);
    throw new SpawnStreamError(state.exit.code, state.exit.signal, tail);
  }
}
