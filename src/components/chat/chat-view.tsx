"use client"

import { useMutation, useQuery, useAction } from "convex/react"
import { useState, useCallback } from "react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { MessagesContainer } from "@/components/chat/messages-container"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatHeader } from "@/components/chat/chat-header"

interface ChatViewProps {
  conversationId: Id<"conversations">
  conversationTitle?: string
  modelSlug?: string
}

export function ChatView({ conversationId, conversationTitle, modelSlug }: ChatViewProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  const convexMessages = useQuery(api.messages.getMessages, { conversationId })
  const conversation = useQuery(api.conversations.getConversation, { id: conversationId })
  const sendMessage = useAction(api.chat.sendMessage)
  const updateConversationModel = useMutation(api.conversations.updateConversationModel)
  const updateConversationTitle = useMutation(api.conversations.updateConversationTitle)
  const updateConversationWebSearch = useMutation(api.conversations.updateConversationWebSearch)

  // Transform Convex messages to display format
  const messages = convexMessages?.map((m: any) => ({
    id: m._id,
    role: m.role as "user" | "assistant",
    content: m.content,
    attachments: m.attachments,
  })) || []

  console.log("[ChatView] Transformed", messages.length, "messages, with attachments:", 
    messages.filter(m => m.attachments && m.attachments.length > 0).length)

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  const handleModelChange = useCallback(async (modelId: string) => {
    try {
      await updateConversationModel({
        id: conversationId,
        modelSlug: modelId,
      })
    } catch (error) {
      console.error("Failed to update model:", error)
    }
  }, [updateConversationModel, conversationId])

  const handleTitleChange = useCallback(async (title: string) => {
    try {
      await updateConversationTitle({
        id: conversationId,
        title,
      })
    } catch (error) {
      console.error("Failed to update title:", error)
    }
  }, [updateConversationTitle, conversationId])

  const handleWebSearchChange = useCallback(async (enabled: boolean, options?: { maxResults?: number; searchContextSize?: "low" | "medium" | "high" }) => {
    try {
      await updateConversationWebSearch({
        id: conversationId,
        enabled,
        options,
      })
    } catch (error) {
      console.error("Failed to update web search:", error)
    }
  }, [updateConversationWebSearch, conversationId])

  const handleSendMessage = useCallback(async (e: React.FormEvent, attachments?: Id<"fileAttachments">[]) => {

    e.preventDefault()
    if ((!input.trim() && (!attachments || attachments.length === 0)) || isLoading) return

    console.log("[ChatView] Sending message with attachments:", attachments?.length || 0)
    
    const prompt = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      await sendMessage({
        conversationId,
        prompt,
        attachments,
      })
      console.log("[ChatView] Message sent successfully")
    } catch (error) {
      console.error("[ChatView] Failed to send message:", error)
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sendMessage, conversationId])

  // Show loading state while messages are being fetched
  if (convexMessages === undefined) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <ChatHeader 
          conversationTitle={conversationTitle} 
          modelSlug={modelSlug}
          webSearchEnabled={conversation?.webSearchEnabled}
          webSearchOptions={conversation?.webSearchOptions}
          onModelChange={handleModelChange}
          onTitleChange={handleTitleChange}
          onWebSearchChange={handleWebSearchChange}
          isLoading={isLoading}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ChatHeader 
        conversationTitle={conversationTitle} 
        modelSlug={modelSlug}
        webSearchEnabled={conversation?.webSearchEnabled}
        webSearchOptions={conversation?.webSearchOptions}
        onModelChange={handleModelChange}
        onTitleChange={handleTitleChange}
        onWebSearchChange={handleWebSearchChange}
        isLoading={isLoading}
      />
      <MessagesContainer messages={messages} isLoading={isLoading} />
      <ChatInput
        input={input}
        isLoading={isLoading}
        conversationId={conversationId}
        onInputChange={handleInputChange}
        onSubmit={handleSendMessage}
      />
    </div>
  )
} 