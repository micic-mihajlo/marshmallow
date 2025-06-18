"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import * as crypto from "crypto";

// Encryption key from environment
const ENCRYPTION_KEY = process.env.BYOK_ENCRYPTION_KEY || "default-encryption-key-32-bytes!!";

// Ensure key is exactly 32 bytes for AES-256
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

export const encryptApiKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Generate a random IV for each encryption
      const iv = crypto.randomBytes(16);
      
      // Create cipher with IV
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      // Encrypt the API key
      let encrypted = cipher.update(args.apiKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return IV + encrypted data as a single hex string
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt API key");
    }
  },
});

export const decryptApiKey = action({
  args: {
    encryptedApiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Split IV and encrypted data
      const parts = args.encryptedApiKey.split(':');
      if (parts.length !== 2) {
        throw new Error("Invalid encrypted data format");
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      
      // Create decipher with IV
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      // Decrypt the data
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt API key");
    }
  },
});

export const testApiKey = action({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log("[BYOK] Testing API key validity...");
      
      // Test the API key with a simple request to OpenRouter
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          "Authorization": `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        console.error("[BYOK] API key test failed - Unauthorized (401)");
        throw new Error("Invalid API key - please check your OpenRouter API key");
      }

      if (response.status === 403) {
        console.error("[BYOK] API key test failed - Forbidden (403)");
        throw new Error("API key lacks permissions or account has issues");
      }

      if (!response.ok) {
        console.error(`[BYOK] API key test failed - HTTP ${response.status}`);
        throw new Error(`API key test failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("[BYOK] API key test successful - found", data.data?.length || 0, "models");
      
      return {
        valid: true,
        modelsCount: data.data?.length || 0,
        message: "API key is valid and working!"
      };

    } catch (error) {
      console.error("[BYOK] API key test error:", error);
      
      if (error instanceof Error) {
        return {
          valid: false,
          message: error.message
        };
      }
      
      return {
        valid: false,
        message: "Failed to test API key - please try again"
      };
    }
  },
});
