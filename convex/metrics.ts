import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get current app metrics
export const getCurrentMetrics = query({
  handler: async (ctx) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const startOfDay = new Date(today).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Total users
    const totalUsers = await ctx.db.query("users").collect();
    
    // Active users today (users who sent messages today)
    const todayMessages = await ctx.db
      .query("messages")
      .filter((q) => q.gte(q.field("timestamp"), startOfDay) && q.lt(q.field("timestamp"), endOfDay))
      .collect();
    
    const activeUserIds = new Set();
    for (const message of todayMessages) {
      const conversation = await ctx.db.get(message.conversationId);
      if (conversation) {
        activeUserIds.add(conversation.userId);
      }
    }

    // Total conversations
    const totalConversations = await ctx.db.query("conversations").collect();
    
    // Total messages
    const totalMessages = await ctx.db.query("messages").collect();
    
    // Calculate token usage and costs
    let totalTokensUsed = 0;
    let totalCost = 0;
    const modelUsage: Record<string, number> = {};

    for (const message of totalMessages) {
      if (message.tokenCount) {
        totalTokensUsed += message.tokenCount;
      }
      
      const conversation = await ctx.db.get(message.conversationId);
      if (conversation) {
        modelUsage[conversation.modelSlug] = (modelUsage[conversation.modelSlug] || 0) + 1;
        
        // Calculate cost if we have token count and model cost data
        if (message.tokenCount) {
          const model = await ctx.db
            .query("models")
            .withIndex("by_slug", (q) => q.eq("slug", conversation.modelSlug))
            .first();
          
          if (model && model.costPer1kTokens) {
            totalCost += (message.tokenCount / 1000) * model.costPer1kTokens;
          }
        }
      }
    }

    return {
      totalUsers: totalUsers.length,
      activeUsers: activeUserIds.size,
      totalConversations: totalConversations.length,
      totalMessages: totalMessages.length,
      totalTokensUsed,
      totalCost,
      modelUsage,
      messagesLast24h: todayMessages.length,
    };
  },
});

// Get historical metrics
export const getHistoricalMetrics = query({
  args: { 
    days: v.optional(v.number()) // defaults to 30 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const metrics = await ctx.db
      .query("metrics")
      .withIndex("by_date")
      .filter((q) => q.gte(q.field("date"), startDate.toISOString().split('T')[0]))
      .collect();
    
    return metrics.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Store daily metrics (should be called by a cron job)
export const storeDailyMetrics = mutation({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const date = args.date || new Date().toISOString().split('T')[0];
    const startOfDay = new Date(date).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    // Check if metrics for this date already exist
    const existing = await ctx.db
      .query("metrics")
      .withIndex("by_date", (q) => q.eq("date", date))
      .first();

    // Calculate metrics for the day
    const totalUsers = await ctx.db.query("users").collect();
    
    const dayMessages = await ctx.db
      .query("messages")
      .filter((q) => q.gte(q.field("timestamp"), startOfDay) && q.lt(q.field("timestamp"), endOfDay))
      .collect();
    
    const activeUserIds = new Set();
    let totalTokensUsed = 0;
    let totalCost = 0;
    const modelUsage: Record<string, number> = {};

    for (const message of dayMessages) {
      const conversation = await ctx.db.get(message.conversationId);
      if (conversation) {
        activeUserIds.add(conversation.userId);
        modelUsage[conversation.modelSlug] = (modelUsage[conversation.modelSlug] || 0) + 1;
        
        if (message.tokenCount) {
          totalTokensUsed += message.tokenCount;
          
          const model = await ctx.db
            .query("models")
            .withIndex("by_slug", (q) => q.eq("slug", conversation.modelSlug))
            .first();
          
          if (model && model.costPer1kTokens) {
            totalCost += (message.tokenCount / 1000) * model.costPer1kTokens;
          }
        }
      }
    }

    const totalConversations = await ctx.db
      .query("conversations")
      .filter((q) => q.gte(q.field("createdAt"), startOfDay) && q.lt(q.field("createdAt"), endOfDay))
      .collect();

    const metricsData = {
      date,
      totalUsers: totalUsers.length,
      activeUsers: activeUserIds.size,
      totalConversations: totalConversations.length,
      totalMessages: dayMessages.length,
      totalTokensUsed,
      totalCost,
      modelUsage,
      createdAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, metricsData);
    } else {
      await ctx.db.insert("metrics", metricsData);
    }

    return metricsData;
  },
});

// Get model usage statistics
export const getModelUsageStats = query({
  args: { 
    days: v.optional(v.number()) // defaults to 7 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const conversations = await ctx.db
      .query("conversations")
      .filter((q) => q.gte(q.field("createdAt"), startDate.getTime()))
      .collect();
    
    const modelStats: Record<string, { count: number; name: string; provider: string }> = {};
    
    for (const conversation of conversations) {
      const model = await ctx.db
        .query("models")
        .withIndex("by_slug", (q) => q.eq("slug", conversation.modelSlug))
        .first();
      
      if (!modelStats[conversation.modelSlug]) {
        modelStats[conversation.modelSlug] = {
          count: 0,
          name: model?.name || conversation.modelSlug,
          provider: model?.provider || 'unknown',
        };
      }
      
      modelStats[conversation.modelSlug].count++;
    }
    
    return Object.entries(modelStats)
      .map(([slug, stats]) => ({ slug, ...stats }))
      .sort((a, b) => b.count - a.count);
  },
});

// Get user activity over time
export const getUserActivityStats = query({
  args: { 
    days: v.optional(v.number()) // defaults to 30 days
  },
  handler: async (ctx, args) => {
    const days = args.days || 30;
    const activity = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const startOfDay = new Date(dateStr).getTime();
      const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
      
      const dayMessages = await ctx.db
        .query("messages")
        .filter((q) => q.gte(q.field("timestamp"), startOfDay) && q.lt(q.field("timestamp"), endOfDay))
        .collect();
      
      const activeUsers = new Set();
      for (const message of dayMessages) {
        const conversation = await ctx.db.get(message.conversationId);
        if (conversation) {
          activeUsers.add(conversation.userId);
        }
      }
      
      activity.unshift({
        date: dateStr,
        activeUsers: activeUsers.size,
        messages: dayMessages.length,
      });
    }
    
    return activity;
  },
}); 