import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDevice, requireUser } from "./helpers";

export const listForUser = query({
  args: { deviceId: v.id("devices") },
  handler: async (ctx, { deviceId }) => {
    const userId = await requireUser(ctx);
    const device = await ctx.db.get(deviceId);
    if (!device || device.userId !== userId) return [];
    return await ctx.db
      .query("skills")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .collect();
  },
});

export const sync = mutation({
  args: {
    deviceId: v.id("devices"),
    token: v.string(),
    skills: v.array(
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        path: v.string(),
      }),
    ),
  },
  handler: async (ctx, { deviceId, token, skills }) => {
    await requireDevice(ctx, deviceId, token);
    const existing = await ctx.db
      .query("skills")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);
    for (const s of skills) {
      await ctx.db.insert("skills", {
        deviceId,
        name: s.name,
        description: s.description,
        path: s.path,
      });
    }
  },
});
