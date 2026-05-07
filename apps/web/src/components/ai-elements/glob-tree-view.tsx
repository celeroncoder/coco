"use client";

import { useMemo } from "react";
import { useTheme } from "next-themes";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { themeToTreeStyles } from "@pierre/trees";
import { cn } from "~/lib/utils";
import { getDirectoryPaths } from "./code-view";

type GlobTreeViewProps = {
  paths: string[];
  className?: string;
};

const DARK_THEME = {
  type: "dark" as const,
  bg: "#09090b",
  fg: "#fafafa",
  colors: {
    "list.activeSelectionBackground": "#27272a",
    "list.activeSelectionForeground": "#fafafa",
    "list.hoverBackground": "#18181b",
    "list.hoverForeground": "#fafafa",
    "list.focusAndSelectionBackground": "#27272a",
    "list.focusAndSelectionForeground": "#fafafa",
    "list.inactiveSelectionBackground": "#27272a",
    "list.inactiveSelectionForeground": "#fafafa",
    "list.filterMatchBackground": "#fef08a33",
    "list.filterMatchForeground": "#fef08a",
    "list.highlightForeground": "#fef08a",
    "list.invalidItemForeground": "#ef4444",
    "list.errorForeground": "#ef4444",
    "list.warningForeground": "#f59e0b",
    "gitDecoration.modifiedResourceForeground": "#fef08a",
    "gitDecoration.deletedResourceForeground": "#ef4446",
    "gitDecoration.untrackedResourceForeground": "#4ade80",
    "gitDecoration.ignoredResourceForeground": "#52525b",
    "gitDecoration.conflictingResourceForeground": "#f97316",
    "gitDecoration.submoduleResourceForeground": "#60a5fa",
    "input.background": "#18181b",
    "input.border": "#27272a",
    "input.foreground": "#fafafa",
    "input.placeholderForeground": "#52525b",
    "focusBorder": "#a1a1aa",
    "foreground": "#fafafa",
    "descriptionForeground": "#a1a1aa",
    "errorForeground": "#ef4444",
  },
};

const LIGHT_THEME = {
  type: "light" as const,
  bg: "#ffffff",
  fg: "#09090b",
  colors: {
    "list.activeSelectionBackground": "#e4e4e7",
    "list.activeSelectionForeground": "#09090b",
    "list.hoverBackground": "#f4f4f5",
    "list.hoverForeground": "#09090b",
    "list.focusAndSelectionBackground": "#e4e4e7",
    "list.focusAndSelectionForeground": "#09090b",
    "list.inactiveSelectionBackground": "#e4e4e7",
    "list.inactiveSelectionForeground": "#09090b",
    "list.filterMatchBackground": "#fef08a66",
    "list.filterMatchForeground": "#a16207",
    "list.highlightForeground": "#a16207",
    "list.invalidItemForeground": "#dc2626",
    "list.errorForeground": "#dc2626",
    "list.warningForeground": "#d97706",
    "gitDecoration.modifiedResourceForeground": "#a16207",
    "gitDecoration.deletedResourceForeground": "#dc2626",
    "gitDecoration.untrackedResourceForeground": "#16a34a",
    "gitDecoration.ignoredResourceForeground": "#a1a1aa",
    "gitDecoration.conflictingResourceForeground": "#ea580c",
    "gitDecoration.submoduleResourceForeground": "#2563eb",
    "input.background": "#f4f4f5",
    "input.border": "#d4d4d8",
    "input.foreground": "#09090b",
    "input.placeholderForeground": "#a1a1aa",
    "focusBorder": "#71717a",
    "foreground": "#09090b",
    "descriptionForeground": "#71717a",
    "errorForeground": "#dc2626",
  },
};

export function GlobTreeView({ paths, className }: GlobTreeViewProps) {
  const { resolvedTheme } = useTheme();
  const themeStyles = useMemo(
    () => themeToTreeStyles(resolvedTheme === "dark" ? DARK_THEME : LIGHT_THEME),
    [resolvedTheme],
  );

  const initialExpandedPaths = useMemo(() => {
    const dirs = getDirectoryPaths(paths);
    if (paths.length <= 10) return dirs;
    return dirs.filter((dir) => {
      const count = paths.filter(
        (p) => p === dir || p.startsWith(dir + "/"),
      ).length;
      return count <= 10;
    });
  }, [paths]);

  const { model } = useFileTree({
    paths,
    search: false,
    initialExpandedPaths,
  });

  return (
    <div
      className={cn(
        "mt-1 flex flex-col gap-1 overflow-hidden rounded-md border border-border",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5">
        <span className="font-mono text-label-2xs text-muted-foreground">
          {paths.length} {paths.length === 1 ? "file" : "files"}
        </span>
      </div>
      <div className="overflow-x-auto">
        <FileTree
          model={model}
          className="border-none"
          style={
            {
              ...themeStyles,
              maxWidth: 340,
              height: Math.min(paths.length * 28 + 8, 320),
              "--trees-item-height": "28px",
              "--trees-density-override": "1",
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  );
}

export { parseGlobResult } from "./code-view";
