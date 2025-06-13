"use client"

import { useEffect, useRef, memo } from "react"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
  id: string
  role: "user" | "assistant" | "system" | "data"
  content: string
  createdAt?: Date
}

interface MessagesContainerProps {
  messages: Message[]
  isLoading: boolean
}

const MemoizedMessageBubble = memo(MessageBubble)

export const MessagesContainer = memo(function MessagesContainer({ 
  messages, 
  isLoading 
}: MessagesContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, isLoading])

  const filteredMessages = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  )

  return (
    <div className="flex-1 bg-gray-50">
      <ScrollArea className="h-full">
        <div className="py-8 px-4 max-w-4xl mx-auto">
          <div className="space-y-6">
            {filteredMessages.map((message) => (
              <MemoizedMessageBubble
                key={message.id}
                id={message.id}
                role={message.role as "user" | "assistant"}
                content={message.content}
                timestamp={message.createdAt}
              />
            ))}
            
            {isLoading && <TypingIndicator />}
          </div>
          
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </ScrollArea>
    </div>
  )
}) 