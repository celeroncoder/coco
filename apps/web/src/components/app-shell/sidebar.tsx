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
  X,
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
  useSidebar,
} from "~/components/ui/sidebar";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { env } from "~/env/client";
import { agentMeta, defaultModeFor } from "~/lib/agents";
import { cn } from "~/lib/utils";
import { loader, Matrix, pulse } from "@/components/ui/matrix";
import { useIsMobile } from "~/hooks/use-mobile";

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <Link href="/" passHref className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-md dark:bg-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons8-coco-30.png"
                alt="coco"
                className="size-5 object-contain"
              />
            </div>
            <span className="font-display text-sm font-medium tracking-tight group-data-[collapsible=icon]:hidden">
              coco
            </span>
          </Link>
          {isMobile && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close sidebar"
              onClick={() => setOpenMobile(false)}
            >
              <X size={ICON_SIZES.lg} strokeWidth={2} />
            </Button>
          )}
        </div>
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
              <span className="group-data-[collapsible=icon]:hidden">Devices</span>
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
  const isMobile = useIsMobile();

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
        <div className="relative w-full group-data-[collapsible=icon]:hidden">
          <Search
            size={isMobile ? ICON_SIZES.md : ICON_SIZES.sm}
            strokeWidth={1.5}
            className={cn(
              "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground",
            )}
          />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search threads"
            className={cn(
              "pl-7 text-xs",
              isMobile ? "h-10" : "h-8",
            )}
          />
        </div>

        {!groups && (
          <div className="flex items-center p-2 justify-center py-10">
            <Matrix size={3} rows={7} cols={7} frames={pulse} fps={12} />
          </div>
        )}

        {groups && groups.length === 0 && (
          <p className={cn(
            "px-2 py-1 text-muted-foreground group-data-[collapsible=icon]:hidden",
            isMobile ? "text-sm" : "text-xs",
          )}>
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
  const isMobile = useIsMobile();
  
  return (
    <div className="flex flex-col">
      <div className={cn(
        "flex items-center gap-2 px-2 group-data-[collapsible=icon]:hidden",
        isMobile ? "h-11 py-1.5" : "py-1",
      )}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-1.5 font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground",
            isMobile ? "text-xs" : "text-[10px]",
          )}
        >
          {open ? (
            <ChevronDown size={ICON_SIZES.sm} strokeWidth={1.5} />
          ) : (
            <ChevronRight size={ICON_SIZES.sm} strokeWidth={1.5} />
          )}
          <span className="truncate">{title}</span>
        </button>
        <span className={cn(
          "text-muted-foreground group-data-[collapsible=icon]:hidden",
          isMobile ? "text-xs" : "text-[10px]",
        )}>{items.length}</span>
        {workspaceId && (
          <NewThreadInWorkspace
            workspaceId={workspaceId}
            className={cn(isMobile ? "opacity-100" : undefined)}
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
                  className={cn(
                    isMobile && "h-11",
                  )}
                >
                  {isClaude ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://img.logo.dev/claudeai.com?token=${env.NEXT_PUBLIC_LOGO_DEV_TOKEN}&background=transparent`}
                      alt="Claude logo"
                      className={cn(
                        "shrink-0 rounded-sm backdrop-invert",
                        isMobile ? "size-6" : "size-5",
                      )}
                    />
                  ) : (
                    <MessageCircle
                      size={ICON_SIZES.md}
                      strokeWidth={1.5}
                      className="shrink-0"
                    />
                  )}
                  <span className={cn(
                    "flex-1 truncate group-data-[collapsible=icon]:hidden",
                    isMobile ? "text-sm" : "text-xs",
                  )}>{t.title}</span>
                  <span className={cn(
                    "shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden",
                    isMobile ? "text-xs" : "text-[10px]",
                  )}>
                    {formatRelative(t._creationTime)}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      )}
      {open && items.length === 0 && (
        <div className={cn(
          "px-2 py-1 text-muted-foreground group-data-[collapsible=icon]:hidden",
          isMobile ? "text-xs" : "text-[10px]",
        )}>
          No threads yet.
        </div>
      )}
    </div>
  );
}

function FooterUserBar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => setMounted(true), []);
  return (
    <div className={cn(
      "flex items-center gap-2 px-2",
      isMobile ? "h-11 py-1.5" : "py-1.5",
    )}>
      <UserButton appearance={{ elements: { avatarBox: cn(isMobile ? "size-8" : "size-7") } }} />
      <span className={cn(
        "flex-1 text-muted-foreground group-data-[collapsible=icon]:hidden",
        isMobile ? "text-sm" : "text-xs",
      )}>Account</span>
      <Button
        type="button"
        variant="ghost"
        size={isMobile ? "icon-sm" : "icon-xs"}
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
  const isMobile = useIsMobile();

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
      size={isMobile ? "icon-sm" : "icon-xs"}
      aria-label="New Claude Code thread"
      disabled={busy}
      onClick={start}
      className={cn(
        isMobile
          ? "opacity-100"
          : "opacity-0 group-hover/ws:opacity-100 focus-visible:opacity-100",
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
