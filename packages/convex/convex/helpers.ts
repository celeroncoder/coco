import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

export async function requireDevice(
  ctx: QueryCtx | MutationCtx,
  deviceId: Id<"devices">,
  token: string,
): Promise<Doc<"devices">> {
  const device = await ctx.db.get(deviceId);
  if (!device) throw new Error("Device not found");
  if (device.token !== token) throw new Error("Invalid device token");
  return device;
}
