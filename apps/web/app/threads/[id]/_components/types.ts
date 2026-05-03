import type { Doc } from "@coco/convex/dataModel";

export type RunEvent = { type: string; text?: string; ts: number };
export type RunInfo = { status: string; error?: string; events: RunEvent[] };

export type DisplayMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
};

export type OpenCodeMessage = DisplayMessage;

export type ThreadWithOpenCode = Doc<"threads"> & {
  opencodeSessionId?: string;
  opencodeServerUrl?: string;
};

export type ModelGroup = {
  label: string;
  options: { id: string; label: string }[];
};

export type OpenCodeProvidersResponse = {
  providers?: Array<{
    id?: string;
    name?: string;
    label?: string;
    models?: Array<{ id?: string; model?: string; name?: string; label?: string }>;
  }>;
  all?: Array<{
    id?: string;
    name?: string;
    label?: string;
    models?: Array<{ id?: string; model?: string; name?: string; label?: string }>;
  }>;
  default?: Record<string, string>;
  connected?: string[];
};

export type PermissionRequest = {
  permissionId: string;
  title: string;
  description?: string;
  raw?: Record<string, unknown>;
};
