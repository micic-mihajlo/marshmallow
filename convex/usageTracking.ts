import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Record usage data from OpenRouter response
export const recordUsage = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
    generationId: v.string(),
    modelSlug: v.string(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    cachedTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    costInCredits: v.number(),
    costInUSD: v.number(),
    timestamp: v.number(),
    processingTimeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    console.log("[UsageTracking] Recording usage:", args);

    // Store detailed usage record
    const usageId = await ctx.db.insert("usageTracking", args);

    // Update aggregates
    await updateUsageAggregates(ctx, args);

    console.log("[UsageTracking] Usage recorded:", usageId);
    return usageId;
  },
});

// Get usage statistics for a user
export const getUserUsageStats = query({
  args: {
    userId: v.id("users"),
    period: v.optional(v.string()), // "daily", "weekly", "monthly"
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const usageRecords = await ctx.db
      .query("usageTracking")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => 
        args.startDate && args.endDate
          ? q.and(
              q.gte(q.field("timestamp"), args.startDate),
              q.lte(q.field("timestamp"), args.endDate)
            )
          : true
      )
      .collect();

    // Aggregate statistics
    const stats = {
      totalRequests: usageRecords.length,
      totalTokens: usageRecords.reduce((sum, r) => sum + r.totalTokens, 0),
      promptTokens: usageRecords.reduce((sum, r) => sum + r.promptTokens, 0),
      completionTokens: usageRecords.reduce((sum, r) => sum + r.completionTokens, 0),
      cachedTokens: usageRecords.reduce((sum, r) => sum + (r.cachedTokens || 0), 0),
      totalCost: usageRecords.reduce((sum, r) => sum + r.costInUSD, 0),
      avgProcessingTime: usageRecords.length > 0 
        ? usageRecords.reduce((sum, r) => sum + (r.processingTimeMs || 0), 0) / usageRecords.length
        : 0,
      modelBreakdown: {} as Record<string, { count: number; tokens: number; cost: number }>,
      dailyUsage: [] as Array<{ date: string; tokens: number; cost: number; requests: number }>,
    };

    // Model usage breakdown
    usageRecords.forEach(record => {
      if (!stats.modelBreakdown[record.modelSlug]) {
        stats.modelBreakdown[record.modelSlug] = {
          count: 0,
          tokens: 0,
          cost: 0,
        };
      }
      stats.modelBreakdown[record.modelSlug].count++;
      stats.modelBreakdown[record.modelSlug].tokens += record.totalTokens;
      stats.modelBreakdown[record.modelSlug].cost += record.costInUSD;
    });

    // Daily usage aggregation
    const dailyMap = new Map<string, { tokens: number; cost: number; requests: number }>();
    usageRecords.forEach(record => {
      const date = new Date(record.timestamp).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, { tokens: 0, cost: 0, requests: 0 });
      }
      const day = dailyMap.get(date)!;
      day.tokens += record.totalTokens;
      day.cost += record.costInUSD;
      day.requests++;
    });

    stats.dailyUsage = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    })).sort((a, b) => a.date.localeCompare(b.date));

    return stats;
  },
});

// Get system-wide usage statistics
export const getSystemUsageStats = query({
  args: {
    period: v.string(), // "daily", "weekly", "monthly"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const aggregates = await ctx.db
      .query("usageAggregates")
      .withIndex("by_period", (q) => q.eq("period", args.period))
      .filter((q) => q.eq(q.field("userId"), undefined)) // System-wide aggregates
      .order("desc")
      .take(args.limit || 30);

    return aggregates.map(agg => ({
      period: agg.periodKey,
      totalRequests: agg.totalRequests,
      successfulRequests: agg.successfulRequests,
      failedRequests: agg.failedRequests,
      totalTokens: agg.totalTokens,
      promptTokens: agg.promptTokens,
      completionTokens: agg.completionTokens,
      totalCost: agg.totalCostUSD,
      avgProcessingTime: agg.avgProcessingTimeMs,
      successRate: agg.totalRequests > 0 
        ? (agg.successfulRequests / agg.totalRequests) * 100 
        : 0,
      uniqueModelsUsed: agg.uniqueModelsUsed,
      conversationsStarted: agg.conversationsStarted,
      filesUploaded: agg.filesUploaded,
    }));
  },
});

// Get top users by usage
export const getTopUsersByUsage = query({
  args: {
    period: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentPeriodKey = getCurrentPeriodKey(args.period);
    
    const userAggregates = await ctx.db
      .query("usageAggregates")
      .withIndex("by_period", (q) => 
        q.eq("period", args.period).eq("periodKey", currentPeriodKey)
      )
      .filter((q) => q.neq(q.field("userId"), undefined))
      .order("desc")
      .take(args.limit || 10);

    // Get user details
    const usersWithStats = await Promise.all(
      userAggregates.map(async (agg) => {
        const user = agg.userId ? await ctx.db.get(agg.userId) : null;
        return {
          user: user ? { 
            _id: user._id,
            name: user.name, 
            email: user.email,
            avatarUrl: user.avatarUrl,
          } : null,
          stats: {
            totalRequests: agg.totalRequests,
            totalTokens: agg.totalTokens,
            totalCost: agg.totalCostUSD,
            avgProcessingTime: agg.avgProcessingTimeMs,
            conversationsStarted: agg.conversationsStarted,
            filesUploaded: agg.filesUploaded,
          },
        };
      })
    );

    return usersWithStats
      .filter(item => item.user !== null)
      .sort((a, b) => b.stats.totalTokens - a.stats.totalTokens);
  },
});

// Get model usage statistics
export const getModelUsageStats = query({
  args: {
    period: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startDate = args.period ? getStartDateForPeriod(args.period) : 0;
    
    const usageRecords = await ctx.db
      .query("usageTracking")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("timestamp"), startDate))
      .collect();

    // Aggregate by model
    const modelStats = new Map<string, {
      count: number;
      totalTokens: number;
      totalCost: number;
      avgProcessingTime: number;
      totalProcessingTime: number;
    }>();

    usageRecords.forEach(record => {
      if (!modelStats.has(record.modelSlug)) {
        modelStats.set(record.modelSlug, {
          count: 0,
          totalTokens: 0,
          totalCost: 0,
          avgProcessingTime: 0,
          totalProcessingTime: 0,
        });
      }
      
      const stats = modelStats.get(record.modelSlug)!;
      stats.count++;
      stats.totalTokens += record.totalTokens;
      stats.totalCost += record.costInUSD;
      stats.totalProcessingTime += record.processingTimeMs || 0;
      stats.avgProcessingTime = stats.totalProcessingTime / stats.count;
    });

    return Array.from(modelStats.entries())
      .map(([modelSlug, stats]) => ({
        modelSlug,
        ...stats,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, args.limit || 20);
  },
});

// Get recent usage activity
export const getRecentUsageActivity = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("usageTracking").withIndex("by_timestamp").order("desc");
    
    if (args.userId) {
      query = ctx.db.query("usageTracking").withIndex("by_user", (q) => q.eq("userId", args.userId)).order("desc");
    }

    const recentUsage = await query.take(args.limit || 50);

    // Get user and conversation details
    const enrichedUsage = await Promise.all(
      recentUsage.map(async (usage) => {
        const [user, conversation] = await Promise.all([
          ctx.db.get(usage.userId),
          ctx.db.get(usage.conversationId),
        ]);

        return {
          ...usage,
          user: user ? { name: user.name, email: user.email } : null,
          conversationTitle: conversation?.title || "Unknown",
        };
      })
    );

    return enrichedUsage;
  },
});

// Helper function to update aggregates
async function updateUsageAggregates(ctx: { db: any }, usageData: {
  userId: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  costInUSD: number;
  processingTimeMs?: number;
  timestamp: number;
}) {
  const now = new Date(usageData.timestamp);
  
  // Daily aggregate
  const dailyKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
  await updateAggregate(ctx, usageData, "daily", dailyKey);
  
  // Weekly aggregate
  const weekNumber = getWeekNumber(now);
  const weeklyKey = `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
  await updateAggregate(ctx, usageData, "weekly", weeklyKey);
  
  // Monthly aggregate
  const monthlyKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  await updateAggregate(ctx, usageData, "monthly", monthlyKey);
}

async function updateAggregate(ctx: any, usageData: any, period: string, periodKey: string) {
  // Update user-specific aggregate
  const userAggregate = await ctx.db
    .query("usageAggregates")
    .withIndex("by_period", (q) => 
      q.eq("period", period).eq("periodKey", periodKey)
    )
    .filter((q: any) => q.eq(q.field("userId"), usageData.userId))
    .first();

  const updateData = {
    totalRequests: 1,
    successfulRequests: 1,
    failedRequests: 0,
    totalTokens: usageData.totalTokens,
    promptTokens: usageData.promptTokens,
    completionTokens: usageData.completionTokens,
    totalCostUSD: usageData.costInUSD,
    avgProcessingTimeMs: usageData.processingTimeMs || 0,
    uniqueModelsUsed: 1,
    conversationsStarted: 0, // Will be updated separately
    filesUploaded: 0, // Will be updated separately
    updatedAt: Date.now(),
  };

  if (userAggregate) {
    // Update existing aggregate
    await ctx.db.patch(userAggregate._id, {
      totalRequests: userAggregate.totalRequests + 1,
      successfulRequests: userAggregate.successfulRequests + 1,
      totalTokens: userAggregate.totalTokens + usageData.totalTokens,
      promptTokens: userAggregate.promptTokens + usageData.promptTokens,
      completionTokens: userAggregate.completionTokens + usageData.completionTokens,
      totalCostUSD: userAggregate.totalCostUSD + usageData.costInUSD,
      avgProcessingTimeMs: (userAggregate.avgProcessingTimeMs * userAggregate.totalRequests + (usageData.processingTimeMs || 0)) / (userAggregate.totalRequests + 1),
      updatedAt: Date.now(),
    });
  } else {
    // Create new aggregate
    await ctx.db.insert("usageAggregates", {
      userId: usageData.userId,
      period,
      periodKey,
      ...updateData,
      createdAt: Date.now(),
    });
  }

  // Update system-wide aggregate (userId = undefined for system-wide)
  const systemAggregate = await ctx.db
    .query("usageAggregates")
    .withIndex("by_period", (q) => 
      q.eq("period", period).eq("periodKey", periodKey)
    )
    .filter((q: any) => q.eq(q.field("userId"), undefined))
    .first();

  if (systemAggregate) {
    await ctx.db.patch(systemAggregate._id, {
      totalRequests: systemAggregate.totalRequests + 1,
      successfulRequests: systemAggregate.successfulRequests + 1,
      totalTokens: systemAggregate.totalTokens + usageData.totalTokens,
      promptTokens: systemAggregate.promptTokens + usageData.promptTokens,
      completionTokens: systemAggregate.completionTokens + usageData.completionTokens,
      totalCostUSD: systemAggregate.totalCostUSD + usageData.costInUSD,
      avgProcessingTimeMs: (systemAggregate.avgProcessingTimeMs * systemAggregate.totalRequests + (usageData.processingTimeMs || 0)) / (systemAggregate.totalRequests + 1),
      updatedAt: Date.now(),
    });
  } else {
    // Create system-wide aggregate without userId (undefined/optional)
    await ctx.db.insert("usageAggregates", {
      period,
      periodKey,
      ...updateData,
      createdAt: Date.now(),
    });
  }
}

// Helper functions
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getCurrentPeriodKey(period: string): string {
  const now = new Date();
  
  switch (period) {
    case "daily":
      return now.toISOString().split('T')[0];
    case "weekly":
      const weekNumber = getWeekNumber(now);
      return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, '0')}`;
    case "monthly":
      return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    default:
      return now.toISOString().split('T')[0];
  }
}

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