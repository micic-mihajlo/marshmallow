import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Generate upload URL for file
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    console.log("[FileStorage] Generating upload URL...");
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.error("[FileStorage] Not authenticated - no identity found");
      throw new ConvexError("Not authenticated");
    }
    
    console.log("[FileStorage] User authenticated:", identity.subject);
    
    const uploadUrl = await ctx.storage.generateUploadUrl();
    console.log("[FileStorage] Generated upload URL successfully");
    
    return uploadUrl;
  },
});

// Store file metadata after upload
export const storeFileMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    console.log("[FileStorage] Storing file metadata:", {
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      conversationId: args.conversationId,
      messageId: args.messageId,
    });

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.error("[FileStorage] Not authenticated during metadata storage");
      throw new ConvexError("Not authenticated");
    }

    console.log("[FileStorage] User authenticated:", identity.subject);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      console.error("[FileStorage] User not found in database:", identity.subject);
      throw new ConvexError("User not found");
    }

    console.log("[FileStorage] User found:", user._id);

    // Verify conversation ownership
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      console.error("[FileStorage] Conversation not found:", args.conversationId);
      throw new ConvexError("Conversation not found");
    }
    
    if (conversation.userId !== user._id) {
      console.error("[FileStorage] Unauthorized access - conversation belongs to different user:", {
        conversationUserId: conversation.userId,
        currentUserId: user._id,
      });
      throw new ConvexError("Unauthorized");
    }

    console.log("[FileStorage] Conversation ownership verified");

    const attachmentId = await ctx.db.insert("fileAttachments", {
      userId: user._id,
      conversationId: args.conversationId,
      messageId: args.messageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      storageId: args.storageId,
      createdAt: Date.now(),
      uploadedAt: Date.now(),
    });

    console.log("[FileStorage] File metadata stored successfully:", attachmentId);
    return attachmentId;
  },
});

// Get file URL for serving
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    console.log("[FileStorage] Getting file URL for storage ID:", args.storageId);
    
    const url = await ctx.storage.getUrl(args.storageId);
    
    if (!url) {
      console.error("[FileStorage] No URL returned for storage ID:", args.storageId);
      return null;
    }
    
    console.log("[FileStorage] File URL generated successfully");
    return url;
  },
});

// Get file attachments for a message
export const getMessageAttachments = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    console.log("[FileStorage] Getting attachments for message:", args.messageId);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("[FileStorage] Not authenticated - returning empty attachments");
      return [];
    }

    console.log("[FileStorage] User authenticated:", identity.subject);

    const attachments = await ctx.db
      .query("fileAttachments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    console.log("[FileStorage] Found", attachments.length, "attachments");

    // Generate URLs for all attachments
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        console.log("[FileStorage] Generating URL for attachment:", attachment._id);
        const url = await ctx.storage.getUrl(attachment.storageId);
        
        if (!url) {
          console.error("[FileStorage] Failed to generate URL for attachment:", attachment._id);
        }
        
        return {
          ...attachment,
          url,
        };
      })
    );

    console.log("[FileStorage] All attachment URLs generated successfully");
    return attachmentsWithUrls;
  },
});

// Get file attachments for a conversation (for cleanup or listing)
export const getConversationAttachments = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    console.log("[FileStorage] Getting attachments for conversation:", args.conversationId);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("[FileStorage] Not authenticated - returning empty attachments");
      return [];
    }

    const attachments = await ctx.db
      .query("fileAttachments")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    console.log("[FileStorage] Found", attachments.length, "attachments for conversation");

    // Generate URLs for all attachments
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const url = await ctx.storage.getUrl(attachment.storageId);
        return {
          ...attachment,
          url,
        };
      })
    );

    return attachmentsWithUrls;
  },
});

// Get single file attachment by ID
export const getFileAttachment = query({
  args: { attachmentId: v.id("fileAttachments") },
  handler: async (ctx, args) => {
    console.log("[FileStorage] Getting single attachment:", args.attachmentId);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.log("[FileStorage] Not authenticated - returning null");
      return null;
    }

    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) {
      console.error("[FileStorage] Attachment not found:", args.attachmentId);
      return null;
    }

    console.log("[FileStorage] Attachment found, generating URL");
    const url = await ctx.storage.getUrl(attachment.storageId);
    
    return {
      ...attachment,
      url,
    };
  },
});

// Delete file attachment
export const deleteFileAttachment = mutation({
  args: { attachmentId: v.id("fileAttachments") },
  handler: async (ctx, args) => {
    console.log("[FileStorage] Deleting attachment:", args.attachmentId);
    
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      console.error("[FileStorage] Not authenticated for deletion");
      throw new ConvexError("Not authenticated");
    }

    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) {
      console.error("[FileStorage] Attachment not found for deletion:", args.attachmentId);
      throw new ConvexError("Attachment not found");
    }

    console.log("[FileStorage] Attachment found, verifying ownership");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || attachment.userId !== user._id) {
      console.error("[FileStorage] Unauthorized deletion attempt:", {
        attachmentUserId: attachment.userId,
        currentUserId: user?._id,
      });
      throw new ConvexError("Unauthorized");
    }

    console.log("[FileStorage] Ownership verified, deleting from storage");

    try {
      // Delete from storage
      await ctx.storage.delete(attachment.storageId);
      console.log("[FileStorage] File deleted from storage successfully");
    } catch (error) {
      console.error("[FileStorage] Error deleting from storage:", error);
      // Continue with metadata deletion even if storage deletion fails
    }
    
    // Delete metadata
    await ctx.db.delete(args.attachmentId);
    console.log("[FileStorage] Attachment metadata deleted successfully");
  },
}); 