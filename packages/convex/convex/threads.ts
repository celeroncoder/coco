import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const userId = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) return null;
    return thread;
  },
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    agent: v.string(),
    mode: v.optional(v.string()),
    model: v.optional(v.string()),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const ws = await ctx.db.get(args.workspaceId);
    if (!ws || ws.userId !== userId) throw new Error("Workspace not found");
    return await ctx.db.insert("threads", {
      userId,
      deviceId: ws.deviceId,
      workspaceId: args.workspaceId,
      agent: args.agent,
      mode: args.mode,
      model: args.model,
      title: args.title,
    });
  },
});

export const remove = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const userId = await requireUser(ctx);
    const t = await ctx.db.get(threadId);
    if (!t || t.userId !== userId) throw new Error("Not found");
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
    for (const m of msgs) await ctx.db.delete(m._id);
    const runs = await ctx.db
      .query("runs")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
    for (const r of runs) await ctx.db.delete(r._id);
    await ctx.db.delete(threadId);
  },
});

export const updateMode = mutation({
  args: { threadId: v.id("threads"), mode: v.string() },
  handler: async (ctx, { threadId, mode }) => {
    const userId = await requireUser(ctx);
    const t = await ctx.db.get(threadId);
    if (!t || t.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(threadId, { mode });
  },
});

export const updateModel = mutation({
  args: { threadId: v.id("threads"), model: v.string() },
  handler: async (ctx, { threadId, model }) => {
    const userId = await requireUser(ctx);
    const t = await ctx.db.get(threadId);
    if (!t || t.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(threadId, { model });
  },
});

export const messages = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const userId = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
  },
});

export const runs = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const userId = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) return [];
    return await ctx.db
      .query("runs")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .collect();
  },
});

export const send = mutation({
  args: {
    threadId: v.id("threads"),
    prompt: v.string(),
    skills: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const thread = await ctx.db.get(args.threadId);
    if (!thread || thread.userId !== userId) throw new Error("Not found");
    const ws = await ctx.db.get(thread.workspaceId);
    if (!ws) throw new Error("Workspace missing");

    const userMessageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "user",
      text: args.prompt,
    });
    const assistantMessageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "assistant",
      text: "",
    });
    const runId = await ctx.db.insert("runs", {
      threadId: args.threadId,
      deviceId: thread.deviceId,
      userMessageId,
      assistantMessageId,
      agent: thread.agent,
      mode: thread.mode,
      model: thread.model,
      workspacePath: ws.path,
      skills: args.skills,
      prompt: args.prompt,
      status: "queued",
      events: [],
    });
    return { runId, userMessageId, assistantMessageId };
  },
});
