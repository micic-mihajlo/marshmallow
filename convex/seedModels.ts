import { v } from "convex/values";
import { mutation, action, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

// Type for OpenRouter API response
interface OpenRouterModel {
  id: string;
  canonical_slug: string;
  name: string;
  description: string;
  context_length: number;
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
  };
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface OpenRouterResponse {
  data: OpenRouterModel[];
}

// Helper function to determine capabilities from model data
function extractCapabilities(model: OpenRouterModel) {
  const modality = model.architecture?.modality || "";
  const inputModalities = model.architecture?.input_modalities || [];
  
  return {
    supportsFileUpload: inputModalities.includes("file"),
    supportsImageUpload: inputModalities.includes("image"),
    supportsVision: modality.includes("image") || inputModalities.includes("image"),
    supportsStreaming: true, // Most models support streaming
  };
}

// Helper function to extract provider from model ID
function extractProvider(modelId: string): string {
  const parts = modelId.split("/");
  return parts[0] || "unknown";
}

// Helper function to convert pricing strings to numbers
function parsePricing(priceStr: string): number {
  const price = parseFloat(priceStr);
  return isNaN(price) ? 0 : price;
}

// Internal mutation to completely wipe and reseed models table
export const _wipeAndReseedModels = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    stats: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
    };
  }> => {
    try {
      console.log("🗑️ Step 1: Deleting all existing models and settings...");
      
      // Get all existing models
      const allModels = await ctx.db.query("models").collect();
      console.log(`Found ${allModels.length} existing models to delete`);
      
      // Delete all model settings first
      const allSettings = await ctx.db.query("modelSettings").collect();
      for (const setting of allSettings) {
        await ctx.db.delete(setting._id);
      }
      console.log(`Deleted ${allSettings.length} model settings`);
      
      // Delete all models
      for (const model of allModels) {
        await ctx.db.delete(model._id);
      }
      console.log(`Deleted ${allModels.length} models`);
      
      console.log("🌐 Step 2: Fetching fresh models from OpenRouter API...");
      
      // Fetch fresh data from OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/models");
      
      if (!response.ok) {
        throw new Error(`OpenRouter API returned ${response.status}: ${response.statusText}`);
      }

      const data: OpenRouterResponse = await response.json();
      const models = data.data;

      console.log(`📥 Fetched ${models.length} models from OpenRouter API`);

      // Process and insert all models with BYOK calculations
      const result = await ctx.runMutation(internal.seedModels._processOpenRouterModels, {
        models,
        overwrite: true,
        userId: args.userId,
      });

      console.log("✅ Complete wipe and reseed completed successfully!");
      return result;
      
    } catch (error) {
      console.error("❌ Error during wipe and reseed:", error);
      throw error;
    }
  },
});

// Helper mutation for processing the fetched models (called internally by the action)
export const _processOpenRouterModels = internalMutation({
  args: {
    models: v.array(v.any()),
    overwrite: v.optional(v.boolean()),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    stats: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
    };
  }> => {
    const now = Date.now();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const apiModel of args.models) {
      try {
        // Extract capabilities and provider info
        const capabilities = extractCapabilities(apiModel);
        const provider = extractProvider(apiModel.id);
        
        // Convert pricing to cost per 1k tokens (OpenRouter prices are per token)
        const promptPrice = parsePricing(apiModel.pricing?.prompt || "0");
        const completionPrice = parsePricing(apiModel.pricing?.completion || "0");
        // Average the prompt and completion prices for a general cost estimate
        const costPer1kTokens = (promptPrice + completionPrice) * 1000 / 2;
        
        // Calculate costs per 1M tokens for BYOK determination
        const promptCostPer1M = promptPrice * 1000000;
        const completionCostPer1M = completionPrice * 1000000;
        
        // Determine if model requires BYOK (>$1/1M tokens for either prompt or completion)
        const requiresBYOK = promptCostPer1M > 1 || completionCostPer1M > 1;

        const modelData = {
          name: apiModel.name,
          slug: apiModel.id,
          provider: provider,
          description: apiModel.description || `${apiModel.name} - Available via OpenRouter`,
          supportsFileUpload: capabilities.supportsFileUpload,
          supportsImageUpload: capabilities.supportsImageUpload,
          supportsVision: capabilities.supportsVision,
          supportsStreaming: capabilities.supportsStreaming,
          maxTokens: apiModel.context_length || 4096,
          costPer1kTokens: costPer1kTokens,
          requiresBYOK: requiresBYOK,
          promptCostPer1M: promptCostPer1M,
          completionCostPer1M: completionCostPer1M,
        };

        // Check if model already exists
        const existingModel = await ctx.db
          .query("models")
          .withIndex("by_slug", (q) => q.eq("slug", apiModel.id))
          .first();

        if (existingModel) {
          if (args.overwrite) {
            // Update existing model
            await ctx.db.patch(existingModel._id, {
              ...modelData,
              updatedAt: now,
            });

            // Update model settings
            const existingSettings = await ctx.db
              .query("modelSettings")
              .withIndex("by_model", (q) => q.eq("modelId", existingModel._id))
              .first();

            if (existingSettings) {
              await ctx.db.patch(existingSettings._id, {
                allowFileUpload: capabilities.supportsFileUpload,
                allowImageUpload: capabilities.supportsImageUpload,
                allowVision: capabilities.supportsVision,
                allowStreaming: capabilities.supportsStreaming,
                updatedAt: now,
              });
            }

            updatedCount++;
          } else {
            skippedCount++;
          }
        } else {
          // Create new model
          const modelId = await ctx.db.insert("models", {
            ...modelData,
            createdAt: now,
            updatedAt: now,
          });

          // Create default settings for the model (disabled by default as requested)
          await ctx.db.insert("modelSettings", {
            modelId,
            enabled: false, // All models disabled by default
            allowFileUpload: capabilities.supportsFileUpload,
            allowImageUpload: capabilities.supportsImageUpload,
            allowVision: capabilities.supportsVision,
            allowStreaming: capabilities.supportsStreaming,
            updatedAt: now,
          });

          createdCount++;
        }
      } catch (modelError) {
        console.error(`Error processing model ${apiModel.id}:`, modelError);
        // Continue with next model instead of failing entirely
      }
    }

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: args.userId,
      action: "models_seeded_from_api",
      targetType: "system",
      details: {
        totalModels: args.models.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        overwrite: args.overwrite || false,
      },
      timestamp: now,
    });

    return {
      success: true,
      message: `Successfully seeded ${args.models.length} OpenRouter models from API: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped. All models are disabled by default.`,
      stats: {
        total: args.models.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
      },
    };
  },
});

// Action that completely wipes models table and reseeds with fresh API data
export const forceUpdateAllModelsFromAPI = action({
  args: {},
  handler: async (ctx) => {
    // Check if user is authenticated and is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || user.role !== "admin") {
      throw new ConvexError("Only admins can force update models");
    }

    try {
      console.log("🗑️ Starting complete models table refresh...");
      
      // Step 1: Call the wipe and reseed mutation
      await ctx.runMutation(internal.seedModels._wipeAndReseedModels, {
        userId: user._id,
      });

      console.log("🎉 Complete models refresh completed successfully!");
      
      return {
        message: "Successfully performed complete models table refresh with fresh BYOK data",
        success: true,
      };

    } catch (error) {
      console.error("❌ Error during complete models refresh:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new ConvexError(`Failed to refresh models table: ${errorMessage}`);
    }
  },
});

// Action that fetches from OpenRouter API and processes the models
export const seedOpenRouterModelsFromAPI = action({
  args: {
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    stats: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
    };
  }> => {
    // Check if user is authenticated and is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.runQuery(internal.users.getUserByClerkId, {
      clerkId: identity.subject,
    });

    if (!user || user.role !== "admin") {
      throw new ConvexError("Only admins can seed models");
    }

    try {
      // Fetch models from OpenRouter API
      console.log("Fetching models from OpenRouter API...");
      const response = await fetch("https://openrouter.ai/api/v1/models");
      
      if (!response.ok) {
        throw new Error(`OpenRouter API returned ${response.status}: ${response.statusText}`);
      }

      const data: OpenRouterResponse = await response.json();
      const models = data.data;

      console.log(`Fetched ${models.length} models from OpenRouter API`);

      // Process the models using the mutation
      const result = await ctx.runMutation(internal.seedModels._processOpenRouterModels, {
        models,
        overwrite: args.overwrite,
        userId: user._id,
      });

      return result;

    } catch (error) {
      console.error("Error fetching from OpenRouter API:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      throw new ConvexError(`Failed to fetch models from OpenRouter API: ${errorMessage}`);
    }
  },
});

// Comprehensive OpenRouter models data (kept for backwards compatibility - curated list)
const OPENROUTER_MODELS = [
  // OpenAI Models
  {
    name: "GPT-4.1",
    slug: "openai/gpt-4.1",
    provider: "openai",
    description: "Latest GPT-4.1 model with enhanced reasoning and coding capabilities",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.030,
    requiresBYOK: true, // Expensive model
    promptCostPer1M: 30.0,
    completionCostPer1M: 30.0,
  },
  {
    name: "GPT-4o",
    slug: "openai/gpt-4o",
    provider: "openai",
    description: "Multimodal flagship model with vision and reasoning",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.025,
    requiresBYOK: true, // Expensive model
    promptCostPer1M: 25.0,
    completionCostPer1M: 25.0,
  },
  {
    name: "GPT-4o Mini",
    slug: "openai/gpt-4o-mini",
    provider: "openai",
    description: "Efficient GPT-4o variant for most tasks",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.001,
    requiresBYOK: false, // Affordable model
    promptCostPer1M: 0.15,
    completionCostPer1M: 0.60,
  },
  {
    name: "Claude 3.5 Sonnet",
    slug: "anthropic/claude-3-5-sonnet-20241022",
    provider: "anthropic",
    description: "Latest Sonnet with computer use and enhanced capabilities",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 200000,
    costPer1kTokens: 0.015,
    requiresBYOK: true, // Expensive model
    promptCostPer1M: 3.0,
    completionCostPer1M: 15.0,
  },
  {
    name: "Claude 3.5 Haiku",
    slug: "anthropic/claude-3-5-haiku-20241022",
    provider: "anthropic",
    description: "Fast model that surpasses Claude 3 Opus in many areas",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 200000,
    costPer1kTokens: 0.008,
    requiresBYOK: false, // Affordable model
    promptCostPer1M: 1.0,
    completionCostPer1M: 5.0,
  },
  {
    name: "Gemini 2.0 Flash",
    slug: "google/gemini-2.0-flash-exp",
    provider: "google",
    description: "Latest Gemini with multimodal capabilities and fast performance",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 1048576,
    costPer1kTokens: 0.0075,
    requiresBYOK: false, // Affordable model
    promptCostPer1M: 0.075,
    completionCostPer1M: 0.30,
  },
];

// Original function (kept for backwards compatibility - curated models)
export const seedOpenRouterModels = mutation({
  args: {
    overwrite: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    message: string;
    stats: {
      total: number;
      created: number;
      updated: number;
      skipped: number;
    };
  }> => {
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
      throw new ConvexError("Only admins can seed models");
    }

    const now = Date.now();
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const modelData of OPENROUTER_MODELS) {
      // Check if model already exists
      const existingModel = await ctx.db
        .query("models")
        .withIndex("by_slug", (q) => q.eq("slug", modelData.slug))
        .first();

      if (existingModel) {
        if (args.overwrite) {
          // Update existing model
          await ctx.db.patch(existingModel._id, {
            name: modelData.name,
            description: modelData.description,
            supportsFileUpload: modelData.supportsFileUpload,
            supportsImageUpload: modelData.supportsImageUpload,
            supportsVision: modelData.supportsVision,
            supportsStreaming: modelData.supportsStreaming,
            maxTokens: modelData.maxTokens,
            costPer1kTokens: modelData.costPer1kTokens,
            requiresBYOK: modelData.requiresBYOK,
            promptCostPer1M: modelData.promptCostPer1M,
            completionCostPer1M: modelData.completionCostPer1M,
            updatedAt: now,
          });

          // Update model settings
          const existingSettings = await ctx.db
            .query("modelSettings")
            .withIndex("by_model", (q) => q.eq("modelId", existingModel._id))
            .first();

          if (existingSettings) {
            await ctx.db.patch(existingSettings._id, {
              allowFileUpload: modelData.supportsFileUpload,
              allowImageUpload: modelData.supportsImageUpload,
              allowVision: modelData.supportsVision,
              allowStreaming: modelData.supportsStreaming,
              updatedAt: now,
            });
          }

          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Create new model
        const modelId = await ctx.db.insert("models", {
          ...modelData,
          createdAt: now,
          updatedAt: now,
        });

        // Create default settings for the model (disabled by default)
        await ctx.db.insert("modelSettings", {
          modelId,
          enabled: false, // All models disabled by default
          allowFileUpload: modelData.supportsFileUpload,
          allowImageUpload: modelData.supportsImageUpload,
          allowVision: modelData.supportsVision,
          allowStreaming: modelData.supportsStreaming,
          updatedAt: now,
        });

        createdCount++;
      }
    }

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "models_seeded",
      targetType: "system",
      details: {
        totalModels: OPENROUTER_MODELS.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        overwrite: args.overwrite || false,
      },
      timestamp: now,
    });

    return {
      success: true,
      message: `Successfully seeded ${OPENROUTER_MODELS.length} curated OpenRouter models: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped. All models are disabled by default.`,
      stats: {
        total: OPENROUTER_MODELS.length,
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
      },
    };
  },
});

// Legacy function for backwards compatibility - just returns basic success
export const seedSampleModels = mutation({
  args: {},
  handler: async (ctx): Promise<{ message: string }> => {
    // Check if models already exist
    const existingModels = await ctx.db.query("models").collect();
    if (existingModels.length > 0) {
      return { message: "Models already exist, use seedOpenRouterModelsFromAPI for 300+ models or seedOpenRouterModels for curated models" };
    }
    
    return { message: "Please use the new 'Seed All OpenRouter Models (300+)' button in the admin interface for comprehensive model seeding" };
  },
}); 