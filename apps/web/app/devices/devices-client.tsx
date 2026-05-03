"use client";

import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Cpu, ICON_SIZES, Monitor, Plus, Trash2 } from "@/components/icons";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

export function DevicesClient() {
  const devices = useQuery(api.devices.list, {});
  const remove = useMutation(api.devices.remove);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <PairDeviceModal />
      </div>

      {devices === undefined && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {devices && devices.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm font-medium">No devices paired yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Run coco-agent pair on a machine, then enter the code here.
          </p>
        </div>
      )}

      {devices && devices.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {devices.map((d) => {
            const minutes = Math.round((Date.now() - d.lastSeenAt) / 60_000);
            const online = minutes < 2;
            return (
              <div
                key={d._id}
                className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4"
              >
                <div className="flex gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Monitor size={ICON_SIZES.lg} strokeWidth={1.2} />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {d.name}
                      <span
                        className={
                          "inline-flex h-1.5 w-1.5 rounded-full " +
                          (online ? "bg-green-500" : "bg-muted-foreground/50")
                        }
                      />
                    </div>
                    <div className="mt-2 flex items-center text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Cpu size={ICON_SIZES.sm} strokeWidth={1.2} />
                        {d.platform ?? "unknown"}
                      </span>
                      <span className="mx-1.5">·</span>
                      last seen {formatRelative(d.lastSeenAt)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove({ deviceId: d._id as Id<"devices"> })}
                  aria-label="Remove device"
                >
                  <Trash2 size={ICON_SIZES.md} strokeWidth={1.2} />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PairDeviceModal() {
  const claim = useMutation(api.pairing.claim);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onPair = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await claim({ code: code.trim().toUpperCase() });
      setCode("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to pair");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus size={ICON_SIZES.md} strokeWidth={1.5} />
            Pair device
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pair a new device</DialogTitle>
          <DialogDescription>
            Run coco-agent pair on the machine and enter the 8-character code
            shown.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onPair} className="flex flex-col gap-3">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="XXXXXXXX"
            className="font-mono uppercase tracking-widest"
            maxLength={8}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" size="sm">Cancel</Button>} />
            <Button
              type="submit"
              size="sm"
              disabled={submitting || code.length === 0}
            >
              {submitting ? "Pairing…" : "Pair"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}
