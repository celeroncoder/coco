"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";
import { DotmSquare1 } from "~/components/ui/dotm-square-1";
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
      {streaming && (
        <div className="flex items-center gap-2">
          <DotmSquare1
            size={20}
            dotSize={3}
            animated
            aria-label="Thinking"
          />
          <span className="text-paragraph-xs italic text-muted-foreground/70">
            thinking…
          </span>
        </div>
      )}
      {open && text.trim() && (
        <Response
          className="my-1 pl-3 border-l-2 border-border italic text-muted-foreground [&_*]:text-muted-foreground"
        >
          {text}
        </Response>
      )}
    </div>
  );
}
