"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";
import { Response } from "./response";

export function Thinking({
  text,
  streaming,
  className,
}: {
  text: string;
  streaming?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(true);

  if (!text.trim() && !streaming) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        className,
      )}
    >
      {/* <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-fit items-center gap-1.5 self-start text-label-2xs uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-muted-foreground"
      >
        <Brain size={11} strokeWidth={1.5} />
        {streaming ? "thinking…" : "thought"}
        <span className="text-muted-foreground/70">{open ? "−" : "+"}</span>
      </button> */}
      {open && (
        <Response
          className="my-1 pl-3 border-l-2 border-border italic text-muted-foreground [&_*]:text-muted-foreground"
        >
          {text}
        </Response>
      )}
    </div>
  );
}
