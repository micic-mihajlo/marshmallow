# Usage Monitoring & Admin Portal Enhancement Implementation Plan

## Overview
Enhance the admin portal with comprehensive usage tracking, request monitoring, and OpenRouter integration to provide detailed analytics on user activity, token consumption, costs, and system performance.

## Technical Stack
- **Backend**: Convex for data storage and real-time updates
- **Usage Tracking**: OpenRouter's built-in usage accounting API
- **User Tracking**: OpenRouter's user parameter for per-user analytics
- **Frontend**: Enhanced admin portal with real-time dashboards
- **Authentication**: Clerk with admin role verification

## Implementation Phases

### Phase 1: Database Schema Enhancement ✅
- [ ] Add usage tracking tables to Convex schema
- [ ] Add request logging tables with OpenRouter integration
- [ ] Add user activity tracking tables
- [ ] Add cost tracking and billing tables

### Phase 2: OpenRouter Integration Enhancement ✅
- [ ] Update chat action to include usage tracking
- [ ] Add user parameter to OpenRouter requests
- [ ] Capture and store usage statistics from responses
- [ ] Implement generation ID tracking for async usage retrieval

### Phase 3: Usage Tracking Backend ✅
- [ ] Create usage tracking mutations and queries
- [ ] Implement real-time usage aggregation
- [ ] Add cost calculation based on OpenRouter pricing
- [ ] Create user activity logging system

### Phase 4: Admin Portal Dashboard Enhancement ✅
- [ ] Upgrade metrics dashboard with usage analytics
- [ ] Add real-time usage monitoring charts
- [ ] Create user activity monitoring interface
- [ ] Add cost tracking and billing overview

### Phase 5: Request Monitoring System ✅
- [ ] Implement detailed request logging
- [ ] Add request success/failure tracking
- [ ] Create performance monitoring dashboard
- [ ] Add error tracking and alerting

### Phase 6: User Management Enhancement ✅
- [ ] Add per-user usage analytics
- [ ] Implement usage limits and quotas
- [ ] Create user billing and cost tracking
- [ ] Add user activity timeline

### Phase 7: Reporting & Analytics ✅
- [ ] Create exportable usage reports
- [ ] Add time-based analytics (daily, weekly, monthly)
- [ ] Implement usage forecasting
- [ ] Add comparative analytics between users/models

### Phase 8: Alerts & Monitoring ✅
- [ ] Implement usage threshold alerts
- [ ] Add cost monitoring alerts
- [ ] Create system health monitoring
- [ ] Add automated reporting

## Key Features Based on OpenRouter Documentation

### 1. **Usage Accounting Integration**
Based on OpenRouter's usage accounting API:

```typescript
// Enable usage tracking in requests
{
  "model": "anthropic/claude-3-opus",
  "messages": [...],
  "usage": {
    "include": true
  }
}

// Response includes detailed usage data
{
  "usage": {
    "completion_tokens": 2,
    "completion_tokens_details": {
      "reasoning_tokens": 0
    },
    "cost": 197,
    "prompt_tokens": 194,
    "prompt_tokens_details": {
      "cached_tokens": 0
    },
    "total_tokens": 196
  }
}
```

### 2. **User Tracking Integration**
Based on OpenRouter's user tracking feature:

```typescript
// Add user parameter for better caching and analytics
{
  "model": "openai/gpt-4o",
  "messages": [...],
  "user": "user_12345"  // Your internal user ID
}
```

**Benefits:**
- Improved caching performance (sticky caches per user)
- Enhanced reporting in OpenRouter dashboard
- Better load balancing across providers

## Detailed Implementation Steps

### 1. Enhanced Database Schema

#### Update `marshmallow/convex/schema.ts`:

```typescript
export default defineSchema({
  // ... existing tables

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
    costInCredits: v.number(), // OpenRouter cost
    costInUSD: v.number(), // Calculated cost
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
  .index("by_user_period", ["userId", "period", "periodKey"])
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
```

### 2. Enhanced OpenRouter Integration

Key changes to `marshmallow/convex/chat.ts`:

```typescript
// Enhanced request configuration
const requestConfig = {
  model: conversation.modelSlug,
  messages: formattedMessages,
  stream: true,
  max_tokens: 2000,
  // Enable usage tracking
  usage: {
    include: true,
  },
  // Add user tracking for better caching and analytics
  user: `user_${user._id}`,
  // Add metadata for request tracking
  metadata: {
    conversation_id: args.conversationId,
    user_id: user._id,
    request_id: requestLogId,
  },
};

// Capture usage data from streaming response
for await (const chunk of stream) {
  // ... content processing ...
  
  // Capture usage data from final chunk
  if (chunk.usage) {
    usageData = chunk.usage;
    console.log("[Chat] Usage data received:", usageData);
  }
}

// Store comprehensive usage tracking
if (usageData && generationId) {
  await ctx.runMutation(api.usageTracking.recordUsage, {
    userId: user._id,
    conversationId: args.conversationId,
    messageId: assistantMessageId,
    generationId,
    modelSlug: conversation.modelSlug,
    promptTokens: usageData.prompt_tokens || 0,
    completionTokens: usageData.completion_tokens || 0,
    totalTokens: usageData.total_tokens || 0,
    cachedTokens: usageData.prompt_tokens_details?.cached_tokens || 0,
    reasoningTokens: usageData.completion_tokens_details?.reasoning_tokens || 0,
    costInCredits: usageData.cost || 0,
    costInUSD: (usageData.cost || 0) * 0.000001, // Convert credits to USD
    timestamp: endTime,
    processingTimeMs: processingTime,
  });
}
```

### 3. Admin Dashboard Features

#### Enhanced Usage Dashboard Components:

1. **Real-time Usage Monitoring**
   - Live request volume charts
   - Token consumption trends
   - Cost tracking over time
   - Success/failure rate monitoring

2. **User Analytics**
   - Top users by usage
   - Per-user cost breakdown
   - Activity timelines
   - Usage pattern analysis

3. **Performance Monitoring**
   - Response time tracking
   - Error rate monitoring
   - Model performance comparison
   - System health indicators

4. **Cost Management**
   - Daily/monthly cost tracking
   - Budget alerts and thresholds
   - Model cost comparison
   - Usage forecasting

5. **Alert System**
   - Usage threshold alerts
   - Cost monitoring alerts
   - Error rate alerts
   - System health notifications

## Benefits of This Implementation

### 1. **Comprehensive Visibility**
- ✅ Real-time usage monitoring across all users
- ✅ Detailed cost tracking and budgeting
- ✅ Performance monitoring and optimization
- ✅ User behavior analysis and insights

### 2. **OpenRouter Integration**
- ✅ Accurate token counting using native tokenizers
- ✅ Real-time cost tracking without additional API calls
- ✅ Improved caching through user tracking
- ✅ Detailed usage breakdowns (cached, reasoning tokens)

### 3. **Business Intelligence**
- ✅ Usage forecasting and capacity planning
- ✅ Cost optimization opportunities
- ✅ User engagement metrics
- ✅ Model performance comparison

### 4. **Operational Excellence**
- ✅ Proactive monitoring and alerting
- ✅ Performance optimization insights
- ✅ Error tracking and debugging
- ✅ Automated reporting and analytics

## Implementation Priority

**Phase 1-2: Core Infrastructure** (High Priority)
- Database schema updates
- OpenRouter integration enhancement
- Basic usage tracking

**Phase 3-4: Admin Dashboard** (Medium Priority)  
- Usage tracking backend
- Enhanced admin portal
- Real-time monitoring

**Phase 5-8: Advanced Features** (Lower Priority)
- Request monitoring system
- User management enhancement
- Reporting and analytics
- Alerts and monitoring

This implementation will transform your admin portal into a comprehensive monitoring and analytics platform, providing deep insights into usage patterns, costs, and system performance while maintaining excellent user experience. 