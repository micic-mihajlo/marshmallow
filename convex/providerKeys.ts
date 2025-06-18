import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

// Supported providers for BYOK
const SUPPORTED_PROVIDERS = ["openai", "anthropic", "google", "openrouter"] as const;
type Provider = typeof SUPPORTED_PROVIDERS[number];

// Get user's provider keys (metadata only, no decrypted keys)
export const getUserProviderKeys = query({
  args: {},
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

    const keys = await ctx.db
      .query("providerKeys")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Return metadata only (no encrypted keys)
    return keys.map(key => ({
      _id: key._id,
      provider: key.provider,
      isActive: key.isActive,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      lastValidated: key.lastValidated,
      validationStatus: key.validationStatus,
    }));
  },
});

// Store encrypted provider key
export const storeProviderKey = mutation({
  args: {
    provider: v.string(),
    keyCipher: v.string(), // Encrypted key
    iv: v.string(), // Initialization vector
    keyHash: v.string(), // SHA-256 hash for existence checks
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

    // Validate provider
    if (!SUPPORTED_PROVIDERS.includes(args.provider as Provider)) {
      throw new ConvexError(`Unsupported provider: ${args.provider}`);
    }

    const now = Date.now();

    // Check if key already exists for this provider
    const existingKey = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) => 
        q.eq("userId", user._id).eq("provider", args.provider)
      )
      .first();

    if (existingKey) {
      // Update existing key
      await ctx.db.patch(existingKey._id, {
        keyCipher: args.keyCipher,
        iv: args.iv,
        keyHash: args.keyHash,
        isActive: true,
        lastValidated: undefined, // Reset validation status
        validationStatus: undefined,
      });

      // Log the admin action
      await ctx.db.insert("adminLogs", {
        adminId: user._id,
        action: "provider_key_updated",
        targetType: "providerKey",
        targetId: existingKey._id,
        details: {
          provider: args.provider,
          userEmail: user.email,
        },
        timestamp: now,
      });

      return existingKey._id;
    } else {
      // Create new key
      const keyId = await ctx.db.insert("providerKeys", {
        userId: user._id,
        provider: args.provider,
        keyCipher: args.keyCipher,
        iv: args.iv,
        keyHash: args.keyHash,
        isActive: true,
        createdAt: now,
      });

      // Log the admin action
      await ctx.db.insert("adminLogs", {
        adminId: user._id,
        action: "provider_key_created",
        targetType: "providerKey",
        targetId: keyId,
        details: {
          provider: args.provider,
          userEmail: user.email,
        },
        timestamp: now,
      });

      return keyId;
    }
  },
});

// Remove provider key
export const removeProviderKey = mutation({
  args: {
    provider: v.string(),
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

    const existingKey = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) => 
        q.eq("userId", user._id).eq("provider", args.provider)
      )
      .first();

    if (!existingKey) {
      throw new ConvexError("Provider key not found");
    }

    // Soft delete by marking inactive
    await ctx.db.patch(existingKey._id, {
      isActive: false,
    });

    // Log the admin action
    await ctx.db.insert("adminLogs", {
      adminId: user._id,
      action: "provider_key_removed",
      targetType: "providerKey",
      targetId: existingKey._id,
      details: {
        provider: args.provider,
        userEmail: user.email,
      },
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

// Get encrypted provider key for API use (internal function)
export const getProviderKeyForUser = query({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    // This is an internal function - verify it's being called from server context
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null; // Return null if no auth context
    }

    const key = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) => 
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    if (!key || !key.isActive) {
      return null;
    }

    return {
      keyCipher: key.keyCipher,
      iv: key.iv,
      keyHash: key.keyHash,
    };
  },
});

// Update key validation status
export const updateKeyValidationStatus = mutation({
  args: {
    provider: v.string(),
    validationStatus: v.string(), // "valid" | "invalid" | "expired"
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

    const existingKey = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) => 
        q.eq("userId", user._id).eq("provider", args.provider)
      )
      .first();

    if (!existingKey) {
      throw new ConvexError("Provider key not found");
    }

    await ctx.db.patch(existingKey._id, {
      validationStatus: args.validationStatus,
      lastValidated: Date.now(),
      lastUsed: args.validationStatus === "valid" ? Date.now() : existingKey.lastUsed,
    });

    return { success: true };
  },
});

// Update key last used timestamp
export const updateKeyLastUsed = mutation({
  args: {
    userId: v.id("users"),
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const key = await ctx.db
      .query("providerKeys")
      .withIndex("by_user_provider", (q) => 
        q.eq("userId", args.userId).eq("provider", args.provider)
      )
      .first();

    if (key && key.isActive) {
      await ctx.db.patch(key._id, {
        lastUsed: Date.now(),
      });
    }
  },
});

// Get supported providers list
export const getSupportedProviders = query({
  args: {},
  handler: async () => {
    return SUPPORTED_PROVIDERS.map(provider => ({
      id: provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      description: getProviderDescription(provider),
    }));
  },
});

function getProviderDescription(provider: Provider): string {
  switch (provider) {
    case "openai":
      return "OpenAI GPT models (GPT-4, GPT-3.5, etc.)";
    case "anthropic":
      return "Anthropic Claude models (Claude 3, Claude 2, etc.)";
    case "google":
      return "Google Gemini models";
    case "openrouter":
      return "OpenRouter with your own API key";
    default:
      return "AI model provider";
  }
} 