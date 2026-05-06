"use client";

import { UserButton } from "@clerk/nextjs";
import { api } from "@coco/convex/api";
import type { Doc, Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Sun,
  ICON_SIZES,
} from "@/components/icons";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "~/components/ui/sidebar";
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

const WS_COLORS = [
  "#1e5c3a",
  "#1a3d6b",
  "#6b2d82",
  "#3d1a7a",
  "#7a1d6e",
  "#0f4f4f",
  "#7a1d1d",
  "#4a5c0d",
  "#1a4f3a",
  "#1d3d82",
  "#7a3d0d",
  "#4a0d5c",
];

function wsColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (name.charCodeAt(i) + ((h << 5) - h)) | 0;
  return WS_COLORS[Math.abs(h) % WS_COLORS.length] ?? WS_COLORS[0]!;
}

export function AppSidebar() {
  const workspaces = useQuery(api.workspaces.list, {});
  const threads = useQuery(api.threads.list, {});
  const devices = useQuery(api.devices.list, {});
  const [selectedWsId, setSelectedWsId] = useState<string | null>(null);
  const [hoveredWsId, setHoveredWsId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!workspaces?.length) return;
    if (threads && pathname?.startsWith("/threads/")) {
      const threadId = pathname.replace("/threads/", "");
      const t = threads.find((th) => th._id === threadId);
      if (t) {
        setSelectedWsId(t.workspaceId);
        return;
      }
    }
    setSelectedWsId((prev) => prev ?? (workspaces[0]?._id ?? null));
  }, [workspaces, threads, pathname]);

  const selectedWs = workspaces?.find((w) => w._id === selectedWsId) ?? null;

  const selectedThreads = useMemo(
    () => threads?.filter((t) => t.workspaceId === selectedWsId) ?? [],
    [threads, selectedWsId],
  );

  const hoveredWs = workspaces?.find((w) => w._id === hoveredWsId) ?? null;

  const hoveredThreads = useMemo(
    () => threads?.filter((t) => t.workspaceId === hoveredWsId).slice(0, 4) ?? [],
    [threads, hoveredWsId],
  );

  const hoveredTotal = useMemo(
    () => threads?.filter((t) => t.workspaceId === hoveredWsId).length ?? 0,
    [threads, hoveredWsId],
  );

  return (
    <>
      <Sidebar collapsible="offcanvas" className="bg-background p-0">
        <div className="flex h-full">
          {/* Left workspace strip */}
          <div className="flex w-[60px] shrink-0 flex-col items-center border-r border-border bg-background">
            {/* Workspace icon list */}
            <div className="flex min-h-0 flex-1 flex-col items-center gap-2.5 overflow-y-auto py-2.5 px-1">
              {workspaces?.map((ws) => {
                const color = wsColor(ws.name);
                const isSelected = ws._id === selectedWsId;
                const isActive = threads?.some(
                  (t) => t.workspaceId === ws._id && pathname === `/threads/${t._id}`,
                );
                return (
                  <div
                    key={ws._id}
                    className="relative shrink-0"
                    onMouseEnter={() => setHoveredWsId(ws._id)}
                    onMouseLeave={() => setHoveredWsId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedWsId(ws._id)}
                      style={{ backgroundColor: color }}
                      className={cn(
                        "relative flex size-9 cursor-pointer select-none items-center justify-center rounded-md text-[11px] font-semibold tracking-wide text-white/90 transition-all",
                        isSelected &&
                          "ring-2 ring-foreground/70 ring-offset-1 ring-offset-background",
                      )}
                    >
                      {ws.name[0]?.toUpperCase()}
                      {isActive && (
                        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full border border-background bg-cyan-400" />
                      )}
                    </button>

                    {/* Hover popup */}
                    {hoveredWsId === ws._id && hoveredWs && (
                      <div className="absolute left-[calc(100%+6px)] top-0 z-50 w-56 rounded-lg border border-border bg-popover p-2.5 shadow-lg">
                        <p className="mb-0.5 text-xs font-medium text-foreground">
                          {hoveredWs.name}
                        </p>
                        <p className="mb-1.5 text-[10px] text-muted-foreground">Recent sessions</p>
                        <div className="flex flex-col gap-0.5">
                          {hoveredThreads.map((t) => (
                            <Link
                              key={t._id}
                              href={`/threads/${t._id}`}
                              onClick={() => setSelectedWsId(ws._id)}
                              className="truncate rounded px-1.5 py-1 text-xs text-foreground/80 hover:bg-accent hover:text-foreground"
                            >
                              {t.title}
                            </Link>
                          ))}
                          {hoveredThreads.length === 0 && (
                            <span className="px-1.5 text-[10px] text-muted-foreground">
                              No sessions yet
                            </span>
                          )}
                        </div>
                        {hoveredTotal > 4 && (
                          <>
                            <div className="my-1.5 h-px bg-border" />
                            <button
                              type="button"
                              onClick={() => setSelectedWsId(ws._id)}
                              className="px-1.5 text-xs text-muted-foreground hover:text-foreground"
                            >
                              View all sessions
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add workspace */}
              <button
                type="button"
                title="Add workspace"
                onClick={() => setCreateOpen(true)}
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-muted-foreground"
              >
                <Plus size={14} strokeWidth={1.5} />
              </button>
            </div>

            {/* Bottom actions */}
            <div className="flex flex-col items-center gap-0.5 pb-2 pt-1">
              <div className="flex size-8 items-center justify-center">
                <UserButton appearance={{ elements: { avatarBox: "size-6" } }} />
              </div>
              <Link
                href="/devices"
                title="Settings"
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-muted-foreground"
              >
                <Settings size={13} strokeWidth={1.5} />
              </Link>
              <button
                type="button"
                title="Toggle theme"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                className="flex size-8 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-muted-foreground"
              >
                {mounted && resolvedTheme === "dark" ? (
                  <Sun size={13} strokeWidth={1.5} />
                ) : (
                  <Moon size={13} strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          {/* Right workspace panel */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            {selectedWs ? (
              <WorkspacePanel
                ws={selectedWs}
                threads={selectedThreads}
                pathname={pathname}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
                Select a workspace
              </div>
            )}
          </div>
        </div>
      </Sidebar>

      {/* Create workspace dialog */}
      <CreateWorkspaceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        devices={devices ?? []}
        onCreated={(id) => {
          setSelectedWsId(id);
          setCreateOpen(false);
        }}
      />
    </>
  );
}

function WorkspacePanel({
  ws,
  threads,
  pathname,
}: {
  ws: Doc<"workspaces">;
  threads: Doc<"threads">[];
  pathname: string | null;
}) {
  const create = useMutation(api.threads.create);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [propsOpen, setPropsOpen] = useState(false);
  const threadListRef = useRef<HTMLDivElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = () => {
    const el = threadListRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  };

  useEffect(() => {
    checkScroll();
  }, [threads]);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await create({
        workspaceId: ws._id as Id<"workspaces">,
        agent: "claude",
        mode: defaultModeFor("claude"),
        title: "Claude Code session",
      });
      router.push(`/threads/${id}`);
    } finally {
      setBusy(false);
    }
  };

  const displayPath = ws.path?.replace(/^\/Users\/[^/]+/, "~") ?? ws.path ?? "";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Workspace header */}
        <div className="flex items-start justify-between px-3 pb-2 pt-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight text-foreground">
              {ws.name}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">{displayPath}</p>
          </div>
          <button
            type="button"
            onClick={() => setPropsOpen(true)}
            className="ml-1.5 shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            <MoreHorizontal size={13} strokeWidth={1.5} />
          </button>
        </div>

        {/* New session button */}
        <div className="px-2.5 pb-2">
          <button
            type="button"
            onClick={start}
            disabled={busy}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Pencil size={11} strokeWidth={1.5} />
            New session
          </button>
        </div>

        {/* Thread list — scrollable with bottom blur */}
        <div className="relative min-h-0 flex-1">
          <div
            ref={threadListRef}
            onScroll={checkScroll}
            className="h-full overflow-y-auto px-1.5 pb-2"
          >
            {threads.map((t) => {
              const isActive = pathname === `/threads/${t._id}`;
              return (
                <Link
                  key={t._id}
                  href={`/threads/${t._id}`}
                  className={cn(
                    "block truncate rounded-md px-2 py-1.5 text-xs transition-colors",
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                  )}
                >
                  {t.title}
                </Link>
              );
            })}
            {threads.length === 0 && (
              <p className="px-2 py-1.5 text-[10px] text-muted-foreground/60">No sessions yet.</p>
            )}
          </div>

          {/* Scroll blur overlay */}
          {canScrollDown && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-background to-transparent" />
          )}
        </div>
      </div>

      {/* Workspace properties dialog */}
      <Dialog open={propsOpen} onOpenChange={setPropsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workspace properties</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-1">
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Name
              </p>
              <p className="text-xs">{ws.name}</p>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Path
              </p>
              <p className="break-all font-mono text-xs">{ws.path}</p>
            </div>
            {/* editing disabled for now */}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateWorkspaceDialog({
  open,
  onClose,
  devices,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  devices: Doc<"devices">[];
  onCreated: (id: string) => void;
}) {
  const create = useMutation(api.workspaces.create);
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [deviceId, setDeviceId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (devices.length > 0 && !deviceId) {
      setDeviceId(devices[0]!._id);
    }
  }, [devices, deviceId]);

  const canSubmit = name.trim().length > 0 && path.trim().length > 0 && deviceId;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const id = await create({
        deviceId: deviceId as Id<"devices">,
        name: name.trim(),
        path: path.trim(),
      });
      setName("");
      setPath("");
      onCreated(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create workspace</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3.5 pt-1">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-project"
              className="h-8 text-xs"
              autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Path
            </label>
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/you/projects/my-project"
              className="h-8 font-mono text-xs"
            />
          </div>
          {devices.length > 1 && (
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
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" onClick={submit} disabled={!canSubmit || busy}>
              Create
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
