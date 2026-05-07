# Agent Cleanup: Remove Non-Claude Backends and OpenCode Integration

### Removed

- Removed Codex agent runner (`apps/daemon/src/agents/codex.ts`)
- Removed OpenCode agent runner (`apps/daemon/src/agents/opencode.ts`) and its server/auto-approve infrastructure
- Removed Pi agent runner (`apps/daemon/src/agents/pi.ts`)
- Removed all OpenCode API routes (`apps/web/app/api/opencode/*`)
- Removed OpenCode client utilities, types, and lib (`apps/web/src/lib/opencode.ts`, `lib/agents.ts`)
- Removed OpenCode environment variables from server config and `.env.example`
- Removed `opencodeSessionId`/`opencodeServerUrl` fields from thread schema
- Removed `COCO_OPENCODE_SERVER` / `OPENCODE_SERVER_*` env support

### Changed

- Simplified agent detection to only detect `claude` and `localterm` binaries
- Simplified agent runner registry to only include Claude
- Trimmed `turbo.json` env vars by removing `OPENCODE_SERVER_URL`
- Exported `localterm` as the only secondary agent binary

---

## Summary of Changes

Stripped out all non-Claude agent backends (Codex, OpenCode, Pi) and their associated infrastructure including server processes, auto-approvers, API routes, client libraries, and database schema fields. The only remaining agent runner is Claude, with `localterm` available for terminal support.

**Files Modified:**

- `apps/daemon/src/agents/codex.ts` - Deleted Codex agent runner
- `apps/daemon/src/agents/detect.ts` - Simplified agent detection
- `apps/daemon/src/agents/index.ts` - Simplified runner registry
- `apps/daemon/src/agents/opencode.ts` - Deleted OpenCode agent runner
- `apps/daemon/src/agents/pi.ts` - Deleted Pi agent runner
- `apps/daemon/src/api.ts` - Updated finishRun to accept plan metadata
- `apps/daemon/src/opencode-auto-approve.ts` - Deleted OpenCode auto-approver
- `apps/daemon/src/opencode-server.ts` - Deleted OpenCode server manager
- `apps/web/.env.example` - Removed OpenCode env vars
- `apps/web/app/api/opencode/*` - Deleted all OpenCode API routes
- `apps/web/app/threads/[id]/_components/index.ts` - Updated exports
- `apps/web/app/threads/[id]/_components/opencode-utils.ts` - Deleted
- `apps/web/app/threads/[id]/_components/types.ts` - Removed OpenCode types
- `apps/web/src/env/server.ts` - Removed OpenCode env vars
- `apps/web/src/lib/agents.ts` - Simplified to Claude only
- `apps/web/src/lib/opencode.ts` - Deleted
- `packages/convex/convex/schema.ts` - Removed OpenCode thread fields, added plans table
- `packages/convex/convex/threads.ts` - Removed setOpenCodeSession mutation
- `turbo.json` - Removed OpenCode env var
