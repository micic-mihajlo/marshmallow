/* eslint-disable @typescript-eslint/no-explicit-any */
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
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q: any) => 
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
      .withIndex("by_period", (q: any) => q.eq("period", args.period))
      .filter((q: any) => q.eq(q.field("userId"), undefined)) // System-wide aggregates
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
      .withIndex("by_period", (q: any) => 
        q.eq("period", args.period).eq("periodKey", currentPeriodKey)
      )
      .filter((q: any) => q.neq(q.field("userId"), undefined))
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
      .filter((q: any) => q.gte(q.field("timestamp"), startDate))
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
      query = ctx.db
        .query("usageTracking")
        .withIndex("by_user", (q: any) => q.eq("userId", args.userId!))
        .order("desc");
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
    .withIndex("by_period", (q: any) => 
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
    .withIndex("by_period", (q: any) => 
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

// Get user usage breakdown by BYOK vs System funding
export const getUserUsageBreakdown = query({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()), // Number of days to look back (default: 30)
  },
  handler: async (ctx, args) => {
    const daysBack = args.days || 30;
    const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);

    // Get user's usage records within the time period
    const usageRecords = await ctx.db
      .query("usageTracking")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .filter((q: any) => q.gte(q.field("timestamp"), startDate))
      .collect();

    // Get all models used to determine BYOK requirements
    const modelSlugs = Array.from(new Set(usageRecords.map(r => r.modelSlug)));
    const models = await Promise.all(
      modelSlugs.map(async (slug) => {
        const model = await ctx.db
          .query("models")
          .withIndex("by_slug", (q: any) => q.eq("slug", slug))
          .first();
        return { slug, requiresBYOK: model?.requiresBYOK || false };
      })
    );

    const modelBYOKMap = Object.fromEntries(models.map(m => [m.slug, m.requiresBYOK]));

    // Categorize usage by BYOK vs System
    const byokUsage = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      models: {} as Record<string, { tokens: number; cost: number; count: number }>
    };

    const systemUsage = {
      totalTokens: 0,
      totalCost: 0,
      requestCount: 0,
      models: {} as Record<string, { tokens: number; cost: number; count: number }>
    };

    // Process each usage record
    usageRecords.forEach(record => {
      const isBYOKModel = modelBYOKMap[record.modelSlug];
      const target = isBYOKModel ? byokUsage : systemUsage;

      target.totalTokens += record.totalTokens;
      target.totalCost += record.costInUSD;
      target.requestCount += 1;

      if (!target.models[record.modelSlug]) {
        target.models[record.modelSlug] = { tokens: 0, cost: 0, count: 0 };
      }
      target.models[record.modelSlug].tokens += record.totalTokens;
      target.models[record.modelSlug].cost += record.costInUSD;
      target.models[record.modelSlug].count += 1;
    });

    // Generate daily usage for chart
    const dailyUsage: Array<{
      date: string;
      byokCost: number;
      systemCost: number;
      byokTokens: number;
      systemTokens: number;
      totalCost: number;
      totalTokens: number;
    }> = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      
      const dayRecords = usageRecords.filter((q: any) => {
        const recordDate = new Date(q.timestamp).toISOString().split('T')[0];
        return recordDate === dateKey;
      });

      let dayBYOKCost = 0;
      let daySystemCost = 0;
      let dayBYOKTokens = 0;
      let daySystemTokens = 0;

      dayRecords.forEach((q: any) => {
        const isBYOKModel = modelBYOKMap[q.modelSlug];
        if (isBYOKModel) {
          dayBYOKCost += q.costInUSD;
          dayBYOKTokens += q.totalTokens;
        } else {
          daySystemCost += q.costInUSD;
          daySystemTokens += q.totalTokens;
        }
      });

      dailyUsage.push({
        date: dateKey,
        byokCost: dayBYOKCost,
        systemCost: daySystemCost,
        byokTokens: dayBYOKTokens,
        systemTokens: daySystemTokens,
        totalCost: dayBYOKCost + daySystemCost,
        totalTokens: dayBYOKTokens + daySystemTokens,
      });
    }

    return {
      period: `${daysBack} days`,
      startDate,
      endDate: Date.now(),
      byokUsage,
      systemUsage,
      totalUsage: {
        totalTokens: byokUsage.totalTokens + systemUsage.totalTokens,
        totalCost: byokUsage.totalCost + systemUsage.totalCost,
        requestCount: byokUsage.requestCount + systemUsage.requestCount,
      },
      dailyUsage,
    };
  },
});

// Fix existing usage records that have incorrect cost calculations
export const fixUsageCosts = mutation({
  args: {},
  handler: async (ctx) => {
    console.log("[UsageTracking] Starting cost correction...");
    
    // Get all usage records with incorrect costs (very small USD cost but non-zero credits)
    const records = await ctx.db
      .query("usageTracking")
      .filter((q: any) => 
        q.and(
          q.gt(q.field("costInCredits"), 0),
          q.lt(q.field("costInUSD"), 0.001) // Very small USD cost indicates the bug
        )
      )
      .collect();

    console.log(`[UsageTracking] Found ${records.length} records to fix`);

    let fixed = 0;
    for (const record of records) {
      await ctx.db.patch(record._id, {
        costInUSD: record.costInCredits, // Fix: OpenRouter returns USD directly
      });
      fixed++;
      
      if (fixed % 100 === 0) {
        console.log(`[UsageTracking] Fixed ${fixed}/${records.length} records...`);
      }
    }

    console.log(`[UsageTracking] Cost correction completed: ${fixed} records fixed`);
    return { totalRecords: records.length, fixed };
  },
}); 