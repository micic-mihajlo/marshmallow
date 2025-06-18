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

/**
 * Check if a model requires BYOK (Bring Your Own Key)
 * Checks the database first, falls back to API if not found
 */
export const checkModelBYOKRequirement = query({
  args: { modelSlug: v.string() },
  handler: async (ctx, args) => {
    try {
      console.log(`[ModelSettings] Checking BYOK requirement for model: ${args.modelSlug}`);
      
      // First check our database for the model
      const dbModel = await ctx.db
        .query("models")
        .withIndex("by_slug", (q) => q.eq("slug", args.modelSlug))
        .first();

      console.log(`[ModelSettings] Database lookup result for ${args.modelSlug}:`, dbModel ? {
        id: dbModel._id,
        name: dbModel.name,
        requiresBYOK: dbModel.requiresBYOK,
        promptCostPer1M: dbModel.promptCostPer1M,
        completionCostPer1M: dbModel.completionCostPer1M
      } : "NOT FOUND");

      if (dbModel) {
        // If model exists in database but requiresBYOK is undefined, 
        // conservatively require BYOK for safety until proper seeding
        if (dbModel.requiresBYOK !== undefined) {
          console.log(`[ModelSettings] Using database values - requiresBYOK: ${dbModel.requiresBYOK}`);
          return {
            requiresBYOK: dbModel.requiresBYOK || false,
            modelFound: true,
            modelName: dbModel.name,
            provider: dbModel.provider,
            pricing: {
              promptPer1M: dbModel.promptCostPer1M || 0,
              completionPer1M: dbModel.completionCostPer1M || 0,
            },
          };
        } else {
          // Model exists but lacks BYOK fields - conservatively require BYOK
          console.log(`[ModelSettings] Model ${args.modelSlug} exists but lacks BYOK fields - requiring BYOK for safety`);
          return {
            requiresBYOK: true,
            modelFound: true,
            modelName: dbModel.name,
            provider: dbModel.provider,
            pricing: {
              promptPer1M: 0,
              completionPer1M: 0,
            },
            note: "Model requires BYOK due to missing pricing data"
          };
        }
      }

      // Fallback to API if not in database
      console.log(`[ModelSettings] Model ${args.modelSlug} not in database, checking API...`);
      const modelsResponse = await fetch('https://openrouter.ai/api/v1/models');
      
      if (!modelsResponse.ok) {
        console.warn(`[ModelSettings] Failed to fetch models data: ${modelsResponse.status}`);
        return { requiresBYOK: false, modelFound: false };
      }
      
      const modelsData = await modelsResponse.json();
      const model = modelsData.data.find((m: { id: string }) => m.id === args.modelSlug);
      
      if (!model) {
        console.warn(`[ModelSettings] Model not found: ${args.modelSlug}`);
        return { requiresBYOK: false, modelFound: false };
      }
      
      // Calculate cost per 1M tokens
      const promptCostPer1M = parseFloat(model.pricing?.prompt || 0) * 1000000;
      const completionCostPer1M = parseFloat(model.pricing?.completion || 0) * 1000000;
      
      // Check if model requires BYOK (>$1/1M tokens for either prompt or completion)
      const requiresBYOK = promptCostPer1M > 1 || completionCostPer1M > 1;
      
      return {
        requiresBYOK,
        modelFound: true,
        modelName: model.name,
        provider: model.id.split('/')[0],
        pricing: {
          promptPer1M: promptCostPer1M,
          completionPer1M: completionCostPer1M,
        },
      };
      
    } catch (error) {
      console.error(`[ModelSettings] Error checking BYOK requirement for ${args.modelSlug}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { requiresBYOK: false, modelFound: false, error: errorMessage };
    }
  },
});

/**
 * Get all models that require BYOK from the database
 */
export const getBYOKRequiredModels = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Get models from database that require BYOK
      const byokModels = await ctx.db
        .query("models")
        .withIndex("by_byok_required", (q) => q.eq("requiresBYOK", true))
        .collect();
      
      return byokModels.map(model => ({
        id: model.slug,
        name: model.name,
        provider: model.provider,
        promptCostPer1M: model.promptCostPer1M || 0,
        completionCostPer1M: model.completionCostPer1M || 0,
        costPer1kTokens: model.costPer1kTokens || 0,
      }));
      
    } catch (error) {
      console.error('[ModelSettings] Error fetching BYOK required models from database:', error);
      throw new Error('Failed to fetch BYOK required models');
    }
  },
}); 