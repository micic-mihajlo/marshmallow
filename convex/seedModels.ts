import { mutation } from "./_generated/server";

export const seedSampleModels = mutation({
  handler: async (ctx) => {
    // Check if models already exist
    const existingModels = await ctx.db.query("models").collect();
    if (existingModels.length > 0) {
      return { message: "Models already exist, skipping seed" };
    }

    const now = Date.now();
    
    // Sample models with their capabilities
    const sampleModels = [
      {
        name: "Claude 3 Haiku",
        slug: "anthropic/claude-3-haiku",
        provider: "anthropic",
        description: "Fast and efficient model for everyday tasks",
        supportsFileUpload: true,
        supportsImageUpload: true,
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 200000,
        costPer1kTokens: 0.00025,
      },
      {
        name: "Claude 3.5 Sonnet",
        slug: "anthropic/claude-3.5-sonnet",
        provider: "anthropic",
        description: "Balanced model with strong reasoning capabilities",
        supportsFileUpload: true,
        supportsImageUpload: true,
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 200000,
        costPer1kTokens: 0.003,
      },
      {
        name: "GPT-4o",
        slug: "openai/gpt-4o",
        provider: "openai",
        description: "OpenAI's flagship multimodal model",
        supportsFileUpload: false,
        supportsImageUpload: true,
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 128000,
        costPer1kTokens: 0.005,
      },
      {
        name: "GPT-4o Mini",
        slug: "openai/gpt-4o-mini",
        provider: "openai",
        description: "Smaller, faster version of GPT-4o",
        supportsFileUpload: false,
        supportsImageUpload: true,
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 128000,
        costPer1kTokens: 0.00015,
      },
      {
        name: "Gemini 1.5 Pro",
        slug: "google/gemini-1.5-pro",
        provider: "google",
        description: "Google's advanced multimodal model",
        supportsFileUpload: true,
        supportsImageUpload: true,
        supportsVision: true,
        supportsStreaming: true,
        maxTokens: 2000000,
        costPer1kTokens: 0.00125,
      },
      {
        name: "Llama 3.1 70B",
        slug: "meta-llama/llama-3.1-70b-instruct",
        provider: "meta",
        description: "Meta's open-source large language model",
        supportsFileUpload: false,
        supportsImageUpload: false,
        supportsVision: false,
        supportsStreaming: true,
        maxTokens: 131072,
        costPer1kTokens: 0.00088,
      },
    ];

    const createdModels = [];

    for (const modelData of sampleModels) {
      // Create the model
      const modelId = await ctx.db.insert("models", {
        ...modelData,
        createdAt: now,
        updatedAt: now,
      });

      // Create default settings for the model
      await ctx.db.insert("modelSettings", {
        modelId,
        enabled: true,
        allowFileUpload: modelData.supportsFileUpload,
        allowImageUpload: modelData.supportsImageUpload,
        allowVision: modelData.supportsVision,
        allowStreaming: modelData.supportsStreaming,
        updatedAt: now,
      });

      createdModels.push({ id: modelId, name: modelData.name });
    }

    return {
      message: `Successfully seeded ${createdModels.length} models`,
      models: createdModels,
    };
  },
}); 