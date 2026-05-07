"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { api } from "@coco/convex/api";
import type { Doc, Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  Filter,
  Folder,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  X,
  ICON_SIZES,
} from "@/components/icons";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "~/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { defaultModeFor } from "~/lib/agents";
import { useIsMobile } from "~/hooks/use-mobile";

export function AppSidebar() {
  const workspaces = useQuery(api.workspaces.list, {});
  const threads = useQuery(api.threads.list, {});
  const devices = useQuery(api.devices.list, {});
  const { user } = useUser();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceCreateOpen, setWorkspaceCreateOpen] = useState(false);
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  // The workspace of the currently open thread — used for "New Session"
  const activeWsId = useMemo(() => {
    if (!threads || !pathname?.startsWith("/threads/")) return workspaces?.[0]?._id;
    const threadId = pathname.replace("/threads/", "");
    const t = threads.find((th) => th._id === threadId);
    return t?.workspaceId ?? workspaces?.[0]?._id;
  }, [threads, workspaces, pathname]);

  // Group workspaces by device, then filter threads
  const deviceGroups = useMemo(() => {
    if (!devices || !workspaces || !threads) return null;
    const filteredThreads = filter
      ? threads.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase()))
      : threads;
    return devices.map((device) => ({
      device,
      workspaces: workspaces
        .filter((ws) => ws.deviceId === device._id)
        .map((ws) => ({
          ws,
          threads: filteredThreads
            .filter((t) => t.workspaceId === ws._id)
            .sort((a, b) => b._creationTime - a._creationTime),
        })),
    }));
  }, [devices, workspaces, threads, filter]);

  const handleNewSession = () => {
    if (activeWsId) {
      setCreateOpen(true);
    }
  };

  const toggleSearch = () => {
    setSearchOpen((v) => {
      if (!v) setTimeout(() => searchRef.current?.focus(), 50);
      else setFilter("");
      return !v;
    });
  };

  return (
    <>
      <Sidebar variant="inset" collapsible="offcanvas" className="">
        <SidebarHeader className="gap-0 p-0">
          <div className="flex flex-col px-1 pt-3 pb-1">
            {/* New Session */}
            <button
              type="button"
              onClick={handleNewSession}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
              New Session
            </button>

            {/* Add Workspace */}
            <button
              type="button"
              onClick={() => setWorkspaceCreateOpen(true)}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent hover:text-foreground"
            >
              <Plus size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
              Add Workspace
            </button>

            {/* Search row — disabled for now */}
            {/* {searchOpen ? (
              <div className="flex items-center gap-2 px-2.5 py-1">
                <Search size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search sessions…"
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={toggleSearch}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} strokeWidth={1.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleSearch}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Search size={13} strokeWidth={1.5} className="shrink-0" />
                Search
              </button>
            )} */}
          </div>

          {/* Divider + Projects header */}
          <div className="mx-3 mt-2 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
              Projects
            </span>
            {/* <button
              type="button"
              className="text-muted-foreground/40 transition-colors hover:text-muted-foreground"
              title="Filter"
            >
              <Filter size={11} strokeWidth={1.5} />
            </button> */}
          </div>
        </SidebarHeader>

        <SidebarContent className="px-1 pb-2">
          {deviceGroups === null && (
            <p className="px-3 py-2 text-[10px] text-muted-foreground/60">Loading…</p>
          )}
          {deviceGroups?.map(({ device, workspaces }) => (
            <DeviceGroup
              key={device._id}
              device={device}
              workspaces={workspaces}
              pathname={pathname}
              onNavigate={() => isMobile && setOpenMobile(false)}
            />
          ))}
        </SidebarContent>

        <SidebarFooter className="p-0">
          <div className="mx-2 mb-2 h-px bg-border/60" />
          <div className="flex items-center gap-2.5 px-3 pb-3">
            <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
            <span className="flex-1 truncate text-xs font-medium text-foreground">
              {user?.fullName ?? user?.username ?? "Account"}
            </span>
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              title="Toggle theme"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun size={13} strokeWidth={1.5} />
              ) : (
                <Moon size={13} strokeWidth={1.5} />
              )}
            </button>
            <Link
              href="/devices"
              className="shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              title="Settings"
            >
              <Settings size={13} strokeWidth={1.5} />
            </Link>
          </div>
        </SidebarFooter>
      </Sidebar>

      <CreateSessionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        workspaces={workspaces ?? []}
        defaultWsId={activeWsId}
      />

      <AddWorkspaceDialog
        open={workspaceCreateOpen}
        onClose={() => setWorkspaceCreateOpen(false)}
        devices={devices ?? []}
      />
    </>
  );
}

function DeviceGroup({
  device,
  workspaces,
  pathname,
  onNavigate,
}: {
  device: Doc<"devices">;
  workspaces: { ws: Doc<"workspaces">; threads: Doc<"threads">[] }[];
  pathname: string | null;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-1">
      {/* Device header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        {open ? (
          <ChevronDown size={11} strokeWidth={1.5} className="shrink-0" />
        ) : (
          <ChevronRight size={11} strokeWidth={1.5} className="shrink-0" />
        )}
        {formatDeviceName(device.name)}
      </button>

      {open && (
        <div className="mt-0.5">
          {workspaces.map(({ ws, threads }) => (
            <WorkspaceGroup
              key={ws._id}
              ws={ws}
              threads={threads}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
          {workspaces.length === 0 && (
            <p className="py-1 pl-8 text-[10px] text-muted-foreground/40">No workspaces</p>
          )}
        </div>
      )}
    </div>
  );
}

function WorkspaceGroup({
  ws,
  threads,
  pathname,
  onNavigate,
}: {
  ws: Doc<"workspaces">;
  threads: Doc<"threads">[];
  pathname: string | null;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Workspace row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md py-1 pl-5 pr-2.5 text-xs text-foreground/70 transition-colors hover:bg-accent/40 hover:text-foreground"
      >
        <Folder size={13} strokeWidth={1.5} className="shrink-0 text-muted-foreground/60" />
        <span className="flex-1 truncate text-left">{ws.name}</span>
        {threads.length > 0 && (
          open
            ? <ChevronDown size={10} strokeWidth={1.5} className="shrink-0 text-muted-foreground/40" />
            : <ChevronRight size={10} strokeWidth={1.5} className="shrink-0 text-muted-foreground/40" />
        )}
      </button>

      {/* Thread list under workspace */}
      {open && threads.length > 0 && (
        <div className="mb-1">
          {threads.map((t) => {
            const isActive = pathname === `/threads/${t._id}`;
            return (
              <Link
                key={t._id}
                href={`/threads/${t._id}`}
                onClick={onNavigate}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md py-1 pl-10 pr-2.5 transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-xs",
                    isActive && "font-medium",
                  )}
                >
                  {t.title}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground/50">
                  {formatRelative(t._creationTime)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CreateSessionDialog({
  open,
  onClose,
  workspaces,
  defaultWsId,
}: {
  open: boolean;
  onClose: () => void;
  workspaces: Doc<"workspaces">[];
  defaultWsId: string | undefined;
}) {
  const create = useMutation(api.threads.create);
  const router = useRouter();
  const [wsId, setWsId] = useState<string>(defaultWsId ?? "");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (defaultWsId && !wsId) setWsId(defaultWsId);
  }, [defaultWsId, wsId]);

  useEffect(() => {
    if (open && defaultWsId) setWsId(defaultWsId);
  }, [open, defaultWsId]);

  const submit = async () => {
    if (!wsId || busy) return;
    setBusy(true);
    try {
      const id = await create({
        workspaceId: wsId as Id<"workspaces">,
        agent: "claude",
        mode: defaultModeFor("claude"),
        title: "Claude Code session",
      });
      onClose();
      router.push(`/threads/${id}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New session</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 pt-1">
          {workspaces.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Workspace
              </label>
              <select
                value={wsId}
                onChange={(e) => setWsId(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
              >
                {workspaces.map((ws) => (
                  <option key={ws._id} value={ws._id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={!wsId || busy}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDeviceName(name: string): string {
  const short = name.split("-")[0] ?? name;
  // Add ellipsis only when the full name is longer than the limit
  const limit = 15;
  return name.length > limit ? (short.slice(0, limit) + "…") : short;
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

function AddWorkspaceDialog({
  open,
  onClose,
  devices,
}: {
  open: boolean;
  onClose: () => void;
  devices: Doc<"devices">[];
}) {
  const create = useMutation(api.workspaces.create);
  const [deviceId, setDeviceId] = useState(devices[0]?._id ?? "");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setDeviceId(devices[0]?._id ?? "");
      setName("");
      setPath("");
    }
  }, [open, devices]);

  const submit = async () => {
    if (!deviceId || !name || !path || busy) return;
    setBusy(true);
    try {
      await create({
        deviceId: deviceId as Id<"devices">,
        name,
        path,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add workspace</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Device
            </label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground"
            >
              {devices.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Path
            </label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/you/code/project"
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={!deviceId || !name || !path || busy}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
