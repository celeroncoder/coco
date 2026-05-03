import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./helpers";

const CODE_TTL_MS = 10 * 60 * 1000;

function randomCode(len: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const createCode = mutation({
  args: {
    deviceName: v.string(),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const code = randomCode(8);
    const expiresAt = Date.now() + CODE_TTL_MS;
    await ctx.db.insert("pairingCodes", {
      code,
      deviceName: args.deviceName,
      platform: args.platform,
      expiresAt,
    });
    return { code, expiresAt };
  },
});

export const poll = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const row = await ctx.db
      .query("pairingCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!row) return { status: "not_found" as const };
    if (row.expiresAt < Date.now() && !row.claimedByUserId) {
      return { status: "expired" as const };
    }
    if (!row.claimedByUserId || !row.deviceId || !row.deviceToken) {
      return { status: "pending" as const };
    }
    return {
      status: "claimed" as const,
      deviceId: row.deviceId,
      deviceToken: row.deviceToken,
    };
  },
});

export const claim = mutation({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const userId = await requireUser(ctx);
    const row = await ctx.db
      .query("pairingCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (!row) throw new Error("Invalid code");
    if (row.claimedByUserId) throw new Error("Code already claimed");
    if (row.expiresAt < Date.now()) throw new Error("Code expired");

    const token = randomToken();
    const deviceId = await ctx.db.insert("devices", {
      userId,
      name: row.deviceName,
      platform: row.platform,
      token,
      lastSeenAt: Date.now(),
    });
    await ctx.db.patch(row._id, {
      claimedByUserId: userId,
      deviceId,
      deviceToken: token,
    });
    return { ok: true };
  },
});
