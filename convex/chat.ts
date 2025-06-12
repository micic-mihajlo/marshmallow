import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import OpenAI from "openai";

export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // get conversation and verify ownership
    const conversation = await ctx.runQuery(api.conversations.getConversation, {
      id: args.conversationId,
    });
    if (!conversation) throw new Error("Conversation not found");

    // add user message
    await ctx.runMutation(api.messages.addMessage, {
      conversationId: args.conversationId,
      role: "user",
      content: args.prompt,
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
      // create assistant message placeholder
      const assistantMessageId = await ctx.runMutation(api.messages.addMessage, {
        conversationId: args.conversationId,
        role: "assistant",
        content: "...",
      });

      // format messages for OpenAI format
      const formattedMessages = recentMessages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      // stream response from OpenRouter
      const stream = await openai.chat.completions.create({
        model: conversation.modelSlug,
        messages: formattedMessages,
        stream: true,
        max_tokens: 2000,
      });

      let fullContent = "";
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          
          // update the assistant message with accumulated content
          await ctx.runMutation(api.messages.updateMessage, {
            id: assistantMessageId,
            content: fullContent,
          });
        }
      }

      return { success: true, messageId: assistantMessageId };
      
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