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
    
    // get user for API key
    const user = await ctx.runQuery(api.users.getCurrentUser);
    const apiKey = user?.apiKey || process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error("No API key available. Please set your OpenRouter API key.");
    }

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
          const base = { role: msg.role as "user" | "assistant", content: msg.content } as any;

          if (!msg.attachments?.length) return base;

          const parts: any[] = [
            { type: "text", text: msg.content || "Please analyse these files." },
          ];

          for (const attachmentId of msg.attachments) {
            try {
              const attachment = await ctx.runQuery(api.fileStorage.getFileAttachment, { attachmentId });
              if (!attachment?.url) continue;

              if (attachment.fileType.startsWith("image/")) {
                parts.push({ type: "image_url", image_url: { url: attachment.url } });
              } else if (attachment.fileType === "application/pdf") {
                const res = await fetch(attachment.url);
                if (res.ok) {
                  const buf = await res.arrayBuffer();
                  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
                  parts.push({
                    type: "file",
                    file: { filename: attachment.fileName, file_data: `data:application/pdf;base64,${b64}` },
                  });
                }
              }
            } catch (err) {
              console.error("[Chat] attachment error", err);
            }
          }

          return { ...base, content: parts };
        })
      );

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

      // check if web search is enabled or model has :online suffix
      const isWebSearchEnabled = conversation.webSearchEnabled || conversation.modelSlug.endsWith(":online");
      const webSearchOptions = conversation.webSearchOptions;

      // prepare request parameters
      const requestParams: any = {
        model: conversation.modelSlug,
        messages: formattedMessages,
        stream: true,
        max_tokens: 2000,
        reasoning: { effort: "high" },
        usage: { include: true },
        user: `user_${user?._id || "anon"}`,
      };

      const plugins: any[] = [];
      if (isWebSearchEnabled && !conversation.modelSlug.endsWith(":online")) {
        plugins.push({ id: "web", max_results: webSearchOptions?.maxResults || 5 });
      }
      if (hasPdfAttachments) {
        plugins.push({ id: "file-parser", pdf: { engine: "pdf-text" } });
      }
      if (plugins.length) requestParams.plugins = plugins;

      if (webSearchOptions?.searchContextSize) {
        requestParams.web_search_options = { search_context_size: webSearchOptions.searchContextSize };
      }

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - openrouter supports the reasoning param, not yet in openai typings
      const stream = await openai.chat.completions.create(requestParams);

      let fullContent = "";
      let inReasoning = false;
      let usageData: any = null;
      let generationId: string | null = null;
      
      for await (const chunk of stream) {
        if (!generationId && (chunk as any).id) generationId = (chunk as any).id;

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

        if ((chunk as any).usage) {
          usageData = (chunk as any).usage;
        }
      }

      return { success: true, messageId: assistantMessageId, usageData, generationId };
      
    } catch (error) {
      console.error("OpenRouter API error:", error);
      
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