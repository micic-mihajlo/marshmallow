import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { 
  validateApiKeyFormat, 
  encryptApiKey
} from "@/lib/crypto";

// Since we can't easily use ConvexHttpClient in API routes with authentication,
// we'll handle the encryption here and let the frontend call Convex mutations directly

// POST - Validate and encrypt API key
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider and API key are required" },
        { status: 400 }
      );
    }

    // Basic API key validation
    if (!validateApiKeyFormat(apiKey)) {
      return NextResponse.json(
        { error: "Invalid API key format" },
        { status: 400 }
      );
    }

    // Validate the key with the provider
    const validationResult = await validateProviderKey(provider, apiKey);
    
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          error: "API key validation failed", 
          message: validationResult.message 
        },
        { status: 400 }
      );
    }

    // Encrypt the API key
    const { encrypted, iv, hash } = await encryptApiKey(apiKey, userId);

    return NextResponse.json({
      success: true,
      encryptedData: {
        keyCipher: encrypted,
        iv,
        keyHash: hash,
      },
      validationMessage: validationResult.message,
    });
  } catch (error) {
    console.error("Error processing API key:", error);
    return NextResponse.json(
      { error: "Failed to process API key" },
      { status: 500 }
    );
  }
}

// Validate API key with provider
async function validateProviderKey(
  provider: string, 
  apiKey: string
): Promise<{ valid: boolean; message: string }> {
  try {
    switch (provider.toLowerCase()) {
      case "openai":
        return await validateOpenAIKey(apiKey);
      case "anthropic":
        return await validateAnthropicKey(apiKey);
      case "google":
        return await validateGoogleKey(apiKey);
      case "openrouter":
        return await validateOpenRouterKey(apiKey);
      default:
        return { valid: false, message: "Unsupported provider" };
    }
  } catch (error) {
    console.error(`Error validating ${provider} key:`, error);
    return { valid: false, message: "Validation failed" };
  }
}

async function validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { valid: true, message: "Valid OpenAI API key" };
    } else if (response.status === 401) {
      return { valid: false, message: "Invalid OpenAI API key" };
    } else {
      return { valid: false, message: "Unable to validate OpenAI API key" };
    }
      } catch {
      return { valid: false, message: "Network error validating OpenAI key" };
    }
}

async function validateAnthropicKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }],
      }),
    });

    if (response.ok || response.status === 400) {
      // 400 is expected for minimal test request
      return { valid: true, message: "Valid Anthropic API key" };
    } else if (response.status === 401) {
      return { valid: false, message: "Invalid Anthropic API key" };
    } else {
      return { valid: false, message: "Unable to validate Anthropic API key" };
    }
  } catch {
    return { valid: false, message: "Network error validating Anthropic key" };
  }
}

async function validateGoogleKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );

    if (response.ok) {
      return { valid: true, message: "Valid Google AI API key" };
    } else if (response.status === 400 || response.status === 403) {
      return { valid: false, message: "Invalid Google AI API key" };
    } else {
      return { valid: false, message: "Unable to validate Google AI API key" };
    }
  } catch {
    return { valid: false, message: "Network error validating Google AI key" };
  }
}

async function validateOpenRouterKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { valid: true, message: "Valid OpenRouter API key" };
    } else if (response.status === 401) {
      return { valid: false, message: "Invalid OpenRouter API key" };
    } else {
      return { valid: false, message: "Unable to validate OpenRouter API key" };
    }
  } catch {
    return { valid: false, message: "Network error validating OpenRouter key" };
  }
} 