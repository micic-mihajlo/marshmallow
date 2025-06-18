/* eslint-disable @typescript-eslint/ban-ts-comment, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any */
// @ts-nocheck

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";

const generateTitle = async (openai: OpenAI, firstMessage: string): Promise<string> => {
  try {
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Generate a concise, descriptive title (max 6 words) for a conversation that starts with the following message. Return only the title, no quotes or extra text."
        },
        {
          role: "user", 
          content: firstMessage
        }
      ],
      max_tokens: 20,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content?.trim() || "New Chat";
  } catch (error) {
    console.error("Failed to generate title:", error);
    return "New Chat";
  }
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    prompt: v.string(),
    attachments: v.optional(v.array(v.id("fileAttachments"))),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // get conversation and verify ownership
    const conversation = await ctx.runQuery(api.conversations.getConversation, {
      id: args.conversationId,
    });
    if (!conversation) throw new Error("Conversation not found");

    // check if this is the first message in the conversation
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const existingMessages = await ctx.runQuery(api.messages.getMessages, {
      conversationId: args.conversationId,
    });
    const isFirstMessage = existingMessages.length === 0;

    console.log("[Chat] Adding user message with attachments:", args.attachments?.length || 0);
    
    // add user message
    await ctx.runMutation(api.messages.addMessage, {
      conversationId: args.conversationId,
      role: "user",
      content: args.prompt,
      attachments: args.attachments,
    });

    // get recent messages for context (last 20)
    const messages = await ctx.runQuery(api.messages.getMessages, {
      conversationId: args.conversationId,
    });
    
    const recentMessages = messages.slice(-20);
    
    // get user for API key and tracking
    const user = await ctx.runQuery(api.users.getCurrentUser);
    
    let apiKey = process.env.OPENROUTER_API_KEY;
    
    // If user has BYOK enabled and has an encrypted API key, decrypt it
    if (user?.useBYOK && user?.apiKey) {
      try {
        apiKey = await ctx.runAction(api.byok.decryptApiKey, {
          encryptedApiKey: user.apiKey,
        });
        console.log("[Chat] Using user's own API key (BYOK enabled)");
      } catch (error) {
        console.error("[Chat] Failed to decrypt user API key, falling back to system key:", error);
        apiKey = process.env.OPENROUTER_API_KEY;
      }
    } else if (user?.apiKey && !user?.useBYOK) {
      console.log("[Chat] User has API key but BYOK is disabled, using system default");
    } else {
      console.log("[Chat] Using system default API key");
    }
    
    if (!apiKey) {
      throw new Error("No API key available. Please set your OpenRouter API key.");
    }

    if (!user) {
      throw new Error("User not found");
    }

    // Log request start
    const requestLogId = await ctx.runMutation(api.requestLogs.logRequest, {
      userId: user._id,
      conversationId: args.conversationId,
      requestType: "chat_completion",
      method: "POST",
      endpoint: "/api/v1/chat/completions",
      status: "pending",
      timestamp: startTime,
    });

    // configure OpenAI client to use OpenRouter
    const openai = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
    });

    try {
      // generate title if this is the first message
      if (isFirstMessage) {
        const title = await generateTitle(openai, args.prompt);
        await ctx.runMutation(api.conversations.updateConversationTitle, {
          id: args.conversationId,
          title,
        });
      }

      // create assistant message placeholder
      const assistantMessageId = await ctx.runMutation(api.messages.addMessage, {
        conversationId: args.conversationId,
        role: "assistant",
        content: "...",
      });

      /* ---------- build messages with attachment support ---------- */
      const formattedMessages = await Promise.all(
        recentMessages.map(async (msg) => {
          const baseMessage = {
            role: msg.role as "user" | "assistant",
            content: msg.content,
          };

          // If this message has attachments, format them for OpenRouter
          if (msg.attachments && msg.attachments.length > 0) {
            console.log("[Chat] Formatting message with", msg.attachments.length, "attachments");
            
            const attachmentContents = [];
            
            // Add text content first
            attachmentContents.push({
              type: "text",
              text: msg.content || "Please analyze these files.",
            });

            // Process each attachment
            for (const attachmentId of msg.attachments) {
              try {
                const attachment = await ctx.runQuery(api.fileStorage.getFileAttachment, {
                  attachmentId,
                });

                if (attachment && attachment.url) {
                  console.log("[Chat] Processing attachment:", attachment.fileName, attachment.fileType);
                  
                  if (attachment.fileType.startsWith('image/')) {
                    // For images, use image_url format
                    attachmentContents.push({
                      type: "image_url",
                      image_url: {
                        url: attachment.url,
                      },
                    });
                  } else if (attachment.fileType === 'application/pdf') {
                    // For PDFs, fetch content and encode as base64
                    console.log("[Chat] PDF attachment detected - fetching and encoding:", attachment.fileName);
                    
                    try {
                      // Fetch the PDF content from Convex storage
                      const pdfResponse = await fetch(attachment.url);
                      if (pdfResponse.ok) {
                        const pdfBuffer = await pdfResponse.arrayBuffer();
                        // Convert ArrayBuffer to base64 using browser-compatible method
                        const uint8Array = new Uint8Array(pdfBuffer);
                        let binaryString = '';
                        for (let i = 0; i < uint8Array.length; i++) {
                          binaryString += String.fromCharCode(uint8Array[i]);
                        }
                        const base64Pdf = btoa(binaryString);
                        const dataUrl = `data:application/pdf;base64,${base64Pdf}`;
                        
                        // Add PDF in OpenRouter's required format
                        attachmentContents.push({
                          type: "file",
                          file: {
                            filename: attachment.fileName,
                            file_data: dataUrl,
                          },
                        });
                        
                        console.log("[Chat] PDF encoded successfully:", attachment.fileName);
                      } else {
                        console.error("[Chat] Failed to fetch PDF:", pdfResponse.status);
                        attachmentContents[0].text += `\n\nAttached PDF file: ${attachment.fileName} (encoding failed)`;
                      }
                    } catch (error) {
                      console.error("[Chat] Error encoding PDF:", error);
                      attachmentContents[0].text += `\n\nAttached PDF file: ${attachment.fileName} (encoding error)`;
                    }
                  }
                }
              } catch (error) {
                console.error("[Chat] Error processing attachment:", attachmentId, error);
              }
            }

            return {
              ...baseMessage,
              content: attachmentContents,
            };
          }

          return baseMessage;
        })
      );

      console.log("[Chat] Formatted", formattedMessages.length, "messages for OpenRouter");

      /* detect presence of pdf attachments */
      let hasPdfAttachments = false;
      for (const msg of recentMessages) {
        if (msg.attachments) {
          for (const attachmentId of msg.attachments) {
            const attachment = await ctx.runQuery(api.fileStorage.getFileAttachment, { attachmentId });
            if (attachment?.fileType === "application/pdf") {
              hasPdfAttachments = true;
              break;
            }
          }
        }
        if (hasPdfAttachments) break;
      }

      // check if web search is enabled
      const isWebSearchEnabled = conversation.webSearchEnabled;
      
      // determine model to use - append :online if web search is enabled
      let modelToUse = conversation.modelSlug;
      if (isWebSearchEnabled && !conversation.modelSlug.endsWith(":online")) {
        modelToUse = conversation.modelSlug + ":online";
        console.log("[Chat] Using web search model:", modelToUse);
      }

      // prepare request parameters
      const requestParams: any = {
        model: modelToUse,
        messages: formattedMessages,
        stream: true,
        max_tokens: 2000,
        reasoning: { effort: "high" },
        usage: { include: true },
        user: `user_${user._id}`,
      };

      // Configure plugins (only for PDF now)
      const plugins: any[] = [];
      if (hasPdfAttachments) {
        plugins.push({ id: "file-parser", pdf: { engine: "pdf-text" } });
        console.log("[Chat] Added PDF processing plugin");
      }
      if (plugins.length) requestParams.plugins = plugins;

      console.log("[Chat] Sending request to OpenRouter with usage tracking");

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - openrouter supports the reasoning param, not yet in openai typings
      const stream = await openai.chat.completions.create(requestParams);

      let fullContent = "";
      let inReasoning = false;
      let usageData: any = null;
      let generationId: string | null = null;
      
      for await (const chunk of stream) {
        // Extract generation ID from first chunk
        if (!generationId && (chunk as any).id) {
          generationId = (chunk as any).id;
        }

        const reasoningPart = (chunk.choices[0] as any)?.delta?.reasoning || "";
        const contentPart = chunk.choices[0]?.delta?.content || "";

        if (reasoningPart) {
          if (!inReasoning) {
            fullContent += "<think>";
            inReasoning = true;
          }
          fullContent += reasoningPart;
        }

        if (contentPart) {
          if (inReasoning) {
            fullContent += "</think>\n";
            inReasoning = false;
          }
          fullContent += contentPart;
        }

        if (reasoningPart || contentPart) {
          await ctx.runMutation(api.messages.updateMessage, {
            id: assistantMessageId,
            content: fullContent,
          });
        }

        // Capture usage data from final chunk
        if ((chunk as any).usage) {
          usageData = (chunk as any).usage;
          console.log("[Chat] Usage data received:", usageData);
        }
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Log successful completion
      await ctx.runMutation(api.requestLogs.updateRequest, {
        id: requestLogId,
        status: "success",
        statusCode: 200,
        processingTimeMs: processingTime,
      });

      // Store usage tracking data
      if (usageData && generationId) {
        await ctx.runMutation(api.usageTracking.recordUsage, {
          userId: user._id,
          conversationId: args.conversationId,
          messageId: assistantMessageId,
          generationId,
          modelSlug: conversation.modelSlug,
          promptTokens: usageData.prompt_tokens || 0,
          completionTokens: usageData.completion_tokens || 0,
          totalTokens: usageData.total_tokens || 0,
          cachedTokens: usageData.prompt_tokens_details?.cached_tokens || 0,
          reasoningTokens: usageData.completion_tokens_details?.reasoning_tokens || 0,
          costInCredits: usageData.cost || 0,
          costInUSD: (usageData.cost || 0) * 0.000001, // Convert credits to USD (adjust rate)
          timestamp: endTime,
          processingTimeMs: processingTime,
        });

        console.log("[Chat] Usage data stored successfully");
      }

      return { 
        success: true, 
        messageId: assistantMessageId,
        usageData,
        generationId,
      };
      
    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      console.error("[Chat] OpenRouter API error:", error);

      // Enhanced logging for different error types
      let errorMessage = "Unknown error";
      let statusCode = 500;
      let isApiKeyError = false;

      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Check for API key related errors
        const errorStr = error.message.toLowerCase();
        if (errorStr.includes('unauthorized') || 
            errorStr.includes('invalid api key') || 
            errorStr.includes('authentication') ||
            errorStr.includes('401')) {
          isApiKeyError = true;
          statusCode = 401;
          
          // Determine which key caused the error
          const keyType = user?.useBYOK && user?.apiKey ? "user's BYOK" : "system default";
          
          console.error(`[Chat] API KEY ERROR - ${keyType} key is invalid or unauthorized`);
          console.error(`[Chat] User ID: ${user._id}, BYOK enabled: ${user?.useBYOK}, Has saved key: ${!!user?.apiKey}`);
          
          if (user?.useBYOK && user?.apiKey) {
            console.error("[Chat] BYOK key failed - user should check their OpenRouter API key");
            errorMessage = "Your OpenRouter API key appears to be invalid. Please check your key in BYOK settings.";
          } else {
            console.error("[Chat] System default key failed - admin should check environment variables");
            errorMessage = "API authentication failed. Please contact support.";
          }
        } else if (errorStr.includes('rate limit') || errorStr.includes('429')) {
          statusCode = 429;
          console.error("[Chat] Rate limit exceeded");
          errorMessage = "Rate limit exceeded. Please try again in a moment.";
        } else if (errorStr.includes('quota') || errorStr.includes('insufficient')) {
          statusCode = 402;
          console.error("[Chat] Quota or credit issue");
          errorMessage = "API quota exceeded or insufficient credits.";
        }
      }

      // Log failed request with enhanced details
      await ctx.runMutation(api.requestLogs.updateRequest, {
        id: requestLogId,
        status: "error",
        statusCode,
        errorMessage: isApiKeyError ? `API Key Error: ${errorMessage}` : errorMessage,
        processingTimeMs: processingTime,
      });
      
      // Add error message to conversation
      await ctx.runMutation(api.messages.addMessage, {
        conversationId: args.conversationId,
        role: "assistant",
        content: `Error: ${errorMessage}`,
      });
      
      throw error;
    }
  },
});