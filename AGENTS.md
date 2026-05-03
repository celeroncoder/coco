# AGENTS.md

Operational notes for agents working in this repo.

## Stack

- **Monorepo**: Turborepo, bun workspaces.
- **Apps**: `apps/web` — Next.js 16 (App Router), React 19, Tailwind CSS v4.
- **Shared packages**: `packages/convex` — Convex backend, consumable by any app.
- **API**: tRPC v11 with `@trpc/tanstack-react-query` (server-side prefetch + client hydration).
- **Auth**: Clerk (`@clerk/nextjs`), JWT-bridged into Convex via `convex/react-clerk`.
- **UI**: AlignUI v1.2 (Tailwind v4 token-based, prefix `ali`).
- **Env**: `@t3-oss/env-nextjs` with split `server.ts` / `client.ts`.

## Commands

```bash
bun install               # install all workspace deps
bun run dev               # turbo dev (runs all apps)
bun run build
bun run typecheck

# web app
bun --filter @coco/web dev

# convex (run from anywhere)
bun --filter @coco/convex dev    # provisions Convex + writes packages/convex/.env.local
```

## First-time setup

Provision the Convex deployment from the shared package:

```bash
cd packages/convex
bunx convex dev
```

This writes `CONVEX_DEPLOYMENT` and `CONVEX_URL` into `packages/convex/.env.local`, and regenerates `packages/convex/convex/_generated/*` (placeholder types ship in the repo so consumers typecheck before `convex dev` is ever run).

Then add `NEXT_PUBLIC_CONVEX_URL=<value from packages/convex/.env.local>` into `apps/web/.env.local` so the browser client can talk to the deployment.

### Clerk + Convex auth

- `apps/web/proxy.ts` runs `clerkMiddleware()` (Next 16 calls middleware "proxy").
- `ConvexClientProvider` wraps `<ClerkProvider>` around `<ConvexProviderWithClerk client={convex} useAuth={useAuth}>` — Convex receives Clerk JWTs automatically.
- In Convex queries/mutations, get the caller via `await ctx.auth.getUserIdentity()` (returns `null` when unauthenticated).
- In server components, use `auth()` from `@clerk/nextjs/server`; in client components, `useAuth()` / `useUser()` / `useConvexAuth()`.

### AlignUI

AlignUI tokens are already present in `apps/web/app/globals.css` (Blue / Slate / oklch / `ali` prefix). To regenerate, run inside `apps/web`:

```bash
bunx @alignui/cli@latest tailwind
```

## Project layout

```
apps/web/
├── app/
│   ├── api/trpc/[trpc]/route.ts   # tRPC HTTP handler
│   ├── _components/               # route-private client components
│   ├── globals.css                # AlignUI tokens (prefix `ali`)
│   ├── layout.tsx                 # Providers (Convex + tRPC)
│   └── page.tsx                   # Server component, prefetches via trpc.*.queryOptions
└── src/
    ├── components/convex-client-provider.tsx
    ├── env/{server,client}.ts     # t3-env (split for security)
    ├── lib/{utils,polymorphic,recursive-clone-children}.ts(x)
    └── trpc/
        ├── init.ts                # initTRPC + context
        ├── routers/_app.ts        # appRouter
        ├── query-client.ts
        ├── client.tsx             # TRPCReactProvider, useTRPC
        ├── server.tsx             # server-only proxy + getQueryClient
        └── hydrate-client.tsx

packages/convex/
├── convex/
│   ├── _generated/                # `convex dev` writes here (placeholders shipped)
│   ├── schema.ts
│   └── tasks.ts
├── index.ts                       # re-exports api, internal, DataModel, Doc, Id
└── package.json                   # exports: ".", "./api", "./schema", "./dataModel"
```

## Icons

The project uses **`symbols-react`** (SF Symbols for web, via [symbols.dev](https://symbols.dev)) as the **sole icon library**.

- Import icons from `@/components/icons` (the wrapper at `apps/web/src/components/icons.tsx`), never from `lucide-react` or any other icon library.
- `lucide-react` is not installed. Do not add it back.
- When a new page or component needs an icon: find the closest SF Symbol in `symbols-react`, add a named export to `apps/web/src/components/icons.tsx` via the `wrap()` helper, then import it from `@/components/icons`.
- The wrapper accepts `size`, `strokeWidth` (ignored — SF Symbols are filled), and all standard SVG props incl. `className`.

## Conventions

- Path aliases (web): `~/*` and `@/*` both resolve to `apps/web/src/*`.
- Env imports: `~/env/server` (server-only) or `~/env/client` (safe in client). Never read `process.env.*` directly outside of these files.
- Convex consumers import `api` from `@coco/convex`:
  ```ts
  import { api } from "@coco/convex";
  // or, granular: import { api } from "@coco/convex/api";
  ```
- tRPC server prefetch pattern (preferred for App Router pages):
  ```tsx
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.foo.queryOptions(input));
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FooClient />
    </HydrationBoundary>
  );
  ```

## tRPC: Server Actions vs Mutations

Source: <https://trpc.io/docs/client/nextjs/server-actions#when-to-use-server-actions-vs-mutations>

Use **Server Actions** when:
- Form needs progressive enhancement (works without JS).
- The mutation's result does not need to be merged into client React Query cache.
- You want to call the procedure as a plain async function from a client component.

Use **`useMutation`** (regular tRPC mutation) when:
- You need optimistic updates or cache invalidation tied to a query key.
- You need fine-grained loading/error UI per call site.
- You are already using React Query state for the surrounding flow.

The two are not exclusive — adopt server actions incrementally; the rest of the API stays as normal tRPC procedures.

## Adding env vars

1. Add to `.env.example` (root, plus app/package as needed).
2. Add to `apps/web/src/env/server.ts` (server-only) **or** `client.ts` (must be `NEXT_PUBLIC_*`).
3. For client vars, also list them in `runtimeEnv`.
4. Import via `~/env/server` or `~/env/client`.

## Adding a tRPC procedure

1. Add to `apps/web/src/trpc/routers/_app.ts` (or compose a sub-router).
2. The type flows automatically via `AppRouter`.
3. Server: prefetch with `trpc.<name>.queryOptions(input)`.
4. Client: `const trpc = useTRPC(); useQuery(trpc.<name>.queryOptions(input))`.

## Adding a Convex function

1. Drop a file in `packages/convex/convex/`.
2. Run `bun --filter @coco/convex dev` (regenerates `_generated/api.ts`).
3. Consumers: `import { api } from "@coco/convex"` and call via `useQuery(api.<file>.<fn>)` from `convex/react`.
4. To gate by user, read `await ctx.auth.getUserIdentity()` inside the handler.
