import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Log a new request
export const logRequest = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    requestType: v.string(),
    method: v.string(),
    endpoint: v.string(),
    status: v.string(),
    timestamp: v.number(),
    userAgent: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log("[RequestLogs] Logging request:", args);
    
    const requestId = await ctx.db.insert("requestLogs", {
      ...args,
      processingTimeMs: 0, // Will be updated when request completes
    });

    console.log("[RequestLogs] Request logged:", requestId);
    return requestId;
  },
});

// Update request with completion details
export const updateRequest = mutation({
  args: {
    id: v.id("requestLogs"),
    status: v.string(),
    statusCode: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    processingTimeMs: v.number(),
    requestSize: v.optional(v.number()),
    responseSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("[RequestLogs] Updating request:", args);
    
    const { id, ...updateData } = args;
    await ctx.db.patch(id, updateData);

    console.log("[RequestLogs] Request updated:", id);
    return id;
  },
});

// Get recent requests
export const getRecentRequests = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("requestLogs").withIndex("by_timestamp").order("desc");
    
    if (args.userId) {
      query = ctx.db.query("requestLogs").withIndex("by_user", (q) => q.eq("userId", args.userId)).order("desc");
    }

    const requests = await query.take(args.limit || 100);

    // Filter by status if provided
    const filteredRequests = args.status 
      ? requests.filter(req => req.status === args.status)
      : requests;

    // Get user details for each request
    const enrichedRequests = await Promise.all(
      filteredRequests.map(async (request) => {
        const user = request.userId ? await ctx.db.get(request.userId) : null;
        return {
          ...request,
          user: user ? { name: user.name, email: user.email } : null,
        };
      })
    );

    return enrichedRequests;
  },
});

// Get request statistics
export const getRequestStats = query({
  args: {
    period: v.optional(v.string()), // "daily", "weekly", "monthly"
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const startDate = args.period ? getStartDateForPeriod(args.period) : 0;
    
    let query = ctx.db.query("requestLogs").withIndex("by_timestamp");
    
    if (args.userId) {
      query = ctx.db.query("requestLogs").withIndex("by_user", (q) => q.eq("userId", args.userId));
    }

    const requests = await query
      .filter((q) => q.gte(q.field("timestamp"), startDate))
      .collect();

    const stats = {
      totalRequests: requests.length,
      successfulRequests: requests.filter(r => r.status === "success").length,
      failedRequests: requests.filter(r => r.status === "error").length,
      pendingRequests: requests.filter(r => r.status === "pending").length,
      avgProcessingTime: requests.length > 0 
        ? requests.reduce((sum, r) => sum + r.processingTimeMs, 0) / requests.length
        : 0,
      requestTypes: {} as Record<string, number>,
      errorBreakdown: {} as Record<string, number>,
    };

    // Request type breakdown
    requests.forEach(request => {
      stats.requestTypes[request.requestType] = (stats.requestTypes[request.requestType] || 0) + 1;
    });

    // Error breakdown
    requests.filter(r => r.status === "error").forEach(request => {
      const errorType = request.errorMessage || "Unknown error";
      stats.errorBreakdown[errorType] = (stats.errorBreakdown[errorType] || 0) + 1;
    });

    return stats;
  },
});

// Helper function
function getStartDateForPeriod(period: string): number {
  const now = new Date();
  
  switch (period) {
    case "daily":
      return now.getTime() - (24 * 60 * 60 * 1000); // 1 day
    case "weekly":
      return now.getTime() - (7 * 24 * 60 * 60 * 1000); // 7 days
    case "monthly":
      return now.getTime() - (30 * 24 * 60 * 60 * 1000); // 30 days
    default:
      return now.getTime() - (7 * 24 * 60 * 60 * 1000); // Default to 7 days
  }
} 