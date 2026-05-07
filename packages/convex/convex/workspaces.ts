import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDevice, requireUser } from "./helpers";

export const getById = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireUser(ctx);
    const ws = await ctx.db.get(workspaceId);
    if (!ws || ws.userId !== userId) return null;
    return ws;
  },
});

export const list = query({
  args: { deviceId: v.optional(v.id("devices")) },
  handler: async (ctx, { deviceId }) => {
    const userId = await requireUser(ctx);
    if (deviceId) {
      const device = await ctx.db.get(deviceId);
      if (!device || device.userId !== userId) return [];
      return await ctx.db
        .query("workspaces")
        .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
        .collect();
    }
    return await ctx.db
      .query("workspaces")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    deviceId: v.id("devices"),
    name: v.string(),
    path: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const device = await ctx.db.get(args.deviceId);
    if (!device || device.userId !== userId) throw new Error("Device not found");
    return await ctx.db.insert("workspaces", {
      userId,
      deviceId: args.deviceId,
      name: args.name,
      path: args.path,
    });
  },
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.optional(v.string()),
    path: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const ws = await ctx.db.get(args.workspaceId);
    if (!ws || ws.userId !== userId) throw new Error("Not found");
    const patch: Record<string, string> = {};
    if (args.name !== undefined) patch.name = args.name;
    if (args.path !== undefined) patch.path = args.path;
    await ctx.db.patch(args.workspaceId, patch);
  },
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    const userId = await requireUser(ctx);
    const ws = await ctx.db.get(workspaceId);
    if (!ws || ws.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(workspaceId);
  },
});

export const listForDevice = query({
  args: { deviceId: v.id("devices"), token: v.string() },
  handler: async (ctx, { deviceId, token }) => {
    await requireDevice(ctx, deviceId, token);
    return await ctx.db
      .query("workspaces")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .collect();
  },
});
