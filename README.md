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
