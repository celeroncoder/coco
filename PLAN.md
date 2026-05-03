# Plan: Local Agent Daemon + Web Pairing

## Goal

A local daemon that runs on a user's machine, pairs to their web account, and
acts as a remote-controlled agent runner. The web app drives prompts; the
daemon spawns local CLI agents (Claude Code, Codex, Pi, etc. via
[`spawn-agent`](https://github.com/millionco/spawn-agent)) inside user-defined
workspace paths, optionally with skills from `$HOME/.agents/skills`, and
streams events back into Convex so the web UI shows a live transcript.

## Components

### 1. `packages/convex` (backend / source of truth)

New tables:

| Table          | Fields                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| `devices`      | `userId`, `name`, `token` (random), `lastSeenAt`, `platform`                                  |
| `pairingCodes` | `code` (8 chars), `deviceName`, `platform`, `createdAt`, `expiresAt`, `claimedByUserId?`, `deviceId?` |
| `workspaces`   | `userId`, `deviceId`, `name`, `path`                                                          |
| `skills`       | `deviceId`, `name`, `description?`, `path`                                                    |
| `threads`      | `userId`, `workspaceId`, `agent`, `title`, `createdAt`                                        |
| `messages`     | `threadId`, `role` (user / assistant / system), `text`, `createdAt`                           |
| `runs`         | `threadId`, `messageId`, `deviceId`, `agent`, `workspacePath`, `skills[]`, `prompt`, `status` (queued / running / done / error), `error?`, `events[]` (`{type,text,ts}`) |

Functions (split into `daemon.ts`, `pairing.ts`, `workspaces.ts`,
`skills.ts`, `threads.ts`, `runs.ts`):

- **Pairing**
  - `pairing.createCode` (mutation, public) — daemon calls; returns `{code, expiresAt}`. Stores pairing row (no user yet).
  - `pairing.claim` (mutation, Clerk auth) — web calls with code; creates `device` row, returns `deviceToken` to web (web passes back to daemon? — see flow). We pass token via the pairingCode row instead: claim writes `deviceId` + `token` onto the row, daemon polls by `code` to retrieve it.
  - `pairing.poll` (query, public, by `code`) — daemon polls until `claimedByUserId` set; returns `{deviceId, token}` then.
- **Device-authenticated** (all take `{ deviceId, token }` and verify):
  - `daemon.heartbeat` — updates `lastSeenAt`.
  - `daemon.listWorkspaces` — workspaces for this device.
  - `daemon.upsertSkills` — daemon scans `~/.agents/skills` and pushes the list.
  - `daemon.pendingRun` (query, reactive) — returns next queued run for this device.
  - `runs.claim` — flips `queued → running`.
  - `runs.appendEvent` — pushes onto `events[]`.
  - `runs.finish` — sets `done` / `error`.
- **User-authenticated** (Clerk):
  - `devices.list`
  - `workspaces.{list,create,update,remove}`
  - `skills.listForDevice`
  - `threads.{list,create}`
  - `threads.send` — appends a user `message`, creates a `run` (queued).
  - `threads.messages`, `threads.run` — reactive queries for the thread page.

### 2. `apps/daemon` (new package)

Bun-runnable CLI. Commands:

- `coco-agent pair` — calls `pairing.createCode`, prints code + URL, polls `pairing.poll`. On success, writes `{deviceId, token, convexUrl}` to `~/.coco/config.json`.
- `coco-agent start` (default) — connects to Convex (WS reactive client), heartbeats, syncs skills from `$HOME/.agents/skills`, subscribes to `daemon.pendingRun`. For each run: claim, look up workspace path locally, call `spawnAgent(agent, { cwd, systemPrompt })` via Vercel AI SDK `streamText`, stream chunks → `runs.appendEvent`, on close → `runs.finish`.
- `coco-agent workspaces add <name> <path>` — convenience to create workspace via mutation.

Uses:
- `spawn-agent` + `ai` for spawning + streaming.
- `convex/browser` `ConvexClient` (WS) for reactivity.
- `commander` for CLI ergonomics.

### 3. `apps/web` (UI)

Minimal new routes (App Router pages, all under SignedIn):

- `/devices` — list devices, "Pair new device" button (modal that asks user to type the code shown by the daemon, calls `pairing.claim`).
- `/workspaces` — list / create / edit workspaces (per device).
- `/threads` — list threads, create new thread (pick device, workspace, agent).
- `/threads/[id]` — chat UI: messages list + composer with skill picker; live-streams the in-progress run via `useQuery`.

All UI uses Convex `useQuery` / `useMutation` directly (no tRPC needed for the
agent surface). Keep AlignUI tokens — minimal styling.

## Data flow (one prompt)

```
web /threads/[id]   →  threads.send  →  inserts message + run (queued)
                                       ↓
daemon (subscribed) ← daemon.pendingRun (reactive)
daemon: runs.claim → spawnAgent(...).textStream
   loop:  runs.appendEvent({type:"text-delta", text})
        end: runs.finish({status:"done"})
                                       ↓
web /threads/[id]   ← reactive query of run.events  → render stream
```

## Non-goals (for v1)

- No tool-call UI rendering (we just emit text deltas).
- No file diff / permission UX in web (daemon uses `auto-allow`).
- No multi-turn ACP session reuse — each prompt is a fresh `streamText`.
- No skill content sync to Convex; we only store names + paths the daemon
  reports, and pass selected skill names back as a system-prompt addition for
  the agent.

## Execution order

1. Convex schema + functions.
2. Daemon package skeleton, pairing, run loop with `spawn-agent`.
3. Web pages: devices/pair, workspaces, threads list, thread detail.
4. Smoke test end-to-end.
