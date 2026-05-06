"use client";

import { FileTree, useFileTree } from "@pierre/trees/react";
import { cn } from "~/lib/utils";

type GlobTreeViewProps = {
  paths: string[];
  className?: string;
};

export function GlobTreeView({ paths, className }: GlobTreeViewProps) {
  const { model } = useFileTree({
    paths,
    search: false,
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
      <FileTree
        model={model}
        className="border-none"
        style={
          {
            height: Math.min(paths.length * 28 + 8, 320),
            "--trees-item-height": "28px",
            "--trees-density-override": "1",
          } as React.CSSProperties
        }
      />
    </div>
  );
}

export { parseGlobResult } from "./code-view";
