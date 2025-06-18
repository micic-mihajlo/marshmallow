import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

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

// Update model settings (admin only)
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
    // Check if user is authenticated and is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Only admins can update model settings");
    }

    const { modelId, ...updates } = args;
    
    // Get the model for validation
    const model = await ctx.db.get(modelId);
    if (!model) {
      throw new ConvexError("Model not found");
    }

    // Find existing settings
    const existingSettings = await ctx.db
      .query("modelSettings")
      .withIndex("by_model", (q) => q.eq("modelId", modelId))
      .first();

    const now = Date.now();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        ...updates,
        updatedAt: now,
      });
    } else {
      // Create new settings
      await ctx.db.insert("modelSettings", {
        modelId,
        enabled: updates.enabled ?? false,
        allowFileUpload: updates.allowFileUpload ?? model.supportsFileUpload,
        allowImageUpload: updates.allowImageUpload ?? model.supportsImageUpload,
        allowVision: updates.allowVision ?? model.supportsVision,
        allowStreaming: updates.allowStreaming ?? model.supportsStreaming,
        maxTokensOverride: updates.maxTokensOverride,
        rateLimitPerUser: updates.rateLimitPerUser,
        updatedAt: now,
      });
    }

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "model_settings_updated",
      targetType: "model",
      targetId: modelId,
      details: {
        modelName: model.name,
        modelSlug: model.slug,
        updates,
      },
      timestamp: now,
    });

    return { success: true };
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

// Bulk update model settings (admin only)
export const bulkUpdateModelSettings = mutation({
  args: {
    updates: v.array(v.object({
      modelId: v.id("models"),
      enabled: v.optional(v.boolean()),
      allowFileUpload: v.optional(v.boolean()),
      allowImageUpload: v.optional(v.boolean()),
      allowVision: v.optional(v.boolean()),
      allowStreaming: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, args) => {
    // Check if user is authenticated and is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Only admins can update model settings");
    }

    const now = Date.now();
    let updatedCount = 0;

    for (const update of args.updates) {
      try {
        // Get the model for validation
        const model = await ctx.db.get(update.modelId);
        if (!model) {
          continue; // Skip invalid models
        }

        // Find existing settings
        const existingSettings = await ctx.db
          .query("modelSettings")
          .withIndex("by_model", (q) => q.eq("modelId", update.modelId))
          .first();

        const { modelId, ...updateData } = update;

        if (existingSettings) {
          // Update existing settings
          await ctx.db.patch(existingSettings._id, {
            ...updateData,
            updatedAt: now,
          });
        } else {
          // Create new settings
          await ctx.db.insert("modelSettings", {
            modelId,
            enabled: updateData.enabled ?? false,
            allowFileUpload: updateData.allowFileUpload ?? model.supportsFileUpload,
            allowImageUpload: updateData.allowImageUpload ?? model.supportsImageUpload,
            allowVision: updateData.allowVision ?? model.supportsVision,
            allowStreaming: updateData.allowStreaming ?? model.supportsStreaming,
            updatedAt: now,
          });
        }

        updatedCount++;
      } catch (error) {
        console.error(`Failed to update settings for model ${update.modelId}:`, error);
      }
    }

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "bulk_model_settings_updated",
      targetType: "system",
      details: {
        totalUpdates: args.updates.length,
        successfulUpdates: updatedCount,
      },
      timestamp: now,
    });

    return { 
      success: true, 
      updatedCount,
      totalCount: args.updates.length 
    };
  },
});

// Get all enabled model settings
export const getEnabledModelSettings = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("modelSettings")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();
  },
});

// Enable/disable all models by provider (admin only)
export const toggleProviderModels = mutation({
  args: {
    provider: v.string(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Check if user is authenticated and is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new ConvexError("Only admins can toggle provider models");
    }

    // Get all models for the provider
    const providerModels = await ctx.db
      .query("models")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .collect();

    const now = Date.now();
    let updatedCount = 0;

    for (const model of providerModels) {
      try {
        // Find existing settings
        const existingSettings = await ctx.db
          .query("modelSettings")
          .withIndex("by_model", (q) => q.eq("modelId", model._id))
          .first();

        if (existingSettings) {
          // Update existing settings
          await ctx.db.patch(existingSettings._id, {
            enabled: args.enabled,
            updatedAt: now,
          });
        } else {
          // Create new settings
          await ctx.db.insert("modelSettings", {
            modelId: model._id,
            enabled: args.enabled,
            allowFileUpload: model.supportsFileUpload,
            allowImageUpload: model.supportsImageUpload,
            allowVision: model.supportsVision,
            allowStreaming: model.supportsStreaming,
            updatedAt: now,
          });
        }

        updatedCount++;
      } catch (error) {
        console.error(`Failed to update settings for model ${model._id}:`, error);
      }
    }

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "provider_models_toggled",
      targetType: "provider",
      details: {
        provider: args.provider,
        enabled: args.enabled,
        totalModels: providerModels.length,
        updatedModels: updatedCount,
      },
      timestamp: now,
    });

    return { 
      success: true, 
      updatedCount,
      totalCount: providerModels.length,
      provider: args.provider,
      enabled: args.enabled
    };
  },
}); 