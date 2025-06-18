import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Log an admin action
export const logAdminAction = mutation({
  args: {
    action: v.string(),
    targetType: v.optional(v.string()),
    targetId: v.optional(v.string()),
    details: v.object({}),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.insert("adminLogs", {
      adminId: admin._id,
      action: args.action,
      targetType: args.targetType,
      targetId: args.targetId,
      details: args.details,
      timestamp: Date.now(),
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
  },
});

// Get admin logs with pagination
export const getAdminLogs = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    action: v.optional(v.string()),
    adminId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Not authorized");
    }

    const logs = await ctx.db
      .query("adminLogs")
      .order("desc")
      .take(args.limit || 50);

    // Enrich logs with admin user information
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const admin = await ctx.db.get(log.adminId);
        return {
          ...log,
          adminName: admin?.name || "Unknown Admin",
          adminEmail: admin?.email || "Unknown Email",
        };
      })
    );

    return {
      logs: enrichedLogs,
    };
  },
});

// Get recent admin activity summary
export const getRecentAdminActivity = query({
  args: {
    hours: v.optional(v.number()), // Default to last 24 hours
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Not authorized");
    }

    const hoursAgo = args.hours || 24;
    const cutoffTime = Date.now() - (hoursAgo * 60 * 60 * 1000);

    const recentLogs = await ctx.db
      .query("adminLogs")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", cutoffTime))
      .collect();

    // Group by action type
    const actionCounts: Record<string, number> = {};
    const adminActivity: Record<string, number> = {};

    for (const log of recentLogs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      
      const admin = await ctx.db.get(log.adminId);
      const adminKey = admin?.name || "Unknown";
      adminActivity[adminKey] = (adminActivity[adminKey] || 0) + 1;
    }

    return {
      totalActions: recentLogs.length,
      actionCounts,
      adminActivity,
      timeRange: `${hoursAgo} hours`,
    };
  },
});

// Get logs for a specific target
export const getLogsForTarget = query({
  args: {
    targetType: v.string(),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Not authorized");
    }

    const logs = await ctx.db
      .query("adminLogs")
      .filter((q) => 
        q.and(
          q.eq(q.field("targetType"), args.targetType),
          q.eq(q.field("targetId"), args.targetId)
        )
      )
      .order("desc")
      .take(100);

    // Enrich with admin info
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const admin = await ctx.db.get(log.adminId);
        return {
          ...log,
          adminName: admin?.name || "Unknown Admin",
          adminEmail: admin?.email || "Unknown Email",
        };
      })
    );

    return enrichedLogs;
  },
}); 