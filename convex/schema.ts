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

  // Usage Tracking Tables
  usageTracking: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    generationId: v.string(), // OpenRouter generation ID
    modelSlug: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    costInCredits: v.number(), // OpenRouter cost in credits
    costInUSD: v.number(), // Calculated cost in USD
    timestamp: v.number(),
    processingTimeMs: v.optional(v.number()),
  })
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_model", ["modelSlug"])
  .index("by_timestamp", ["timestamp"])
  .index("by_generation", ["generationId"]),

  requestLogs: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    requestType: v.string(), // "chat_completion", "file_upload", etc.
    method: v.string(), // HTTP method
    endpoint: v.string(), // API endpoint
    status: v.string(), // "success", "error", "pending"
    statusCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    requestSize: v.optional(v.number()), // in bytes
    responseSize: v.optional(v.number()), // in bytes
    processingTimeMs: v.number(),
    timestamp: v.number(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    metadata: v.optional(v.any()), // Additional request metadata
  })
  .index("by_user", ["userId"])
  .index("by_status", ["status"])
  .index("by_timestamp", ["timestamp"])
  .index("by_type", ["requestType"]),

  userActivity: defineTable({
    userId: v.id("users"),
    activityType: v.string(), // "login", "message_sent", "file_uploaded", etc.
    sessionId: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    details: v.optional(v.any()),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  })
  .index("by_user", ["userId"])
  .index("by_type", ["activityType"])
  .index("by_timestamp", ["timestamp"])
  .index("by_session", ["sessionId"]),

  usageAggregates: defineTable({
    userId: v.optional(v.id("users")), // null for system-wide aggregates
    period: v.string(), // "hourly", "daily", "weekly", "monthly"
    periodKey: v.string(), // "2024-01-15", "2024-01-W3", etc.
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    totalTokens: v.number(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalCostUSD: v.number(),
    avgProcessingTimeMs: v.number(),
    uniqueModelsUsed: v.number(),
    conversationsStarted: v.number(),
    filesUploaded: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_period", ["period", "periodKey"])
  .index("by_user", ["userId"]),

  userQuotas: defineTable({
    userId: v.id("users"),
    quotaType: v.string(), // "monthly_tokens", "daily_requests", etc.
    limit: v.number(),
    used: v.number(),
    resetDate: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_type", ["quotaType"])
  .index("by_reset_date", ["resetDate"]),

  // User Model Preferences
  userModelPreferences: defineTable({
    userId: v.id("users"),
    modelId: v.id("models"),
    isEnabled: v.boolean(), // User has enabled this model for their use
    displayOrder: v.optional(v.number()), // Custom ordering by user
    createdAt: v.number(),
    updatedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_model", ["modelId"])
  .index("by_user_enabled", ["userId", "isEnabled"]),

  systemAlerts: defineTable({
    alertType: v.string(), // "high_usage", "cost_threshold", "error_rate", etc.
    severity: v.string(), // "low", "medium", "high", "critical"
    title: v.string(),
    message: v.string(),
    userId: v.optional(v.id("users")), // null for system-wide alerts
    metadata: v.optional(v.any()),
    isRead: v.boolean(),
    isResolved: v.boolean(),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
  .index("by_type", ["alertType"])
  .index("by_severity", ["severity"])
  .index("by_user", ["userId"])
  .index("by_status", ["isRead", "isResolved"])
  .index("by_timestamp", ["createdAt"]),
});
