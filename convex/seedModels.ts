import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { ConvexError } from "convex/values";

// Comprehensive OpenRouter models data
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
  },
  {
    name: "GPT-4.1 Mini",
    slug: "openai/gpt-4.1-mini",
    provider: "openai",
    description: "Smaller, faster GPT-4.1 variant with excellent performance",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.015,
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
  },
  {
    name: "O3",
    slug: "openai/o3",
    provider: "openai",
    description: "Advanced reasoning model with enhanced problem-solving",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.200,
  },
  {
    name: "O3 Mini",
    slug: "openai/o3-mini",
    provider: "openai",
    description: "Cost-effective reasoning model",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.060,
  },
  {
    name: "O1 Pro",
    slug: "openai/o1-pro",
    provider: "openai",
    description: "Professional reasoning model for complex tasks",
    supportsFileUpload: true,
    supportsImageUpload: false,
    supportsVision: false,
    supportsStreaming: false,
    maxTokens: 128000,
    costPer1kTokens: 0.600,
  },

  // Anthropic Models
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
  },
  {
    name: "Claude 3 Opus",
    slug: "anthropic/claude-3-opus-20240229",
    provider: "anthropic",
    description: "Previous flagship model with exceptional reasoning",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 200000,
    costPer1kTokens: 0.075,
  },

  // Google Models
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
  },
  {
    name: "Gemini 1.5 Pro",
    slug: "google/gemini-pro-1.5",
    provider: "google",
    description: "Advanced reasoning with massive context window",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 2097152,
    costPer1kTokens: 0.0125,
  },
  {
    name: "Gemini 1.5 Flash",
    slug: "google/gemini-flash-1.5",
    provider: "google",
    description: "Fast and efficient for most tasks with large context",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 1048576,
    costPer1kTokens: 0.0075,
  },

  // xAI Models
  {
    name: "Grok 3 Beta",
    slug: "x-ai/grok-3-beta",
    provider: "x-ai",
    description: "Latest Grok model with advanced reasoning capabilities",
    supportsFileUpload: true,
    supportsImageUpload: false,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 131072,
    costPer1kTokens: 0.020,
  },
  {
    name: "Grok 2 Vision",
    slug: "x-ai/grok-vision-beta",
    provider: "x-ai",
    description: "Multimodal Grok with image understanding",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 32768,
    costPer1kTokens: 0.020,
  },

  // DeepSeek Models
  {
    name: "DeepSeek V3",
    slug: "deepseek/deepseek-chat",
    provider: "deepseek",
    description: "High-performance model with excellent reasoning",
    supportsFileUpload: true,
    supportsImageUpload: false,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 64000,
    costPer1kTokens: 0.0014,
  },
  {
    name: "DeepSeek R1",
    slug: "deepseek/deepseek-r1",
    provider: "deepseek",
    description: "Reasoning-focused model with step-by-step thinking",
    supportsFileUpload: true,
    supportsImageUpload: false,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 64000,
    costPer1kTokens: 0.0055,
  },

  // Mistral Models
  {
    name: "Mistral Large",
    slug: "mistralai/mistral-large-2407",
    provider: "mistralai",
    description: "Flagship model with strong performance across tasks",
    supportsFileUpload: true,
    supportsImageUpload: false,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.024,
  },
  {
    name: "Mistral Nemo",
    slug: "mistralai/mistral-nemo",
    provider: "mistralai",
    description: "Efficient model for most conversational tasks",
    supportsFileUpload: true,
    supportsImageUpload: false,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.0013,
  },

  // Meta Models
  {
    name: "Llama 3.3 70B",
    slug: "meta-llama/llama-3.3-70b-instruct",
    provider: "meta-llama",
    description: "Latest Llama model with enhanced instruction following",
    supportsFileUpload: true,
    supportsImageUpload: false,
    supportsVision: false,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.0059,
  },
  {
    name: "Llama 3.2 90B Vision",
    slug: "meta-llama/llama-3.2-90b-vision-instruct",
    provider: "meta-llama",
    description: "Multimodal Llama with vision capabilities",
    supportsFileUpload: true,
    supportsImageUpload: true,
    supportsVision: true,
    supportsStreaming: true,
    maxTokens: 128000,
    costPer1kTokens: 0.0090,
  },
];

export const seedOpenRouterModels = mutation({
  args: {
    overwrite: v.optional(v.boolean()),
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
          enabled: false, // Admin needs to enable manually
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
      message: `Successfully seeded ${OPENROUTER_MODELS.length} OpenRouter models: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped`,
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
  handler: async (ctx) => {
    // Check if models already exist
    const existingModels = await ctx.db.query("models").collect();
    if (existingModels.length > 0) {
      return { message: "Models already exist, use the new seedOpenRouterModels function for full control" };
    }
    
    return { message: "Please use the new 'Seed OpenRouter Models' button in the admin interface for comprehensive model seeding" };
  },
}); 