"use client";

import { UserButton } from "@clerk/nextjs";
import { api } from "@coco/convex/api";
import type { Doc, Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  HardDrive,
  Message,
  Moon,
  Plus,
  Search,
  Settings,
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
import { agentMeta, defaultModeFor } from "~/lib/agents";
import { cn } from "~/lib/utils";
import { Matrix, pulse } from "@/components/ui/matrix";

type Tab = "threads" | "workspace";

export function AppSidebar() {
  const [tab, setTab] = useState<Tab>("threads");
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
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
        <div className="flex rounded-lg bg-muted p-0.5">
          <TabButton active={tab === "threads"} onClick={() => setTab("threads")}>
            Threads
          </TabButton>
          <TabButton
            active={tab === "workspace"}
            onClick={() => setTab("workspace")}
          >
            Workspace
          </TabButton>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {tab === "threads" ? <ThreadsTab /> : <WorkspaceTab />}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/devices"}
              tooltip="Devices"
              render={<Link href="/devices" />}
            >
              <HardDrive size={14} strokeWidth={1.5} />
              <span>Devices</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <FooterUserBar />
      </SidebarFooter>
    </Sidebar>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-background text-foreground shadow-xs"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ThreadsTab() {
  const threads = useQuery(api.threads.list, {});
  const workspaces = useQuery(api.workspaces.list, {});
  const [filter, setFilter] = useState("");
  const pathname = usePathname();

  const groups = useMemo(() => {
    if (!threads || !workspaces) return null;
    const wsById = new Map(workspaces.map((w) => [w._id, w]));
    const filtered = filter
      ? threads.filter((t) =>
          t.title.toLowerCase().includes(filter.toLowerCase()),
        )
      : threads;
    const byWs = new Map<
      string,
      { ws: Doc<"workspaces"> | null; items: Doc<"threads">[] }
    >();
    for (const t of filtered) {
      const ws = wsById.get(t.workspaceId) ?? null;
      const key = ws?._id ?? "__unknown";
      if (!byWs.has(key)) byWs.set(key, { ws, items: [] });
      byWs.get(key)!.items.push(t);
    }
    return Array.from(byWs.values()).sort((a, b) =>
      (a.ws?.name ?? "~").localeCompare(b.ws?.name ?? "~"),
    );
  }, [threads, workspaces, filter]);

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <div className="relative">
          <Search
            size={12}
            strokeWidth={1.5}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Search"
            className="h-8 pl-7 text-xs"
          />
        </div>

        {!groups && (
          <div className="flex items-center p-2">
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
  items,
  activePath,
}: {
  title: string;
  items: Doc<"threads">[];
  activePath: string | null;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? (
          <ChevronDown size={12} strokeWidth={1.5} />
        ) : (
          <ChevronRight size={12} strokeWidth={1.5} />
        )}
        {title}
        <span className="ml-auto">{items.length}</span>
      </button>
      {open && (
        <SidebarMenu>
          {items.map((t) => {
            const active = activePath === `/threads/${t._id}`;
            const meta = agentMeta(t.agent);
            return (
              <SidebarMenuItem key={t._id}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={`${meta?.label ?? t.agent}${t.mode ? ` · ${t.mode}` : ""}`}
                  render={<Link href={`/threads/${t._id}`} />}
                >
                  <Message size={14} strokeWidth={1.5} className="shrink-0" />
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
    </div>
  );
}

function WorkspaceTab() {
  const devices = useQuery(api.devices.list, {});
  const workspaces = useQuery(api.workspaces.list, {});
  const pathname = usePathname();

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/workspaces"}
                tooltip="Manage workspaces"
                render={<Link href="/workspaces" />}
              >
                <FolderTree size={14} strokeWidth={1.5} />
                <span>Manage workspaces</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Workspaces</SidebarGroupLabel>
        <SidebarGroupContent>
          {!workspaces && (
            <div className="flex items-center p-2">
              <Matrix size={3} rows={7} cols={7} frames={pulse} fps={12} />
            </div>
          )}
          {workspaces?.length === 0 && (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              No workspaces.
            </p>
          )}
          <SidebarMenu>
            {workspaces?.map((w) => {
              const device = devices?.find((d) => d._id === w.deviceId);
              return (
                <SidebarMenuItem key={w._id} className="group/ws">
                  <div className="flex items-start gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-sidebar-accent">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="truncate font-medium">{w.name}</div>
                      <div className="truncate font-mono text-[10px] text-muted-foreground">
                        {w.path}
                      </div>
                      {device && (
                        <div className="truncate text-[10px] text-muted-foreground">
                          on {device.name}
                        </div>
                      )}
                    </div>
                    <NewThreadInWorkspace workspaceId={w._id} />
                  </div>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Devices</SidebarGroupLabel>
        <SidebarGroupContent>
          {devices?.map((d) => {
            const online = Date.now() - d.lastSeenAt < 2 * 60_000;
            return (
              <div
                key={d._id}
                className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground"
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    online ? "bg-green-500" : "bg-muted-foreground/50",
                  )}
                />
                <span className="truncate">{d.name}</span>
              </div>
            );
          })}
        </SidebarGroupContent>
      </SidebarGroup>
    </>
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
          <Sun size={14} strokeWidth={1.5} />
        ) : (
          <Moon size={14} strokeWidth={1.5} />
        )}
      </Button>
      <Button variant="ghost" size="icon-xs" aria-label="Settings">
        <Settings size={14} strokeWidth={1.5} />
      </Button>
    </div>
  );
}

function NewThreadInWorkspace({ workspaceId }: { workspaceId: string }) {
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
      className="opacity-0 group-hover/ws:opacity-100 focus-visible:opacity-100"
    >
      <Plus size={14} strokeWidth={1.5} />
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
