"use client"

import { useMutation, useQuery } from "convex/react"
import { useChat } from "ai/react"
import { useMemo, useCallback } from "react"
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
  const addMessage = useMutation(api.messages.addMessage)
  const convexMessages = useQuery(api.messages.getMessages, { conversationId })

  // Transform Convex messages to AI SDK format
  const initialMessages = useMemo(() => {
    if (!convexMessages) return undefined
    return convexMessages.map(m => ({
      id: m._id,
      role: m.role as "user" | "assistant",
      content: m.content,
    }))
  }, [convexMessages])

  const onFinish = useCallback(async (message: { content: string }) => {
    try {
      await addMessage({
        conversationId,
        role: "assistant",
        content: message.content,
      })
    } catch (error) {
      console.error("Failed to save AI message:", error)
    }
  }, [addMessage, conversationId])

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    id: conversationId,
    initialMessages,
    onFinish,
  })

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    try {
      // Add to Convex first
      await addMessage({
        conversationId,
        role: "user",
        content: input.trim(),
      })
      handleSubmit(e)
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }, [input, isLoading, addMessage, conversationId, handleSubmit])

  // Show loading state while messages are being fetched
  if (convexMessages === undefined) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <ChatHeader conversationTitle={conversationTitle} modelSlug={modelSlug} />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <ChatHeader conversationTitle={conversationTitle} modelSlug={modelSlug} />
      <MessagesContainer messages={messages} isLoading={isLoading} />
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={handleInputChange}
        onSubmit={handleSendMessage}
      />
    </div>
  )
} 