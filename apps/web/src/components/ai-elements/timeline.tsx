"use client";

import {
  AnimatePresence,
  motion,
  type Variants,
  type Transition,
} from "framer-motion";
import {
  Bot,
  ChevronRight,
  FileDiff,
  FilePlus,
  FileText,
  Folder,
  Globe,
  ICON_SIZES,
  Pencil,
  Search,
  Terminal,
  Wrench,
  type LucideIcon,
} from "@/components/icons";
import { useMemo, useState, type ReactNode } from "react";
import { cn } from "~/lib/utils";

export type TimelineStatus =
  | "error"
  | "warning"
  | "pending"
  | "success"
  | "info";

export type TimelineEvent = {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  status: TimelineStatus;
  meta?: ReactNode;
  source?: string;
  children?: TimelineEvent[];
  expandedByDefault?: boolean;
};

export type TimelineProps = {
  events: TimelineEvent[];
  title?: string;
  subtitle?: string;
  className?: string;
  dense?: boolean;
};

const STATUS_DOT: Record<TimelineStatus, string> = {
  error: "bg-error-base",
  warning: "bg-warning-base",
  pending: "bg-muted-foreground/70",
  success: "bg-success-base",
  info: "bg-information-base",
};

const STATUS_RING: Record<TimelineStatus, string> = {
  error: "ring-error-base/15",
  warning: "ring-warning-base/15",
  pending: "ring-muted-foreground/20",
  success: "ring-success-base/15",
  info: "ring-information-base/15",
};

const STATUS_LABEL: Record<TimelineStatus, string> = {
  error: "text-error-base",
  warning: "text-warning-base",
  pending: "text-muted-foreground/70",
  success: "text-success-base",
  info: "text-information-base",
};

const easeOut: Transition["ease"] = [0.22, 0.61, 0.36, 1];

const listVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: easeOut },
  },
};

const collapseVariants: Variants = {
  hidden: { height: 0, opacity: 0 },
  show: {
    height: "auto",
    opacity: 1,
    transition: {
      height: { duration: 0.28, ease: easeOut },
      opacity: { duration: 0.18, delay: 0.04 },
    },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.22, ease: easeOut },
      opacity: { duration: 0.12 },
    },
  },
};

export function Timeline({
  events,
  title,
  subtitle,
  className,
  dense = false,
}: TimelineProps) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card",
        "shadow-[0_1px_0_rgba(17,24,39,0.02),0_2px_6px_-2px_rgba(17,24,39,0.04)]",
        className,
      )}
    >
      {(title || subtitle) && (
        <div className="flex flex-col gap-0.5 border-b border-border px-4 py-3">
          {title && (
            <div className="flex items-baseline gap-2">
              <span className="text-label-sm font-medium text-foreground">
                {title}
              </span>
              <span className="font-mono text-label-2xs text-muted-foreground/70">
                {events.length} {events.length === 1 ? "event" : "events"}
              </span>
            </div>
          )}
          {subtitle && (
            <span className="text-paragraph-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      )}

      <motion.ol
        role="list"
        variants={listVariants}
        initial="hidden"
        animate="show"
        className={cn(
          "relative flex flex-col",
          dense ? "px-3 py-2" : "px-4 py-3",
        )}
      >
        {events.map((event, i) => (
          <TimelineItem
            key={event.id}
            event={event}
            isFirst={i === 0}
            isLast={i === events.length - 1}
            depth={0}
          />
        ))}
      </motion.ol>
    </div>
  );
}

type TimelineItemProps = {
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
  depth: number;
};

function TimelineItem({ event, isFirst, isLast, depth }: TimelineItemProps) {
  const hasChildren = !!event.children && event.children.length > 0;
  const [open, setOpen] = useState(event.expandedByDefault ?? false);
  const [sourceOpen, setSourceOpen] = useState(false);

  const childCount = event.children?.length ?? 0;

  const dot = useMemo(
    () => (
      <motion.span
        aria-hidden
        initial={isFirst ? { scale: 1 } : false}
        animate={isFirst ? { scale: [1, 1.15, 1] } : undefined}
        transition={
          isFirst
            ? { duration: 0.9, ease: easeOut, times: [0, 0.5, 1], delay: 0.18 }
            : undefined
        }
        className={cn(
          "relative z-10 mt-[7px] block size-2 shrink-0 rounded-full ring-4",
          STATUS_DOT[event.status],
          STATUS_RING[event.status],
        )}
      >
        {event.status === "pending" && (
          <span
            className={cn(
              "absolute inset-0 animate-ping rounded-full opacity-60",
              STATUS_DOT[event.status],
            )}
          />
        )}
      </motion.span>
    ),
    [event.status, isFirst],
  );

  return (
    <motion.li variants={itemVariants} className="relative flex gap-3">
      {/* connector line */}
      <div className="relative flex w-2 shrink-0 flex-col items-center">
        {dot}
        {!isLast && (
          <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
        )}
      </div>

      <div className={cn("min-w-0 flex-1", isLast ? "pb-1" : "pb-3")}>
        <motion.div
          whileHover={{ y: -1 }}
          transition={{ duration: 0.15, ease: easeOut }}
          className={cn(
            "group/card -mx-2 flex flex-col gap-1 rounded-md px-2 py-1.5",
            "transition-[box-shadow,background-color] duration-150",
            "hover:bg-muted hover:shadow-[0_1px_0_rgba(17,24,39,0.03),0_4px_10px_-6px_rgba(17,24,39,0.08)]",
            depth > 0 && "bg-muted/60",
          )}
        >
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "truncate text-label-xs font-medium text-foreground",
                depth > 0 && "text-label-2xs text-muted-foreground",
              )}
            >
              {event.title}
            </span>
            {event.timestamp && (
              <span className="ml-auto shrink-0 font-mono text-label-2xs text-muted-foreground/70 tabular-nums">
                {event.timestamp}
              </span>
            )}
          </div>

          {event.description && (
            <p
              className={cn(
                "text-paragraph-xs text-muted-foreground",
                depth > 0 && "text-label-2xs text-muted-foreground/70",
              )}
            >
              {event.description}
            </p>
          )}

          {event.meta && (
            <div className="mt-0.5 font-mono text-label-2xs text-muted-foreground">
              {event.meta}
            </div>
          )}

          {(hasChildren || event.source) && (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  aria-expanded={open}
                  className={cn(
                    "inline-flex items-center gap-1 bg-transparent p-0 font-mono text-label-2xs",
                    "text-muted-foreground/70 transition-colors hover:text-foreground",
                  )}
                >
                  <motion.span
                    animate={{ rotate: open ? 90 : 0 }}
                    transition={{ duration: 0.18, ease: easeOut }}
                    className="inline-flex"
                  >
                    <ChevronRight size={ICON_SIZES.xs} strokeWidth={2} />
                  </motion.span>
                  {open
                    ? `hide ${childCount} ${childCount === 1 ? "event" : "events"}`
                    : `${childCount} more ${childCount === 1 ? "event" : "events"}`}
                </button>
              )}

              {event.source && (
                <button
                  type="button"
                  onClick={() => setSourceOpen((v) => !v)}
                  aria-expanded={sourceOpen}
                  className={cn(
                    "inline-flex items-center gap-1 bg-transparent p-0 font-mono text-label-2xs",
                    "text-muted-foreground/70 transition-colors hover:text-foreground",
                  )}
                >
                  <motion.span
                    animate={{ rotate: sourceOpen ? 90 : 0 }}
                    transition={{ duration: 0.18, ease: easeOut }}
                    className="inline-flex"
                  >
                    <ChevronRight size={ICON_SIZES.xs} strokeWidth={2} />
                  </motion.span>
                  {sourceOpen ? "hide source" : "show source"}
                </button>
              )}

              {event.status !== "info" && event.status !== "success" && (
                <span
                  className={cn(
                    "ml-auto font-mono text-label-2xs uppercase tracking-wide",
                    STATUS_LABEL[event.status],
                  )}
                >
                  {event.status}
                </span>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {sourceOpen && event.source && (
              <motion.div
                key="source"
                variants={collapseVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                className="overflow-hidden"
              >
                <pre
                  className={cn(
                    "mt-1.5 overflow-x-auto rounded-md border border-border bg-muted",
                    "p-2 font-mono text-label-2xs text-muted-foreground",
                    "whitespace-pre-wrap break-all",
                  )}
                >
                  {event.source}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <AnimatePresence initial={false}>
          {hasChildren && open && (
            <motion.div
              key="children"
              variants={collapseVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="overflow-hidden"
            >
              <ol
                role="list"
                className="mt-1 ml-1 flex flex-col border-l border-dashed border-border pl-3"
              >
                {event.children!.map((child, i) => (
                  <TimelineItem
                    key={child.id}
                    event={child}
                    isFirst={false}
                    isLast={i === event.children!.length - 1}
                    depth={depth + 1}
                  />
                ))}
              </ol>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

/* ---------- Chat tool-call adapter ---------- */

export type ToolCallEvent = {
  id: string;
  name: string;
  args?: string;
  result?: string;
  state?: "running" | "done" | "error";
  startedAt?: number;
};

export type ToolCallTimelineProps = {
  calls: ToolCallEvent[];
  title?: string;
  subtitle?: string;
  className?: string;
  now?: number;
};

const TOOL_ICONS: Record<string, LucideIcon> = {
  read: FileText,
  view: FileText,
  cat: FileText,
  edit: Pencil,
  write: FilePlus,
  create: FilePlus,
  patch: FileDiff,
  diff: FileDiff,
  apply_patch: FileDiff,
  glob: Search,
  grep: Search,
  search: Search,
  find: Search,
  bash: Terminal,
  shell: Terminal,
  exec: Terminal,
  run: Terminal,
  ls: Folder,
  list: Folder,
  fetch: Globe,
  web: Globe,
  webfetch: Globe,
  websearch: Globe,
  task: Bot,
  agent: Bot,
};

function iconForTool(name: string): LucideIcon {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  if (TOOL_ICONS[key]) return TOOL_ICONS[key];
  for (const k of Object.keys(TOOL_ICONS)) {
    if (key.includes(k)) return TOOL_ICONS[k]!;
  }
  return Wrench;
}

export function ToolCallTimeline({
  calls,
  title,
  subtitle,
  className,
  now = Date.now(),
}: ToolCallTimelineProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {(title || subtitle) && (
        <div className="mb-1 flex flex-col gap-0.5">
          {title && (
            <span className="text-label-xs font-medium text-foreground">
              {title}
            </span>
          )}
          {subtitle && (
            <span className="text-paragraph-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      )}
      <motion.ol
        role="list"
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="relative flex flex-col"
      >
        {calls.map((call, i) => (
          <ToolCallRow
            key={call.id}
            call={call}
            isFirst={i === 0}
            isLast={i === calls.length - 1}
            now={now}
          />
        ))}
      </motion.ol>
    </div>
  );
}

type ToolCallRowProps = {
  call: ToolCallEvent;
  isFirst: boolean;
  isLast: boolean;
  now: number;
};

function ToolCallRow({ call, isFirst, isLast, now }: ToolCallRowProps) {
  const [open, setOpen] = useState(false);
  const hasBody = Boolean(call.args || call.result);
  const Icon = iconForTool(call.name);
  const running = call.state === "running";
  const error = call.state === "error";
  const iconColor = error
    ? "text-error-base"
    : running
      ? "text-muted-foreground/70"
      : "text-muted-foreground";

  return (
    <motion.li variants={itemVariants} className="relative flex gap-2">
      <div className="relative flex w-3.5 shrink-0 flex-col items-center">
        <motion.span
          aria-hidden
          initial={isFirst ? { scale: 1 } : false}
          animate={isFirst ? { scale: [1, 1.18, 1] } : undefined}
          transition={
            isFirst
              ? {
                  duration: 0.9,
                  ease: easeOut,
                  times: [0, 0.5, 1],
                  delay: 0.18,
                }
              : undefined
          }
          className={cn(
            "relative z-10 mt-[3px] inline-flex size-3.5 items-center justify-center bg-card",
            iconColor,
          )}
        >
          <Icon size={ICON_SIZES.xs} strokeWidth={1.75} />
          {running && (
            <span className="absolute -inset-0.5 animate-ping rounded-full bg-muted-foreground/30" />
          )}
        </motion.span>
        {!isLast && (
          <span
            className="mt-0.5 w-px flex-1 bg-border"
            aria-hidden
          />
        )}
      </div>

      <div className={cn("min-w-0 flex-1", isLast ? "pb-0" : "pb-2")}>
        <button
          type="button"
          onClick={() => hasBody && setOpen((v) => !v)}
          disabled={!hasBody}
          className={cn(
            "group flex w-full items-baseline gap-2 bg-transparent p-0 text-left",
            hasBody && "cursor-pointer",
          )}
        >
          <span
            className={cn(
              "truncate font-mono text-label-2xs",
              error
                ? "text-error-base"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          >
            {call.name}
          </span>
          {running && (
            <span className="font-mono text-label-2xs text-muted-foreground/70">
              running…
            </span>
          )}
          {error && (
            <span className="font-mono text-label-2xs text-error-base">
              error
            </span>
          )}
          {call.startedAt && (
            <span className="ml-auto shrink-0 font-mono text-label-2xs text-muted-foreground/70 tabular-nums">
              {formatRelative(call.startedAt, now)}
            </span>
          )}
        </button>

        <AnimatePresence initial={false}>
          {open && hasBody && (
            <motion.div
              key="body"
              variants={collapseVariants}
              initial="hidden"
              animate="show"
              exit="exit"
              className="overflow-hidden"
            >
              <div className="mt-1 space-y-1 border-l border-border pl-2">
                {call.args && (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-label-2xs text-muted-foreground">
                    {call.args}
                  </pre>
                )}
                {call.result && (
                  <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-label-2xs text-muted-foreground/70">
                    {call.result}
                  </pre>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
