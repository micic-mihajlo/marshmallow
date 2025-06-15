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
  const sendMessage = useAction(api.chat.sendMessage)

  // Transform Convex messages to display format
  const messages = convexMessages?.map(m => ({
    id: m._id,
    role: m.role as "user" | "assistant",
    content: m.content,
  })) || []

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }, [])

  const handleSendMessage = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const prompt = input.trim()
    setInput("")
    setIsLoading(true)

    try {
      await sendMessage({
        conversationId,
        prompt,
      })
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sendMessage, conversationId])

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