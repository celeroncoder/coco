import type { Doc } from "@coco/convex/dataModel";

export type RunEvent = { type: string; text?: string; ts: number };
export type RunInfo = { status: string; error?: string; events: RunEvent[] };

export type DisplayMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

export type ModelGroup = {
  label: string;
  options: { id: string; label: string }[];
};
