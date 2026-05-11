"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { useTheme } from "next-themes";
import { X, ICON_SIZES } from "@/components/icons";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Response } from "~/components/ai-elements/response";
import { useRightSidebarRef } from "~/components/right-sidebar-context";
import { cn } from "~/lib/utils";

const XTERM_DARK_THEME = {
  background: "#0d0d0d",
  foreground: "#e0e0e0",
  cursor: "#e0e0e0",
  selectionBackground: "#e0e0e040",
  black: "#1a1a1a",
  red: "#d75f5f",
  green: "#5f875f",
  yellow: "#d7af5f",
  blue: "#5f87af",
  magenta: "#af5f87",
  cyan: "#5fafaf",
  white: "#c6c6c6",
  brightBlack: "#767676",
  brightRed: "#d7875f",
  brightGreen: "#87af5f",
  brightYellow: "#d7d787",
  brightBlue: "#87afd7",
  brightMagenta: "#d787d7",
  brightCyan: "#87d7d7",
  brightWhite: "#ffffff",
};

const XTERM_LIGHT_THEME = {
  background: "#f8f8f8",
  foreground: "#1a1a1a",
  cursor: "#1a1a1a",
  selectionBackground: "#1a1a1a30",
  black: "#1a1a1a",
  red: "#c0392b",
  green: "#27ae60",
  yellow: "#d68910",
  blue: "#2980b9",
  magenta: "#8e44ad",
  cyan: "#16a085",
  white: "#595959",
  brightBlack: "#767676",
  brightRed: "#e74c3c",
  brightGreen: "#2ecc71",
  brightYellow: "#f39c12",
  brightBlue: "#3498db",
  brightMagenta: "#9b59b6",
  brightCyan: "#1abc9c",
  brightWhite: "#1a1a1a",
};

const DEFAULT_LOCALTERM_PORT = 3417;
const CONNECTING_TIMEOUT_MS = 10_000;

type SidebarTab = "plan" | "terminal";

interface RightSidebarProps {
  open: boolean;
  onClose: () => void;
  defaultTab: SidebarTab;
  plan: { filePath: string; content: string } | null;
  onImplement: () => void;
  implementing: boolean;
  workspacePath: string;
  localtermPort?: number;
}

export function RightSidebar({
  open,
  onClose,
  defaultTab,
  plan,
  onImplement,
  implementing,
  workspacePath,
  localtermPort = DEFAULT_LOCALTERM_PORT,
}: RightSidebarProps) {
  const portalRef = useRightSidebarRef();
  const [activeTab, setActiveTab] = useState<SidebarTab>(defaultTab);

  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const target = portalRef.current ?? document.body;

  return createPortal(
    <div className="flex h-full w-lg max-w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground pr-2 py-2">
      {/* header with tabs */}
      <div className="flex h-10 shrink-0 items-center">
        <div className="flex h-full flex-1 items-start">
          <button
            type="button"
            onClick={() => setActiveTab("plan")}
            className={cn(
              `flex h-fit items-center gap-1.5 px-4 pt-2 pb-1 rounded-t-lg text-sm font-medium transition-colors`,
              activeTab === "plan" && "bg-muted border-b-2 border-primary",
            )}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={cn(
              `flex h-fit items-center gap-1.5 px-4 pt-2 pb-1 rounded-t-lg text-sm font-medium transition-colors`,
              activeTab === "terminal" && "bg-accent border-b-2 border-primary",
            )}
          >
            Terminal
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onClose}
          aria-label="Close sidebar"
          className="mr-1"
        >
          <X size={ICON_SIZES.md} strokeWidth={1.5} />
        </Button>
      </div>

      {/* plan panel */}
      {activeTab === "plan" && (
        <PlanPanel
          plan={plan}
          onImplement={onImplement}
          implementing={implementing}
        />
      )}

      {/* terminal panel */}
      {activeTab === "terminal" && (
        <TerminalPanelContent
          workspacePath={workspacePath}
          localtermPort={localtermPort}
        />
      )}
    </div>,
    target,
  );
}

function PlanPanel({
  plan,
  onImplement,
  implementing,
}: {
  plan: { filePath: string; content: string } | null;
  onImplement: () => void;
  implementing: boolean;
}) {
  if (!plan) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
        No plan available.
      </div>
    );
  }

  const scrollRootRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;
    const viewport = root.querySelector<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );
    if (!viewport) return;

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      setCanScrollUp(scrollTop > 1);
      setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
    };

    update();
    viewport.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    const mo = new MutationObserver(update);
    mo.observe(viewport, { childList: true, subtree: true, characterData: true });

    return () => {
      viewport.removeEventListener("scroll", update);
      ro.disconnect();
      mo.disconnect();
    };
  }, [plan.content]);

  return (
    <div className="relative min-h-0 flex-1">
      <ScrollArea ref={scrollRootRef} className="h-full">
        <div className="px-4 py-1.5 wrap-anywhere">
          <Response>{plan.content}</Response>
        </div>
      </ScrollArea>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-sidebar to-transparent transition-opacity duration-150",
          canScrollUp ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-sidebar to-transparent transition-opacity duration-150",
          canScrollDown ? "opacity-100" : "opacity-0",
        )}
      />
      {/* <div className="flex shrink-0 items-center justify-end gap-2 px-3 py-2">
        <Button onClick={onImplement} disabled={implementing}>
          {implementing ? "Implementing..." : "Implement Plan"}
        </Button>
      </div> */}
    </div>
  );
}

function TerminalPanelContent({
  workspacePath,
  localtermPort,
}: {
  workspacePath: string;
  localtermPort: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<XtermTerminal | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const xtermTheme =
      resolvedTheme === "light" ? XTERM_LIGHT_THEME : XTERM_DARK_THEME;
    if (terminalRef.current) {
      terminalRef.current.options.theme = xtermTheme;
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const fitAddon = new FitAddon();
    const initialTheme = document.documentElement.classList.contains("light")
      ? XTERM_LIGHT_THEME
      : XTERM_DARK_THEME;
    const terminal = new XtermTerminal({
      allowProposedApi: true,
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: initialTheme,
    });
    terminalRef.current = terminal;

    terminal.loadAddon(fitAddon);
    terminal.open(container);

    const sendResize = (cols: number, rows: number) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "resize", cols, rows }));
      }
    };

    const fitToContainer = () => {
      try {
        fitAddon.fit();
        sendResize(terminal.cols, terminal.rows);
      } catch {
        // container not yet measured
      }
    };

    const scheduleFit = () => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resizeTimer = null;
        fitToContainer();
      }, 200);
    };

    const observer = new ResizeObserver(scheduleFit);
    observer.observe(container);

    terminal.onData((data) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "input", data }));
      }
    });

    terminal.onResize(({ cols, rows }) => sendResize(cols, rows));

    const connect = () => {
      if (disposed) return;
      const ws = new WebSocket(`ws://localhost:${localtermPort}/ws`);
      socket = ws;

      ws.addEventListener("open", () => {
        if (disposed || socket !== ws) return;
        if (connectTimer !== null) {
          clearTimeout(connectTimer);
          connectTimer = null;
        }
        setStatus("connected");
        fitToContainer();

        if (workspacePath) {
          ws.send(
            JSON.stringify({
              type: "input",
              data: `cd "${workspacePath}" && clear\n`,
            }),
          );
        }
      });

      ws.addEventListener("message", (event) => {
        if (disposed || socket !== ws) return;
        try {
          const msg = JSON.parse(
            typeof event.data === "string" ? event.data : String(event.data),
          );
          if (msg.type === "output") {
            terminal.write(msg.data);
          } else if (msg.type === "exit") {
            terminal.write(
              `\r\n\u001b[33m[shell exited with code ${msg.code ?? "null"}]\u001b[0m\r\n`,
            );
          }
        } catch {
          // ignore malformed messages
        }
      });

      ws.addEventListener("close", () => {
        socket = null;
        if (!disposed) {
          setStatus("disconnected");
        }
      });

      ws.addEventListener("error", () => {
        // close event will follow
      });

      connectTimer = setTimeout(() => {
        if (socket !== ws) return;
        ws.close();
      }, CONNECTING_TIMEOUT_MS);
    };

    connect();
    terminal.focus();

    return () => {
      disposed = true;
      if (connectTimer !== null) clearTimeout(connectTimer);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      observer.disconnect();
      try {
        socket?.close();
      } catch {}
      terminal.dispose();
      terminalRef.current = null;
    };
  }, [localtermPort, workspacePath]);

  return (
    <>
      <div className="flex items-center gap-2 px-3 py-1.5">
        {status === "connecting" && (
          <span className="shrink-0 text-[9px] text-yellow-400">
            connecting...
          </span>
        )}
        {status === "disconnected" && (
          <span className="shrink-0 text-[9px] text-red-400">disconnected</span>
        )}
      </div>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-hidden rounded-lg"
      />
      {status === "disconnected" && (
        <div className="flex h-7 shrink-0 items-center justify-center border-t border-sidebar-border bg-sidebar-accent/50">
          <span className="text-[11px] text-muted-foreground">
            Run{" "}
            <code className="rounded bg-muted px-1 text-[10px]">
              npx localterm@latest start
            </code>{" "}
            to start the terminal server
          </span>
        </div>
      )}
    </>
  );
}
