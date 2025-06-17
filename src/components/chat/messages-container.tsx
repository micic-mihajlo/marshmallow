"use client"

import { useEffect, useRef, memo, useState, useCallback } from "react"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown } from "lucide-react"

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
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  const scrollToBottom = useCallback(() => {
    setIsAutoScrolling(true)
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    setTimeout(() => setIsAutoScrolling(false), 1000)
  }, [])

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (isAutoScrolling) return
    
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    setShowScrollButton(!isNearBottom)
  }, [isAutoScrolling])

  useEffect(() => {
    // auto scroll on new messages only if user is near bottom or it's loading
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      
      if (isNearBottom || isLoading) {
        scrollToBottom()
      }
    }
  }, [messages.length, isLoading, scrollToBottom])

  const filteredMessages = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  )

  const lastContent = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1].content : ""

  // autoscroll while assistant streaming (content updates without array length change)
  useEffect(() => {
    if (isLoading) {
      scrollToBottom()
    }
  }, [lastContent])

  return (
    <div className="flex-1 bg-gray-50 relative overflow-hidden">
      <ScrollArea 
        ref={scrollAreaRef}
        className="h-full"
        onScrollCapture={handleScroll}
      >
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

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:bg-gray-50 z-10"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </div>
  )
}) 