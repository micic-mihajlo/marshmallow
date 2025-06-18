import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    apiKey: v.optional(v.string()), // encrypted user's OpenRouter API key
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))), // user role
  }).index("by_clerk_id", ["clerkId"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    modelSlug: v.string(), // e.g., "anthropic/claude-3-haiku"
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    tokenCount: v.optional(v.number()), // tokens used for this message
    attachments: v.optional(v.array(v.id("fileAttachments"))), // file attachment IDs
  }).index("by_conversation", ["conversationId"]),

  fileAttachments: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")), // null for pending uploads
    fileName: v.string(),
    fileType: v.string(), // mime type
    fileSize: v.number(),
    storageId: v.id("_storage"), // Convex file storage ID
    createdAt: v.number(),
    uploadedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_message", ["messageId"]),

  // Admin Portal Tables
  models: defineTable({
    name: v.string(), // e.g., "Claude 3 Haiku"
    slug: v.string(), // e.g., "anthropic/claude-3-haiku"
    provider: v.string(), // e.g., "anthropic", "openai", "google"
    description: v.optional(v.string()),
    supportsFileUpload: v.boolean(),
    supportsImageUpload: v.boolean(),
    supportsVision: v.boolean(),
    supportsStreaming: v.boolean(),
    maxTokens: v.optional(v.number()),
    costPer1kTokens: v.optional(v.number()), // in USD
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"])
    .index("by_provider", ["provider"]),

  modelSettings: defineTable({
    modelId: v.id("models"),
    enabled: v.boolean(),
    allowFileUpload: v.boolean(),
    allowImageUpload: v.boolean(),
    allowVision: v.boolean(),
    allowStreaming: v.boolean(),
    maxTokensOverride: v.optional(v.number()),
    rateLimitPerUser: v.optional(v.number()), // messages per hour
    updatedAt: v.number(),
  }).index("by_model", ["modelId"])
    .index("by_enabled", ["enabled"]),

  metrics: defineTable({
    date: v.string(), // YYYY-MM-DD format for daily metrics
    totalUsers: v.number(),
    activeUsers: v.number(), // users who sent messages today
    totalConversations: v.number(),
    totalMessages: v.number(),
    totalTokensUsed: v.number(),
    totalCost: v.number(), // estimated cost in USD
    modelUsage: v.object({
      // modelSlug -> count
    }),
    createdAt: v.number(),
  }).index("by_date", ["date"]),

  // Admin activity logs
  adminLogs: defineTable({
    adminId: v.id("users"), // The admin who performed the action
    action: v.string(), // e.g., "model_created", "user_role_changed", "settings_updated"
    targetType: v.optional(v.string()), // e.g., "user", "model", "settings"
    targetId: v.optional(v.string()), // ID of the affected resource
    details: v.any(), // Additional details about the action (flexible object)
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  }).index("by_admin", ["adminId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),
});
