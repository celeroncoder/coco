import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireDevice, requireUser } from "./helpers";

export const pending = query({
  args: { deviceId: v.id("devices"), token: v.string() },
  handler: async (ctx, { deviceId, token }) => {
    await requireDevice(ctx, deviceId, token);
    const row = await ctx.db
      .query("runs")
      .withIndex("by_device_status", (q) =>
        q.eq("deviceId", deviceId).eq("status", "queued"),
      )
      .first();
    if (!row) return null;
    const skillDocs = await ctx.db
      .query("skills")
      .withIndex("by_device", (q) => q.eq("deviceId", deviceId))
      .collect();
    const skillPathByName = new Map(skillDocs.map((s) => [s.name, s.path]));
    const threadMessages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", row.threadId))
      .collect();
    const history = threadMessages
      .filter((m) => m._id !== row.userMessageId && m.text.length > 0)
      .sort((a, b) => a._creationTime - b._creationTime)
      .map((m) => ({ role: m.role, text: m.text }));
    return {
      _id: row._id,
      threadId: row.threadId,
      agent: row.agent,
      mode: row.mode,
      model: row.model,
      workspacePath: row.workspacePath,
      prompt: row.prompt,
      history,
      skills: row.skills.map((name) => ({
        name,
        path: skillPathByName.get(name),
      })),
    };
  },
});

export const queuedSummary = query({
  args: { deviceId: v.id("devices"), token: v.string() },
  handler: async (ctx, { deviceId, token }) => {
    await requireDevice(ctx, deviceId, token);
    const queued = await ctx.db
      .query("runs")
      .withIndex("by_device_status", (q) =>
        q.eq("deviceId", deviceId).eq("status", "queued"),
      )
      .collect();
    return {
      count: queued.length,
      runs: queued.map((r) => ({
        _id: r._id,
        agent: r.agent,
        mode: r.mode,
        workspacePath: r.workspacePath,
        prompt: r.prompt.slice(0, 200),
      })),
    };
  },
});

export const claim = mutation({
  args: { deviceId: v.id("devices"), token: v.string(), runId: v.id("runs") },
  handler: async (ctx, { deviceId, token, runId }) => {
    await requireDevice(ctx, deviceId, token);
    const run = await ctx.db.get(runId);
    if (!run) throw new Error("Run not found");
    if (run.deviceId !== deviceId) throw new Error("Wrong device");
    if (run.status !== "queued") return { ok: false as const };
    await ctx.db.patch(runId, { status: "running" });
    return { ok: true as const };
  },
});

export const appendEvent = mutation({
  args: {
    deviceId: v.id("devices"),
    token: v.string(),
    runId: v.id("runs"),
    event: v.object({
      type: v.string(),
      text: v.optional(v.string()),
    }),
  },
  handler: async (ctx, { deviceId, token, runId, event }) => {
    await requireDevice(ctx, deviceId, token);
    const run = await ctx.db.get(runId);
    if (!run || run.deviceId !== deviceId) throw new Error("Run not found");
    const ev = { ...event, ts: Date.now() };
    await ctx.db.patch(runId, { events: [...run.events, ev] });
    if (event.type === "text-delta" && event.text && run.assistantMessageId) {
      const msg = await ctx.db.get(run.assistantMessageId);
      if (msg) {
        await ctx.db.patch(run.assistantMessageId, {
          text: msg.text + event.text,
        });
      }
    }
  },
});

export const cancelRun = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, { threadId }) => {
    const userId = await requireUser(ctx);
    const thread = await ctx.db.get(threadId);
    if (!thread || thread.userId !== userId) throw new Error("Thread not found");
    const activeRun = await ctx.db
      .query("runs")
      .withIndex("by_thread", (q) => q.eq("threadId", threadId))
      .order("desc")
      .filter((q) =>
        q.or(q.eq(q.field("status"), "queued"), q.eq(q.field("status"), "running")),
      )
      .first();
    if (!activeRun) return { cancelled: false };
    await ctx.db.patch(activeRun._id, {
      status: "error",
      error: "Cancelled by user",
    });
    return { cancelled: true };
  },
});

export const isCancelled = query({
  args: { deviceId: v.id("devices"), token: v.string(), runId: v.id("runs") },
  handler: async (ctx, { deviceId, token, runId }) => {
    await requireDevice(ctx, deviceId, token);
    const run = await ctx.db.get(runId);
    if (!run || run.deviceId !== deviceId) return { cancelled: false };
    return {
      cancelled: run.status === "error" && run.error === "Cancelled by user",
    };
  },
});

export const finish = mutation({
  args: {
    deviceId: v.id("devices"),
    token: v.string(),
    runId: v.id("runs"),
    status: v.union(v.literal("done"), v.literal("error")),
    error: v.optional(v.string()),
    planPath: v.optional(v.string()),
    planContent: v.optional(v.string()),
  },
  handler: async (ctx, { deviceId, token, runId, status, error, planPath, planContent }) => {
    await requireDevice(ctx, deviceId, token);
    const run = await ctx.db.get(runId);
    if (!run || run.deviceId !== deviceId) throw new Error("Run not found");
    await ctx.db.patch(runId, { status, error });

    if (status === "done" && planPath && planContent) {
      await ctx.db.insert("plans", {
        threadId: run.threadId,
        runId,
        filePath: planPath,
        content: planContent,
      });
    }
  },
});
