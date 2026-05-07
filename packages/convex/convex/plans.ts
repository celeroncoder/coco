import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireUser } from "./helpers";

export const byThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const userId = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) return [];
    return await ctx.db
      .query("plans")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .collect();
  },
});
