"use client";

import { api } from "@coco/convex/api";
import type { Id } from "@coco/convex/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Folder, ICON_SIZES, Pencil, Plus, Trash2 } from "@/components/icons";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { loader, Matrix } from "@/components/ui/matrix";

export function WorkspacesClient() {
  const devices = useQuery(api.devices.list, {});
  const workspaces = useQuery(api.workspaces.list, {});
  const remove = useMutation(api.workspaces.remove);

  if (devices === undefined) {
    return <Matrix rows={7} cols={7} frames={loader} fps={12} />;
  }

  if (devices.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm font-medium">No paired devices</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pair one on{" "}
          <Link href="/devices" className="underline">
            /devices
          </Link>{" "}
          before adding workspaces.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <NewWorkspaceModal devices={devices} />
      </div>

      {workspaces === undefined && (
        <Matrix rows={7} cols={7} frames={loader} fps={12} />
      )}

      {workspaces && workspaces.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm font-medium">No workspaces yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create one to point an agent at a local folder.
          </p>
        </div>
      )}

      {workspaces && workspaces.length > 0 && (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Path</th>
                <th className="px-4 py-2.5 font-medium">Device</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {workspaces.map((w) => {
                const device = devices.find((d) => d._id === w.deviceId);
                return (
                  <tr key={w._id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Folder
                          size={ICON_SIZES.lg}
                          strokeWidth={1.2}
                          className="text-muted-foreground"
                        />
                        {w.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {w.path}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {device?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <EditWorkspaceModal workspace={w} />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            remove({
                              workspaceId: w._id as Id<"workspaces">,
                            })
                          }
                          aria-label="Remove"
                        >
                          <Trash2 size={ICON_SIZES.md} strokeWidth={1.2} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NewWorkspaceModal({
  devices,
}: {
  devices: { _id: string; name: string }[];
}) {
  const create = useMutation(api.workspaces.create);
  const [open, setOpen] = useState(false);
  const [deviceId, setDeviceId] = useState(devices[0]?._id ?? "");
  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId || !name || !path) return;
    setSubmitting(true);
    try {
      await create({
        deviceId: deviceId as Id<"devices">,
        name,
        path,
      });
      setName("");
      setPath("");
      setOpen(false);
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
            New workspace
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New workspace</DialogTitle>
          <DialogDescription>
            A folder on a paired device. Agents will run with this as cwd.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Device">
            <Select value={deviceId} onValueChange={(v) => setDeviceId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select device…" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d._id} value={d._id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="coco"
            />
          </Field>
          <Field label="Path">
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/Users/you/code/project"
              className="font-mono"
            />
          </Field>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" size="sm" disabled={submitting}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditWorkspaceModal({
  workspace,
}: {
  workspace: { _id: string; name: string; path: string };
}) {
  const update = useMutation(api.workspaces.update);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(workspace.name);
  const [path, setPath] = useState(workspace.path);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await update({
      workspaceId: workspace._id as Id<"workspaces">,
      name,
      path,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon-xs" aria-label="Edit">
            <Pencil size={ICON_SIZES.md} strokeWidth={1.2} />
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit workspace</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="Path">
            <Input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="font-mono"
            />
          </Field>
          <DialogFooter>
            <DialogClose
              render={
                <Button type="button" variant="outline" size="sm">
                  Cancel
                </Button>
              }
            />
            <Button type="submit" size="sm">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
