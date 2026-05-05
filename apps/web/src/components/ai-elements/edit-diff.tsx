"use client";

import { Component, type ReactNode } from "react";
import { MultiFileDiff } from "@pierre/diffs/react";
import type { FileContents } from "@pierre/diffs/react";
import { useTheme } from "next-themes";
import { truncatePath } from "./code-view";

type EditDiffProps = {
  filePath: string;
  oldString: string;
  newString: string;
};

export type ParsedEditArgs = EditDiffProps | { truncated: true; filePath: string } | null;

class DiffErrorBoundary extends Component<
  { children: ReactNode; filePath: string },
  { error: string | null }
> {
  state = { error: null };
  static getDerivedStateFromError(e: unknown) {
    return { error: e instanceof Error ? e.message : "Failed to render diff" };
  }
  render() {
    if (this.state.error) {
      return <DiffError message={this.state.error} />;
    }
    return this.props.children;
  }
}

function DiffError({ message }: { message: string }) {
  return (
    <div className="mt-1 rounded border border-error-base/30 bg-error-base/5 px-2 py-1.5 font-mono text-label-2xs text-error-base">
      diff error: {message}
    </div>
  );
}

export function EditDiff({ filePath, oldString, newString }: EditDiffProps) {
  const { resolvedTheme } = useTheme();
  const themeType = resolvedTheme === "dark" ? "dark" : "light";
  const oldFile: FileContents = { name: filePath, contents: oldString };
  const newFile: FileContents = { name: filePath, contents: newString };

  return (
    <DiffErrorBoundary filePath={filePath}>
      <div className="mt-1 flex flex-col gap-1">
      <div
        className="font-mono text-label-2xs text-muted-foreground/70 truncate"
        title={filePath}
      >
        {truncatePath(filePath)}
      </div>
      <div className="overflow-hidden rounded border border-border text-xs">
        <MultiFileDiff
          oldFile={oldFile}
          newFile={newFile}
          options={{
            theme: { dark: "pierre-dark", light: "pierre-light" },
            themeType,
            diffStyle: "unified",
            disableLineNumbers: false,
            overflow: "wrap",
          }}
        />
      </div>
      </div>
    </DiffErrorBoundary>
  );
}

export function parseEditArgs(args: string): ParsedEditArgs {
  try {
    const parsed = JSON.parse(args);
    if (typeof parsed === "object" && parsed !== null) {
      if (
        typeof parsed.old_string === "string" &&
        typeof parsed.new_string === "string"
      ) {
        return {
          filePath: typeof parsed.file_path === "string" ? parsed.file_path : "file",
          oldString: parsed.old_string,
          newString: parsed.new_string,
        };
      }
    }
  } catch {
    // JSON parse failed — check if it looks like truncated edit args
    if (args.includes('"old_string"') || args.includes('"new_string"')) {
      const filePathMatch = args.match(/"file_path"\s*:\s*"([^"]+)"/);
      return {
        truncated: true,
        filePath: filePathMatch?.[1] ?? "file",
      };
    }
  }
  return null;
}
