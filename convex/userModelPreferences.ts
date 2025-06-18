import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Get user's model preferences
export const getUserModelPreferences = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Use provided userId or current user's ID
    let userId = args.userId;
    if (!userId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      
      if (!user) {
        throw new ConvexError("User not found");
      }
      userId = user._id;
    }

    // Get user's preferences
    const preferences = await ctx.db
      .query("userModelPreferences")
      .withIndex("by_user_enabled", (q) => q.eq("userId", userId).eq("isEnabled", true))
      .collect();

    // Get all admin-enabled models
    const enabledSettings = await ctx.db
      .query("modelSettings")
      .withIndex("by_enabled", (q) => q.eq("enabled", true))
      .collect();

    const enabledModels = [];
    for (const setting of enabledSettings) {
      const model = await ctx.db.get(setting.modelId);
      if (model) {
        const userPreference = preferences.find(p => p.modelId === model._id);
        enabledModels.push({
          ...model,
          settings: setting,
          userEnabled: !!userPreference,
          displayOrder: userPreference?.displayOrder || 999,
        });
      }
    }

    // Sort by display order, then by name
    enabledModels.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });

    return enabledModels;
  },
});

// Get user's enabled models only (for model selector)
export const getUserEnabledModels = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get user's enabled preferences
    const preferences = await ctx.db
      .query("userModelPreferences")
      .withIndex("by_user_enabled", (q) => q.eq("userId", user._id).eq("isEnabled", true))
      .collect();

    // If user has no preferences, return all admin-enabled models
    if (preferences.length === 0) {
      const enabledSettings = await ctx.db
        .query("modelSettings")
        .withIndex("by_enabled", (q) => q.eq("enabled", true))
        .collect();

      const models = [];
      for (const setting of enabledSettings) {
        const model = await ctx.db.get(setting.modelId);
        if (model) {
          models.push({
            ...model,
            settings: setting,
          });
        }
      }
      return models;
    }

    // Return user's preferred models
    const userModels = [];
    for (const pref of preferences) {
      const model = await ctx.db.get(pref.modelId);
      if (model) {
        // Check if model is still admin-enabled
        const settings = await ctx.db
          .query("modelSettings")
          .withIndex("by_model", (q) => q.eq("modelId", model._id))
          .first();
        
        if (settings && settings.enabled) {
          userModels.push({
            ...model,
            settings,
            displayOrder: pref.displayOrder || 999,
          });
        }
      }
    }

    // Sort by display order, then by name
    userModels.sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      return a.name.localeCompare(b.name);
    });

    return userModels;
  },
});

// Update user model preferences
export const updateUserModelPreferences = mutation({
  args: {
    preferences: v.array(v.object({
      modelId: v.id("models"),
      isEnabled: v.boolean(),
      displayOrder: v.optional(v.number()),
    })),
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
    
    if (!user) {
      throw new ConvexError("User not found");
    }

    const now = Date.now();

    // Get existing preferences
    const existingPrefs = await ctx.db
      .query("userModelPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Update or create preferences
    for (const pref of args.preferences) {
      // Verify model exists and is admin-enabled
      const model = await ctx.db.get(pref.modelId);
      if (!model) {
        continue; // Skip invalid models
      }

      const settings = await ctx.db
        .query("modelSettings")
        .withIndex("by_model", (q) => q.eq("modelId", pref.modelId))
        .first();
      
      if (!settings || !settings.enabled) {
        continue; // Skip disabled models
      }

      const existing = existingPrefs.find(p => p.modelId === pref.modelId);
      
      if (existing) {
        // Update existing preference
        await ctx.db.patch(existing._id, {
          isEnabled: pref.isEnabled,
          displayOrder: pref.displayOrder || 999,
          updatedAt: now,
        });
      } else {
        // Create new preference
        await ctx.db.insert("userModelPreferences", {
          userId: user._id,
          modelId: pref.modelId,
          isEnabled: pref.isEnabled,
          displayOrder: pref.displayOrder || 999,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Toggle a single model preference
export const toggleModelPreference = mutation({
  args: {
    modelId: v.id("models"),
    isEnabled: v.boolean(),
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
    
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Verify model exists and is admin-enabled
    const model = await ctx.db.get(args.modelId);
    if (!model) {
      throw new ConvexError("Model not found");
    }

    const settings = await ctx.db
      .query("modelSettings")
      .withIndex("by_model", (q) => q.eq("modelId", args.modelId))
      .first();
    
    if (!settings || !settings.enabled) {
      throw new ConvexError("Model is not available");
    }

    const now = Date.now();

    // Check if preference exists
    const existing = await ctx.db
      .query("userModelPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("modelId"), args.modelId))
      .first();

    if (existing) {
      // Update existing preference
      await ctx.db.patch(existing._id, {
        isEnabled: args.isEnabled,
        updatedAt: now,
      });
    } else {
      // Create new preference
      await ctx.db.insert("userModelPreferences", {
        userId: user._id,
        modelId: args.modelId,
        isEnabled: args.isEnabled,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Reset user preferences to default (all admin-enabled models)
export const resetUserModelPreferences = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) {
      throw new ConvexError("User not found");
    }

    // Delete all existing preferences
    const existingPrefs = await ctx.db
      .query("userModelPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const pref of existingPrefs) {
      await ctx.db.delete(pref._id);
    }

    return { success: true };
  },
}); 