import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const updateUserApiKey = mutation({
  args: {
    encryptedApiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Update the user's API key (can be undefined to remove it)
    await ctx.db.patch(user._id, {
      apiKey: args.encryptedApiKey ?? undefined,
    });

    console.log(`[UserApiKeys] ${args.encryptedApiKey ? 'Updated' : 'Removed'} API key for user:`, identity.subject);

    return { success: true };
  },
});

export const updateBYOKPreference = mutation({
  args: {
    useBYOK: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Update the user's BYOK preference
    await ctx.db.patch(user._id, {
      useBYOK: args.useBYOK,
    });

    console.log(`[UserApiKeys] Updated BYOK preference to ${args.useBYOK} for user:`, identity.subject);

    return { success: true };
  },
});

export const removeUserApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Explicitly remove the API key and disable BYOK
    await ctx.db.patch(user._id, {
      apiKey: undefined,
      useBYOK: false,
    });

    console.log("[UserApiKeys] Removed API key and disabled BYOK for user:", identity.subject);

    return { success: true };
  },
});

export const getUserApiKey = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return {
      hasApiKey: !!user?.apiKey,
      useBYOK: user?.useBYOK || false,
    };
  },
}); 