"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Terminal as XtermTerminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { X, ICON_SIZES } from "@/components/icons";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Response } from "~/components/ai-elements/response";
import { useRightSidebarRef } from "~/components/right-sidebar-context";

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
    <div className="flex h-full w-lg max-w-full flex-col overflow-hidden bg-background">
      {/* header with tabs */}
      <div className="flex h-10 shrink-0 items-center border-b border-border">
        <div className="flex h-full flex-1 items-center">
          <button
            type="button"
            onClick={() => setActiveTab("plan")}
            className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-label-2xs font-medium transition-colors ${
              activeTab === "plan"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Plan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`flex h-full items-center gap-1.5 border-b-2 px-3 text-label-2xs font-medium transition-colors ${
              activeTab === "terminal"
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
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

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-3 wrap-anywhere">
          <div className="mb-2 font-mono text-[10px] text-muted-foreground">
            {plan.filePath}
          </div>
          <Response>{plan.content}</Response>
        </div>
      </ScrollArea>
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-3 py-2">
        <Button onClick={onImplement} disabled={implementing}>
          {implementing ? "Implementing..." : "Implement Plan"}
        </Button>
      </div>
    </>
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
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let socket: WebSocket | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    const fitAddon = new FitAddon();
    const terminal = new XtermTerminal({
      allowProposedApi: true,
      cursorBlink: true,
      cursorStyle: "bar",
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
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
      },
    });

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
          ws.send(JSON.stringify({ type: "input", data: `cd "${workspacePath}" && clear\n` }));
        }
      });

      ws.addEventListener("message", (event) => {
        if (disposed || socket !== ws) return;
        try {
          const msg = JSON.parse(typeof event.data === "string" ? event.data : String(event.data));
          if (msg.type === "output") {
            terminal.write(msg.data);
          } else if (msg.type === "exit") {
            terminal.write(`\r\n\u001b[33m[shell exited with code ${msg.code ?? "null"}]\u001b[0m\r\n`);
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
      try { socket?.close(); } catch {}
      terminal.dispose();
    };
  }, [localtermPort, workspacePath]);

  return (
    <>
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <span className="truncate text-[10px] text-muted-foreground">
          {workspacePath || "~"}
        </span>
        {status === "connecting" && (
          <span className="shrink-0 text-[9px] text-yellow-400">connecting...</span>
        )}
        {status === "disconnected" && (
          <span className="shrink-0 text-[9px] text-red-400">disconnected</span>
        )}
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden" />
      {status === "disconnected" && (
        <div className="flex h-7 shrink-0 items-center justify-center border-t border-border bg-muted/30">
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
