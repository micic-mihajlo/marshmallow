import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // verify conversation ownership
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) return [];

    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();
  },
});

export const addMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    attachments: v.optional(v.array(v.id("fileAttachments"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // verify conversation ownership
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    // update conversation timestamp
    await ctx.db.patch(args.conversationId, {
      updatedAt: Date.now(),
    });

    console.log("[Messages] Adding message with attachments:", args.attachments?.length || 0);

    // If there are attachments, link them to this message
    if (args.attachments && args.attachments.length > 0) {
      console.log("[Messages] Linking attachments to message:", args.attachments);
      
      // Update each attachment to reference this message
      for (const attachmentId of args.attachments) {
        const attachment = await ctx.db.get(attachmentId);
        if (attachment && attachment.userId === user._id) {
          await ctx.db.patch(attachmentId, {
            messageId: undefined, // We'll set this after creating the message
          });
        }
      }
    }

    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      timestamp: Date.now(),
      attachments: args.attachments,
    });

    // Now update attachments to reference the created message
    if (args.attachments && args.attachments.length > 0) {
      console.log("[Messages] Updating attachment references to message:", messageId);
      for (const attachmentId of args.attachments) {
        const attachment = await ctx.db.get(attachmentId);
        if (attachment && attachment.userId === user._id) {
          await ctx.db.patch(attachmentId, {
            messageId,
          });
        }
      }
    }

    console.log("[Messages] Message added successfully:", messageId);
    return messageId;
  },
});

export const updateMessage = mutation({
  args: {
    id: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const message = await ctx.db.get(args.id);
    if (!message) throw new Error("Message not found");

    // verify ownership through conversation
    const conversation = await ctx.db.get(message.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || conversation.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.id, {
      content: args.content,
    });
  },
}); 