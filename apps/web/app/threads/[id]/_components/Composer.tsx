"use client";

import { ArrowUp, ICON_SIZES } from "@/components/icons";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { ModelGroup } from "./types";
import { PillSelect } from "./PillSelect";

const EFFORTS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

type Skill = { _id: string; name: string; description?: string };

export function Composer({
  agentLabel,
  value,
  onChange,
  onSubmit,
  submitting,
  skills,
  mode,
  modes,
  onModeChange,
  model,
  modelGroups,
  onModelChange,
  effort,
  onEffortChange,
}: {
  agentLabel: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  skills: Skill[];
  mode: string;
  modes: { id: string; label: string }[];
  onModeChange: (m: string) => void;
  model: string;
  modelGroups: ModelGroup[];
  onModelChange: (m: string) => void;
  effort: string;
  onEffortChange: (e: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mention, setMention] = useState<{
    query: string;
    start: number;
    end: number;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [value]);

  const filteredSkills = useMemo(() => {
    if (!mention) return [];
    const q = mention.query.toLowerCase();
    const list = q
      ? skills.filter((s) => s.name.toLowerCase().includes(q))
      : skills;
    return list.slice(0, 8);
  }, [mention, skills]);

  useEffect(() => {
    setActiveIndex(0);
  }, [mention?.query]);

  const detectMention = useCallback(
    (text: string, caret: number) => {
      // Find the most recent @ before caret with no whitespace between
      let i = caret - 1;
      while (i >= 0) {
        const ch = text[i] ?? "";
        if (ch === "@") {
          const before = i === 0 ? " " : (text[i - 1] ?? " ");
          if (/\s/.test(before) || i === 0) {
            const query = text.slice(i + 1, caret);
            if (/^[\w.-]*$/.test(query)) {
              setMention({ query, start: i, end: caret });
              return;
            }
          }
          break;
        }
        if (/\s/.test(ch)) break;
        i--;
      }
      setMention(null);
    },
    [],
  );

  const insertSkill = useCallback(
    (skill: Skill) => {
      if (!mention) return;
      const insertion = `@skill:${skill.name} `;
      const next =
        value.slice(0, mention.start) + insertion + value.slice(mention.end);
      onChange(next);
      setMention(null);
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const pos = mention.start + insertion.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [mention, value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && filteredSkills.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filteredSkills.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex(
          (i) => (i - 1 + filteredSkills.length) % filteredSkills.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const target = filteredSkills[activeIndex];
        if (target) insertSkill(target);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMention(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="relative flex flex-col gap-2 rounded-2xl border border-border bg-background px-3 pt-2.5 pb-2 transition-colors"
    >
      {mention && filteredSkills.length > 0 && (
        <div className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-regular-md">
          {filteredSkills.map((s, idx) => (
            <button
              key={s._id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertSkill(s);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex w-full min-w-0 flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left",
                idx === activeIndex
                  ? "bg-muted"
                  : "hover:bg-muted/60",
              )}
            >
              <span className="truncate text-label-xs font-medium text-foreground">
                @skill:{s.name}
              </span>
              {s.description && (
                <span className="line-clamp-1 text-label-2xs text-muted-foreground">
                  {s.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detectMention(e.target.value, e.target.selectionStart ?? 0);
        }}
        onKeyUp={(e) => {
          const t = e.currentTarget;
          detectMention(t.value, t.selectionStart ?? 0);
        }}
        onClick={(e) => {
          const t = e.currentTarget;
          detectMention(t.value, t.selectionStart ?? 0);
        }}
        onBlur={() => setTimeout(() => setMention(null), 100)}
        placeholder={`Ask ${agentLabel} anything...`}
        rows={4}
        className="min-h-8 w-full resize-none bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-muted-foreground/70"
        onKeyDown={handleKeyDown}
      />

      <div className="flex flex-wrap items-center justify-end gap-1">
        <PillSelect
          value={model}
          onChange={onModelChange}
          groups={modelGroups}
          disabled={modelGroups.flatMap((g) => g.options).length <= 1}
        />
        <PillSelect
          value={mode}
          onChange={onModeChange}
          options={modes}
          disabled={modes.length <= 1}
        />
        <PillSelect
          value={effort}
          onChange={onEffortChange}
          options={EFFORTS}
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={submitting || !value.trim()}
          aria-label="Send"
          className="ml-1 shrink-0"
        >
          <ArrowUp size={ICON_SIZES.sm} strokeWidth={1.5} />
        </Button>
      </div>
    </form>
  );
}
