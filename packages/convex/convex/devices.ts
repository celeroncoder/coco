import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDevice, requireUser } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("devices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const remove = mutation({
  args: { deviceId: v.id("devices") },
  handler: async (ctx, { deviceId }) => {
    const userId = await requireUser(ctx);
    const device = await ctx.db.get(deviceId);
    if (!device || device.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(deviceId);
  },
});

export const heartbeat = mutation({
  args: {
    deviceId: v.id("devices"),
    token: v.string(),
    installedAgents: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { deviceId, token, installedAgents }) => {
    await requireDevice(ctx, deviceId, token);
    const patch: {
      lastSeenAt: number;
      installedAgents?: string[];
    } = { lastSeenAt: Date.now() };
    if (installedAgents) patch.installedAgents = installedAgents;
    await ctx.db.patch(deviceId, patch);
  },
});
