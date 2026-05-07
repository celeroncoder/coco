# Agent Run Stop and Plan Persistence

### Added

- Added `cancelRun` mutation (Convex) allowing users to cancel an active run for a thread by marking it as "Cancelled by user"
- Added `isCancelled` query (Convex) so the daemon can poll and detect user-initiated cancellations
- Added daemon-side periodic polling for cancellation via `checkRunCancelled` API
- Added `/api/daemon/runs/{runId}/cancelled` API route for daemon to poll
- Added `plans` Convex table for persisting Claude plan writes (file path + content)
- Added `planPath`/`planContent` fields to finishRun mutation to save plan files into the plans table
- Added `workspaces.getById` query for fetching a single workspace by ID
- Added stop button (`Square` icon) in Composer that replaces the submit button while a run is active
- Added `isRunning`/`onStop` props to Composer component
- Added `planContent`/`onExpandPlan` props to MessageBubble component
- Added todo list extraction from run events and rendering via TodoPanel/RightSidebar

### Changed

- Daemon `handleRun` now polls every 2s for user cancellation and aborts gracefully
- Daemon `finishRun` sends plan file info for plan-mode runs, which is persisted to Convex
- `thread-detail-client.tsx` refactored: removed all OpenCode state management, replaced with plan/terminal sidebar, workspace context, localterm detection, and cancel run integration
- Run error handling now distinguishes user-cancelled vs. real errors

### Removed

- Removed all OpenCode-specific state, session creation, event backfilling, and permission request handling from thread detail
- Removed `setOpenCodeSession` mutation from threads

---

## Summary of Changes

Implemented user-initiated run cancellation with daemon polling, added plan file persistence from Claude writes to a new Convex `plans` table, and refactored the thread detail client to support a right sidebar for plans/terminal/todos. The Composer gains a stop button, and the MessageBubble + thread-detail-client are simplified by removing all OpenCode integration code.

**Files Modified:**

- `apps/daemon/src/start.ts` - Added cancellation polling, plan file capture, localterm process management
- `apps/daemon/src/api.ts` - Added `checkRunCancelled` API method; updated `finishRun` with plan params
- `apps/web/app/api/daemon/runs/finish/route.ts` - Added plan fields to finish endpoint
- `apps/web/app/api/daemon/runs/[runId]/cancelled/route.ts` - New route for daemon to poll cancellation
- `apps/web/app/threads/[id]/_components/Composer.tsx` - Added stop button for active runs
- `apps/web/app/threads/[id]/_components/MessageBubble.tsx` - Added plan/expand props, removed OpenCode permissions
- `apps/web/app/threads/[id]/thread-detail-client.tsx` - Refactored for cancel, plans, right sidebar, todos
- `packages/convex/convex/runs.ts` - Added cancelRun, isCancelled mutations/queries; updated finish
- `packages/convex/convex/plans.ts` - New plans module with byThread query
- `packages/convex/convex/schema.ts` - Added plans table
- `packages/convex/convex/workspaces.ts` - Added getById query
