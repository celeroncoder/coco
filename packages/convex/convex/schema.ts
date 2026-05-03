import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  devices: defineTable({
    userId: v.string(),
    name: v.string(),
    platform: v.optional(v.string()),
    token: v.string(),
    lastSeenAt: v.number(),
    installedAgents: v.optional(v.array(v.string())),
  })
    .index("by_user", ["userId"])
    .index("by_token", ["token"]),

  pairingCodes: defineTable({
    code: v.string(),
    deviceName: v.string(),
    platform: v.optional(v.string()),
    expiresAt: v.number(),
    claimedByUserId: v.optional(v.string()),
    deviceId: v.optional(v.id("devices")),
    deviceToken: v.optional(v.string()),
  }).index("by_code", ["code"]),

  workspaces: defineTable({
    userId: v.string(),
    deviceId: v.id("devices"),
    name: v.string(),
    path: v.string(),
  })
    .index("by_device", ["deviceId"])
    .index("by_user", ["userId"]),

  skills: defineTable({
    deviceId: v.id("devices"),
    name: v.string(),
    description: v.optional(v.string()),
    path: v.string(),
  }).index("by_device", ["deviceId"]),

  threads: defineTable({
    userId: v.string(),
    deviceId: v.id("devices"),
    workspaceId: v.id("workspaces"),
    agent: v.string(),
    mode: v.optional(v.string()),
    model: v.optional(v.string()),
    title: v.string(),
    opencodeSessionId: v.optional(v.string()),
    opencodeServerUrl: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_workspace", ["workspaceId"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    text: v.string(),
  }).index("by_thread", ["threadId"]),

  runs: defineTable({
    threadId: v.id("threads"),
    deviceId: v.id("devices"),
    userMessageId: v.id("messages"),
    assistantMessageId: v.optional(v.id("messages")),
    agent: v.string(),
    mode: v.optional(v.string()),
    model: v.optional(v.string()),
    workspacePath: v.string(),
    skills: v.array(v.string()),
    prompt: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    events: v.array(
      v.object({
        type: v.string(),
        text: v.optional(v.string()),
        ts: v.number(),
      }),
    ),
  })
    .index("by_thread", ["threadId"])
    .index("by_device_status", ["deviceId", "status"]),
});
