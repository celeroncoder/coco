"use client";

import { UserButton } from "@clerk/nextjs";
import { api } from "@coco/convex/api";
import type { Doc, Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  HardDrive,
  ICON_SIZES,
  MessageCircle,
  Moon,
  Plus,
  Search,
  Sun,
} from "@/components/icons";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { env } from "~/env/client";
import { agentMeta, defaultModeFor } from "~/lib/agents";
import { cn } from "~/lib/utils";
import { loader, Matrix, pulse } from "@/components/ui/matrix";

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <Link href="/" passHref>
        <div className="flex items-center gap-2 px-1 py-1">
          <div className="flex size-7 items-center justify-center rounded-md dark:bg-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons8-coco-30.png"
              alt="coco"
              className="size-5 object-contain"
              />
          </div>
          <span className="font-display text-sm font-medium tracking-tight">
            coco
          </span>
        </div>
              </Link>
      </SidebarHeader>

      <SidebarContent>
        <ThreadsSection />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/devices"}
              tooltip="Devices"
              render={<Link href="/devices" />}
            >
              <HardDrive size={ICON_SIZES.md} strokeWidth={1.5} />
              <span>Devices</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <FooterUserBar />
      </SidebarFooter>
    </Sidebar>
  );
}

function ThreadsSection() {
  const threads = useQuery(api.threads.list, {});
  const workspaces = useQuery(api.workspaces.list, {});
  const [filter, setFilter] = useState("");
  const pathname = usePathname();

  const groups = useMemo(() => {
    if (!threads || !workspaces) return null;
    const filtered = filter
      ? threads.filter((t) =>
          t.title.toLowerCase().includes(filter.toLowerCase()),
        )
      : threads;
    const byWs = new Map<
      string,
      { ws: Doc<"workspaces"> | null; items: Doc<"threads">[] }
    >(workspaces.map((w) => [w._id, { ws: w, items: [] }]));
    const unknown = { ws: null, items: [] as Doc<"threads">[] };
    for (const t of filtered) {
      const bucket = byWs.get(t.workspaceId);
      if (bucket) {
        bucket.items.push(t);
      } else {
        unknown.items.push(t);
      }
    }
    const result = Array.from(byWs.values()).sort((a, b) =>
      (a.ws?.name ?? "~").localeCompare(b.ws?.name ?? "~"),
    );
    if (unknown.items.length > 0) {
      result.push(unknown);
    }
    return result;
  }, [threads, workspaces, filter]);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <div className="relative w-full">
          <Search
            size={ICON_SIZES.sm}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search threads"
            className="h-8 pl-7 text-xs"
          />
        </div>

        {!groups && (
          <div className="flex items-center p-2 justify-center py-10">
            <Matrix size={3} rows={7} cols={7} frames={pulse} fps={12} />
          </div>
        )}

        {groups && groups.length === 0 && (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No threads yet.
          </p>
        )}

        {groups?.map(({ ws, items }) => (
          <ThreadGroup
            key={ws?._id ?? "unknown"}
            title={ws?.name ?? "Other"}
            workspaceId={ws?._id}
            items={items}
            activePath={pathname}
          />
        ))}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function ThreadGroup({
  title,
  workspaceId,
  items,
  activePath,
}: {
  title: string;
  workspaceId?: string;
  items: Doc<"threads">[];
  activePath: string | null;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-2 py-1">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
        >
          {open ? (
            <ChevronDown size={ICON_SIZES.sm} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={ICON_SIZES.sm} strokeWidth={1.5} />
          )}
          <span className="truncate">{title}</span>
        </button>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
        {workspaceId && (
          <NewThreadInWorkspace
            workspaceId={workspaceId}
            className="opacity-100"
          />
        )}
      </div>
      {open && (
        <SidebarMenu>
          {items.map((t) => {
            const active = activePath === `/threads/${t._id}`;
            const meta = agentMeta(t.agent);
            const isClaude = t.agent === "claude";
            return (
              <SidebarMenuItem key={t._id}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={`${meta?.label ?? t.agent}${t.mode ? ` · ${t.mode}` : ""}`}
                  render={<Link href={`/threads/${t._id}`} />}
                  size="sm"
                >
                  {isClaude ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://img.logo.dev/claudeai.com?token=${env.NEXT_PUBLIC_LOGO_DEV_TOKEN}&background=transparent`}
                      alt="Claude logo"
                      className="size-5 shrink-0 rounded-sm backdrop-invert"
                    />
                  ) : (
                    <MessageCircle
                      size={ICON_SIZES.md}
                      strokeWidth={1.5}
                      className="shrink-0"
                    />
                  )}
                  <span className="flex-1 truncate text-xs">{t.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatRelative(t._creationTime)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      )}
      {open && items.length === 0 && (
        <div className="px-2 py-1 text-[10px] text-muted-foreground">
          No threads yet.
        </div>
      )}
    </div>
  );
}

function FooterUserBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <div className="flex items-center gap-2 px-2 py-1.5">
      <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
      <span className="flex-1 text-xs text-muted-foreground">Account</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Toggle theme"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      >
        {mounted && resolvedTheme === "dark" ? (
          <Sun size={ICON_SIZES.sm} strokeWidth={1.5} />
        ) : (
          <Moon size={ICON_SIZES.sm} strokeWidth={1.5} />
        )}
      </Button>
    </div>
  );
}

function NewThreadInWorkspace({
  workspaceId,
  className,
}: {
  workspaceId: string;
  className?: string;
}) {
  const create = useMutation(api.threads.create);
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await create({
        workspaceId: workspaceId as Id<"workspaces">,
        agent: "claude",
        mode: defaultModeFor("claude"),
        title: "Claude Code session",
      });
      router.push(`/threads/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label="New Claude Code thread"
      disabled={busy}
      onClick={start}
      className={cn(
        "opacity-0 group-hover/ws:opacity-100 focus-visible:opacity-100",
        className,
      )}
    >
      <Plus size={ICON_SIZES.md} strokeWidth={1.5} />
    </Button>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}
