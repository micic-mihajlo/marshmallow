import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Query all models
export const getAllModels = query({
  handler: async (ctx) => {
    return await ctx.db.query("models").collect();
  },
});

// Query models by provider
export const getModelsByProvider = query({
  args: { provider: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("models")
      .withIndex("by_provider", (q) => q.eq("provider", args.provider))
      .collect();
  },
});

// Get model by slug
export const getModelBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("models")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Create a new model (admin only)
export const createModel = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    provider: v.string(),
    description: v.optional(v.string()),
    supportsFileUpload: v.boolean(),
    supportsImageUpload: v.boolean(),
    supportsVision: v.boolean(),
    supportsStreaming: v.boolean(),
    maxTokens: v.optional(v.number()),
    costPer1kTokens: v.optional(v.number()),
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
      throw new ConvexError("Only admins can create models");
    }

    const now = Date.now();
    
    // Check if model with this slug already exists
    const existing = await ctx.db
      .query("models")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
    
    if (existing) {
      throw new ConvexError(`Model with slug "${args.slug}" already exists`);
    }

    const modelId = await ctx.db.insert("models", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    // Create default settings for the model
    await ctx.db.insert("modelSettings", {
      modelId,
      enabled: true,
      allowFileUpload: args.supportsFileUpload,
      allowImageUpload: args.supportsImageUpload,
      allowVision: args.supportsVision,
      allowStreaming: args.supportsStreaming,
      updatedAt: now,
    });

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "model_created",
      targetType: "model",
      targetId: modelId,
      details: {
        modelName: args.name,
        modelSlug: args.slug,
        provider: args.provider,
      },
      timestamp: now,
    });

    return modelId;
  },
});

// Update a model (admin only)
export const updateModel = mutation({
  args: {
    id: v.id("models"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    supportsFileUpload: v.optional(v.boolean()),
    supportsImageUpload: v.optional(v.boolean()),
    supportsVision: v.optional(v.boolean()),
    supportsStreaming: v.optional(v.boolean()),
    maxTokens: v.optional(v.number()),
    costPer1kTokens: v.optional(v.number()),
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
      throw new ConvexError("Only admins can update models");
    }

    const { id, ...updates } = args;
    
    // Get the model for logging
    const model = await ctx.db.get(id);
    if (!model) {
      throw new ConvexError("Model not found");
    }
    
    const now = Date.now();
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "model_updated",
      targetType: "model",
      targetId: id,
      details: {
        modelName: model.name,
        modelSlug: model.slug,
        updates,
      },
      timestamp: now,
    });
  },
});

// Delete a model (admin only)
export const deleteModel = mutation({
  args: { id: v.id("models") },
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
      throw new ConvexError("Only admins can delete models");
    }

    // Get the model for logging before deletion
    const model = await ctx.db.get(args.id);
    if (!model) {
      throw new ConvexError("Model not found");
    }

    // Delete associated settings first
    const settings = await ctx.db
      .query("modelSettings")
      .withIndex("by_model", (q) => q.eq("modelId", args.id))
      .collect();
    
    for (const setting of settings) {
      await ctx.db.delete(setting._id);
    }
    
    // Delete the model
    await ctx.db.delete(args.id);

    // Log the admin action
    const now = Date.now();
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "model_deleted",
      targetType: "model",
      targetId: args.id,
      details: {
        modelName: model.name,
        modelSlug: model.slug,
        provider: model.provider,
      },
      timestamp: now,
    });
  },
});

// Get models with their settings
export const getModelsWithSettings = query({
  handler: async (ctx) => {
    const models = await ctx.db.query("models").collect();
    const modelsWithSettings = [];

    for (const model of models) {
      const settings = await ctx.db
        .query("modelSettings")
        .withIndex("by_model", (q) => q.eq("modelId", model._id))
        .first();
      
      modelsWithSettings.push({
        ...model,
        settings,
      });
    }

    return modelsWithSettings;
  },
});

// Get enabled models only (for regular users)
export const getEnabledModels = query({
  handler: async (ctx) => {
    const enabledSettings = await ctx.db
      .query("modelSettings")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    const enabledModels = [];
    for (const setting of enabledSettings) {
      const model = await ctx.db.get(setting.modelId);
      if (model) {
        enabledModels.push({
          ...model,
          settings: setting,
        });
      }
    }

    return enabledModels;
  },
}); 