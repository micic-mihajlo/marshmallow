import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createConversation = mutation({
  args: {
    title: v.string(),
    modelSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // If no model is specified, use the first enabled model
    let modelSlug = args.modelSlug;
    if (!modelSlug) {
      const enabledSettings = await ctx.db
        .query("modelSettings")
        .withIndex("by_enabled", (q) => q.eq("enabled", true))
        .first();
      
      if (enabledSettings) {
        const model = await ctx.db.get(enabledSettings.modelId);
        if (model) {
          modelSlug = model.slug;
        }
      }
      
      // Fallback to a default model if no enabled models exist
      modelSlug = modelSlug || "anthropic/claude-3-haiku";
    }

    const now = Date.now();
    return await ctx.db.insert("conversations", {
      userId: user._id,
      title: args.title,
      modelSlug,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getUserConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getConversation = query({
  args: { id: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const conversation = await ctx.db.get(args.id);
    if (!conversation) return null;

    // verify ownership
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) return null;

    return conversation;
  },
});

export const updateConversationModel = mutation({
  args: {
    id: v.id("conversations"),
    modelSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.id);
    if (!conversation) throw new Error("Conversation not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      modelSlug: args.modelSlug,
      updatedAt: Date.now(),
    });
  },
});

export const updateConversationTitle = mutation({
  args: {
    id: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.id);
    if (!conversation) throw new Error("Conversation not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

export const deleteConversation = mutation({
  args: {
    id: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const conversation = await ctx.db.get(args.id);
    if (!conversation) throw new Error("Conversation not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // delete all messages in the conversation
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.id))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // delete the conversation
    await ctx.db.delete(args.id);
  },
}); 