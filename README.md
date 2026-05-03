# coco

Pair a local machine, pick a workspace, and run local CLI agents (Claude Code, Codex, etc.) from the web. Responses stream back live.

## Architecture

```
Web UI (Next.js 16)  <-->  Convex (backend)  <-->  Daemon (Bun CLI on your machine)
```

- **Web App** (`apps/web`) -- Manage devices, workspaces, and threads. Send prompts and watch responses stream in real-time.
- **Daemon** (`apps/daemon`) -- Runs on your local machine. Pairs via a code, listens for pending runs, spawns CLI agents, and streams results back.
- **Backend** (`packages/convex`) -- Convex-powered backend. Source of truth for devices, workspaces, threads, runs, and events.

## Tech Stack

- **Monorepo**: Turborepo + Bun workspaces
- **Frontend**: Next.js 16, React 19, Tailwind CSS v4 + AlignUI, tRPC v11
- **Backend**: Convex (schema-driven serverless)
- **Auth**: Clerk (JWT bridged to Convex)
- **Daemon**: Bun CLI + Vercel AI SDK + `spawn-agent`

## Features

- **Device pairing** -- Generate a code on the daemon, enter it in the web UI to link your machine
- **Workspaces** -- Define local directories where agents run
- **Threads** -- Chat-style conversations with agents, scoped to a workspace
- **Live streaming** -- Responses stream from local CLI agents to the web UI in real-time
- **Skills** -- Auto-scan `~/.agents/skills` and inject them as system prompt additions

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) 1.3.13+
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.com) account

### Setup

```bash
# Install dependencies
bun install

# Provision Convex backend (one-time)
bun --filter @coco/convex dev
# This writes CONVEX_DEPLOYMENT and CONVEX_URL to packages/convex/.env.local

# Configure web app environment
cp apps/web/.env.example apps/web/.env.local
# Fill in:
#   NEXT_PUBLIC_CONVEX_URL   (from packages/convex/.env.local)
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
#   CLERK_SECRET_KEY

# Set CLERK_JWT_ISSUER_DOMAIN in Convex dashboard -> Settings -> Environment Variables

# Start dev servers
bun run dev
```

### Pairing the Daemon

```bash
# Pair your machine (first time)
bun --filter @coco/daemon pair --name "My Machine" --convex-url <CONVEX_URL>
# Enter the printed code in the web UI at /devices

# Start the daemon
bun --filter @coco/daemon start
```

Config is saved to `~/.coco/config.json` after pairing.

## Local Production Build (Web + Daemon)

### Web app (production-like)

```bash
# Build
bun --filter @coco/web build

# Run locally in production mode
cd apps/web
NEXT_PUBLIC_CONVEX_URL=... \
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... \
CLERK_SECRET_KEY=... \
bun run start
```

### Daemon (production-like)

```bash
# Build a local binary
bun --filter @coco/daemon build

# Run the built binary
./apps/daemon/dist/coco-agent pair --server http://localhost:3000
./apps/daemon/dist/coco-agent start
```

Set `COCO_SERVER` to point at your deployed web app if you're not using the `--server` flag.

## Deployment

### Convex

```bash
bun --filter @coco/convex deploy
```

### Web app

This repo assumes a Vercel deploy for `apps/web`. If you deploy elsewhere, use the
same `apps/web` build output.

```bash
cd apps/web
bun run build
bun run start
```

Make sure your production env has:

- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

If you're deploying on Vercel from the repo root, set `CONVEX_DEPLOY_KEY`
so the build can run `convex codegen` (the generated `@coco/convex/api`
files are not committed).

## Release Pipeline

The CI workflow runs on pushes to `main`:

- Builds the daemon into platform binaries and uploads them as workflow artifacts.

On `main`, it also creates a tagged GitHub Release and attaches the daemon
artifacts.

Artifacts show up under the GitHub Actions run as:

- `coco-agent-darwin-arm64.tar.gz`
- `coco-agent-linux-x64.tar.gz`
- `coco-agent-windows-x64.zip`

CI secrets expected by the workflow:

- (none)

To use a built binary locally:

```bash
# macOS / Linux
tar -xzf coco-agent-*.tar.gz
./coco-agent pair --server https://your-app.example.com
./coco-agent start
```

```powershell
# Windows
Expand-Archive coco-agent-windows-x64.zip -DestinationPath .
./coco-agent.exe pair --server https://your-app.example.com
./coco-agent.exe start
```

## Production Checklist

- Convex deployed; `CONVEX_DEPLOYMENT` and `CONVEX_URL` are correct.
- Clerk production keys in place; `CLERK_JWT_ISSUER_DOMAIN` set in Convex env.
- Web app env vars set (see Deployment section).
- `COCO_SERVER` points at the production URL for daemon installs.
- Domain, HTTPS, and CORS verified end-to-end (web + daemon).
- Smoke test: pair a device, create a workspace, start a thread, run a prompt.
- Monitor logs for `apps/web` and Convex, confirm no auth or polling errors.
- Release artifacts downloadable from CI and verified on macOS, Linux, Windows.

## Project Structure

```
coco/
├── apps/
│   ├── web/           # Next.js 16 web app
│   └── daemon/        # Local daemon CLI
├── packages/
│   └── convex/        # Convex backend (schema, functions)
├── turbo.json
└── package.json
```

## Docs

See [AGENTS.md](./AGENTS.md) for layout, conventions, and tRPC/Convex usage.
See [PLAN.md](./PLAN.md) for the implementation roadmap.
