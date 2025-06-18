import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createConversation = mutation({
  args: {
    title: v.string(),
    modelSlug: v.optional(v.string()),
    mcpUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");


    // If no model is specified, use the user's preferred default model
    let modelSlug = args.modelSlug;
    if (!modelSlug) {
      // Get user's enabled preferences
      const preferences = await ctx.db
        .query("userModelPreferences")
        .withIndex("by_user_enabled", (q) => q.eq("userId", user._id).eq("isEnabled", true))
        .collect();

      // If user has preferences, find the highest priority enabled model
      if (preferences.length > 0) {
        // Sort preferences by display order
        const sortedPreferences = preferences.sort((a, b) => {
          const aOrder = a.displayOrder || 999;
          const bOrder = b.displayOrder || 999;
          return aOrder - bOrder;
        });

        // Find the first enabled model
        for (const pref of sortedPreferences) {
          const model = await ctx.db.get(pref.modelId);
          if (model) {
            // Check if model is still admin-enabled
            const settings = await ctx.db
              .query("modelSettings")
              .withIndex("by_model", (q) => q.eq("modelId", model._id))
              .first();
            
            if (settings && settings.enabled) {
              modelSlug = model.slug;
              break;
            }
          }
        }
      }

      // If still no model found, fall back to Gemini Flash
      if (!modelSlug) {
        const geminiFlashModel = await ctx.db
          .query("models")
          .withIndex("by_slug", (q) => q.eq("slug", "google/gemini-flash-1.5"))
          .first();

        if (geminiFlashModel) {
          modelSlug = geminiFlashModel.slug;
        } else {
          // Final fallback
          modelSlug = "google/gemini-flash-1.5";
        }
      }
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

export const updateConversationMcpUrl = mutation({
  args: {
    id: v.id("conversations"),
    mcpUrl: v.optional(v.string()),
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
      mcpUrl: args.mcpUrl ?? undefined,
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

export const updateConversationWebSearch = mutation({
  args: {
    id: v.id("conversations"),
    enabled: v.boolean(),
    options: v.optional(v.object({
      maxResults: v.optional(v.number()),
      searchContextSize: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    })),
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
      webSearchEnabled: args.enabled,
      webSearchOptions: args.options,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});

// Sharing functionality
export const toggleConversationSharing = mutation({
  args: {
    id: v.id("conversations"),
    isPublic: v.boolean(),
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

    // Generate a unique share ID if enabling sharing for the first time
    let shareId = conversation.shareId;
    if (args.isPublic && !shareId) {
      // Generate a unique share ID (combination of timestamp and random string)
      shareId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    await ctx.db.patch(args.id, {
      isPublic: args.isPublic,
      shareId: shareId,
      updatedAt: Date.now(),
    });

    return shareId;
  },
});

// Get public conversation by share ID (no auth required)
export const getPublicConversation = query({
  args: { shareId: v.string() },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!conversation || !conversation.isPublic) {
      return null;
    }

    // Get the owner's name for display
    const owner = await ctx.db.get(conversation.userId);

    return {
      conversation,
      ownerName: owner?.name || "Anonymous",
    };
  },
});

// Clone a shared conversation for the current user
export const cloneConversation = mutation({
  args: {
    shareId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Get the original conversation
    const originalConversation = await ctx.db
      .query("conversations")
      .withIndex("by_share_id", (q) => q.eq("shareId", args.shareId))
      .first();

    if (!originalConversation || !originalConversation.isPublic) {
      throw new Error("Conversation not found or not public");
    }

    // Get all messages from the original conversation
    const originalMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", originalConversation._id))
      .collect();

    // Create new conversation
    const now = Date.now();
    const newConversationId = await ctx.db.insert("conversations", {
      userId: user._id,
      title: `${originalConversation.title} (Copy)`,
      modelSlug: originalConversation.modelSlug,
      webSearchEnabled: originalConversation.webSearchEnabled,
      webSearchOptions: originalConversation.webSearchOptions,
      createdAt: now,
      updatedAt: now,
    });

    // Copy all messages to the new conversation
    for (const message of originalMessages) {
      await ctx.db.insert("messages", {
        conversationId: newConversationId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        tokenCount: message.tokenCount,
        // Note: We don't copy file attachments to avoid permission issues
      });
    }

    return newConversationId;
  },
}); 