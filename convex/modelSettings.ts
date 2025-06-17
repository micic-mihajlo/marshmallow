import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get settings for a specific model
export const getModelSettings = query({
  args: { modelId: v.id("models") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("modelSettings")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();
  },
});

// Update model settings
export const updateModelSettings = mutation({
  args: {
    modelId: v.id("models"),
    enabled: v.optional(v.boolean()),
    allowFileUpload: v.optional(v.boolean()),
    allowImageUpload: v.optional(v.boolean()),
    allowVision: v.optional(v.boolean()),
    allowStreaming: v.optional(v.boolean()),
    maxTokensOverride: v.optional(v.number()),
    rateLimitPerUser: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { modelId, ...updates } = args;
    
    const existing = await ctx.db
      .query("modelSettings")
      .withIndex("by_model", (q) => q.eq("modelId", modelId))
      .first();

    if (!existing) {
      throw new Error("Model settings not found");
    }

    await ctx.db.patch(existing._id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Toggle model enabled/disabled
export const toggleModelEnabled = mutation({
  args: { modelId: v.id("models") },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("modelSettings")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();

    if (!settings) {
      throw new Error("Model settings not found");
    }

    await ctx.db.patch(settings._id, {
      enabled: !settings.enabled,
      updatedAt: Date.now(),
    });
  },
});

// Bulk update settings for multiple models
export const bulkUpdateSettings = mutation({
  args: {
    updates: v.array(v.object({
      modelId: v.id("models"),
      enabled: v.optional(v.boolean()),
      allowFileUpload: v.optional(v.boolean()),
      allowImageUpload: v.optional(v.boolean()),
      allowVision: v.optional(v.boolean()),
      allowStreaming: v.optional(v.boolean()),
      maxTokensOverride: v.optional(v.number()),
      rateLimitPerUser: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    for (const update of args.updates) {
      const { modelId, ...settings } = update;
      
      const existing = await ctx.db
        .query("modelSettings")
        .withIndex("by_model", (q) => q.eq("modelId", modelId))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          ...settings,
          updatedAt: now,
        });
      }
    }
  },
}); 