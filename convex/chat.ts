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
    const apiKey = user?.apiKey || process.env.OPENROUTER_API_KEY;
    
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

      // format messages for OpenAI format with attachments
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

      // Check if we have PDF attachments to configure PDF processing
      const hasPdfAttachments = recentMessages.some(msg => 
        msg.attachments && msg.attachments.some(async (attachmentId) => {
          const attachment = await ctx.runQuery(api.fileStorage.getFileAttachment, {
            attachmentId,
          });
          return attachment?.fileType === 'application/pdf';
        })
      );

      console.log("[Chat] Has PDF attachments:", hasPdfAttachments);

      // Configure request with optional PDF processing and usage tracking
      const requestConfig: any = {
        model: conversation.modelSlug,
        messages: formattedMessages,
        stream: true,
        max_tokens: 2000,
        // Enable usage tracking
        usage: {
          include: true,
        },
        // Add user tracking for better caching and analytics
        user: `user_${user._id}`,
      };

      // Add PDF processing plugin if we have PDF attachments
      if (hasPdfAttachments) {
        requestConfig.plugins = [
          {
            id: "file-parser",
            pdf: {
              engine: "pdf-text", // Free option - you can change to "mistral-ocr" for better OCR
            },
          },
        ];
        console.log("[Chat] Added PDF processing plugin");
      }

      console.log("[Chat] Sending request to OpenRouter with usage tracking");
      
      // stream response from OpenRouter
      const stream = await openai.chat.completions.create(requestConfig);

      let fullContent = "";
      let usageData = null;
      let generationId = null;
      
      for await (const chunk of stream) {
        // Extract generation ID from first chunk
        if (!generationId && chunk.id) {
          generationId = chunk.id;
        }

        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          
          // update the assistant message with accumulated content
          await ctx.runMutation(api.messages.updateMessage, {
            id: assistantMessageId,
            content: fullContent,
          });
        }

        // Capture usage data from final chunk
        if (chunk.usage) {
          usageData = chunk.usage;
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

      console.error("OpenRouter API error:", error);

      // Log failed request
      await ctx.runMutation(api.requestLogs.updateRequest, {
        id: requestLogId,
        status: "error",
        statusCode: (error as any)?.status || 500,
        errorMessage: (error as any)?.message || "Unknown error",
        processingTimeMs: processingTime,
      });
      
      // add error message
      await ctx.runMutation(api.messages.addMessage, {
        conversationId: args.conversationId,
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Failed to generate response"}`,
      });
      
      throw error;
    }
  },
}); 