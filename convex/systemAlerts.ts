import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a new system alert
export const createAlert = mutation({
  args: {
    alertType: v.string(),
    severity: v.string(),
    title: v.string(),
    message: v.string(),
    userId: v.optional(v.id("users")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    console.log("[SystemAlerts] Creating alert:", args);
    
    const alertId = await ctx.db.insert("systemAlerts", {
      ...args,
      isRead: false,
      isResolved: false,
      createdAt: Date.now(),
    });

    console.log("[SystemAlerts] Alert created:", alertId);
    return alertId;
  },
});

// Mark alert as read
export const markAsRead = mutation({
  args: {
    id: v.id("systemAlerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isRead: true,
    });
    return args.id;
  },
});

// Mark alert as resolved
export const markAsResolved = mutation({
  args: {
    id: v.id("systemAlerts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isResolved: true,
      resolvedAt: Date.now(),
    });
    return args.id;
  },
});

// Get active alerts
export const getActiveAlerts = query({
  args: {
    limit: v.optional(v.number()),
    severity: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db.query("systemAlerts").withIndex("by_status", (q) => 
      q.eq("isRead", false).eq("isResolved", false)
    ).order("desc").take(args.limit || 50);

    // Filter by severity if provided
    let filteredAlerts = args.severity 
      ? alerts.filter(alert => alert.severity === args.severity)
      : alerts;

    // Filter by user if provided
    if (args.userId) {
      filteredAlerts = filteredAlerts.filter(alert => 
        alert.userId === args.userId || alert.userId === null
      );
    }

    return filteredAlerts;
  },
});

// Get all alerts with pagination
export const getAllAlerts = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    severity: v.optional(v.string()),
    alertType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const alerts = await ctx.db.query("systemAlerts").withIndex("by_timestamp").order("desc")
      .take((args.offset || 0) + (args.limit || 100));

    // Apply filters
    let filteredAlerts = alerts.slice(args.offset || 0);

    if (args.severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === args.severity);
    }

    if (args.alertType) {
      filteredAlerts = filteredAlerts.filter(alert => alert.alertType === args.alertType);
    }

    return filteredAlerts.slice(0, args.limit || 100);
  },
});

// Get alert statistics
export const getAlertStats = query({
  args: {
    period: v.optional(v.string()), // "daily", "weekly", "monthly"
  },
  handler: async (ctx, args) => {
    const startDate = args.period ? getStartDateForPeriod(args.period) : 0;
    
    const alerts = await ctx.db
      .query("systemAlerts")
      .withIndex("by_timestamp")
      .filter((q) => q.gte(q.field("createdAt"), startDate))
      .collect();

    const stats = {
      totalAlerts: alerts.length,
      unreadAlerts: alerts.filter(a => !a.isRead).length,
      unresolvedAlerts: alerts.filter(a => !a.isResolved).length,
      severityBreakdown: {
        critical: alerts.filter(a => a.severity === "critical").length,
        high: alerts.filter(a => a.severity === "high").length,
        medium: alerts.filter(a => a.severity === "medium").length,
        low: alerts.filter(a => a.severity === "low").length,
      },
      typeBreakdown: {} as Record<string, number>,
    };

    // Alert type breakdown
    alerts.forEach(alert => {
      stats.typeBreakdown[alert.alertType] = (stats.typeBreakdown[alert.alertType] || 0) + 1;
    });

    return stats;
  },
});

// Helper function to check and create usage threshold alerts
export const checkUsageThresholds = mutation({
  args: {
    userId: v.id("users"),
    totalTokens: v.number(),
    totalCost: v.number(),
    period: v.string(), // "daily", "weekly", "monthly"
  },
  handler: async (ctx, args) => {
    // Get user quotas
    const quotas = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const alerts = [];

    // Check token quota
    const tokenQuota = quotas.find(q => q.quotaType === `${args.period}_tokens`);
    if (tokenQuota && args.totalTokens > tokenQuota.limit * 0.8) {
      const severity = args.totalTokens > tokenQuota.limit ? "critical" : "high";
      const alertId = await ctx.runMutation(api.systemAlerts.createAlert, {
        alertType: "token_threshold",
        severity,
        title: `Token Usage ${severity === "critical" ? "Exceeded" : "Warning"}`,
        message: `User has used ${args.totalTokens} tokens (limit: ${tokenQuota.limit})`,
        userId: args.userId,
        metadata: {
          tokensUsed: args.totalTokens,
          tokenLimit: tokenQuota.limit,
          period: args.period,
        },
      });
      alerts.push(alertId);
    }

    // Check cost threshold (example: $10 per month)
    const costThreshold = 10.0;
    if (args.totalCost > costThreshold * 0.8) {
      const severity = args.totalCost > costThreshold ? "critical" : "high";
      const alertId = await ctx.runMutation(api.systemAlerts.createAlert, {
        alertType: "cost_threshold",
        severity,
        title: `Cost ${severity === "critical" ? "Exceeded" : "Warning"}`,
        message: `User cost: $${args.totalCost.toFixed(2)} (threshold: $${costThreshold})`,
        userId: args.userId,
        metadata: {
          cost: args.totalCost,
          threshold: costThreshold,
          period: args.period,
        },
      });
      alerts.push(alertId);
    }

    return alerts;
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