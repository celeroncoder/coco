"use client";

import { ChevronDown, ICON_SIZES } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import { useMemo } from "react";
import type { ModelGroup } from "./types";

export function PillSelect({
  value,
  onChange,
  options,
  groups,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options?: { id: string; label: string }[];
  groups?: ModelGroup[];
  disabled?: boolean;
}) {
  const effectiveGroups = useMemo(
    () => groups ?? [{ label: "Options", options: options ?? [] }],
    [groups, options],
  );
  const flatOptions = useMemo(
    () => effectiveGroups.flatMap((g) => g.options),
    [effectiveGroups],
  );
  const current = useMemo(
    () => flatOptions.find((o) => o.id === value) ?? flatOptions[0],
    [flatOptions, value],
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            disabled={disabled}
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors",
              "hover:bg-muted hover:text-foreground",
              "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
              "data-[popup-open]:bg-muted data-[popup-open]:text-foreground",
            )}
          >
            <span className="truncate">{current?.label ?? value}</span>
            <ChevronDown size={ICON_SIZES.sm} strokeWidth={1.5} className="shrink-0" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
        {effectiveGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            {group.options.map((o) => (
              <DropdownMenuItem
                key={o.id}
                onClick={() => onChange(o.id)}
                className={cn(
                  "text-sm",
                  o.id === value && "bg-muted font-medium",
                )}
              >
                {o.label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
