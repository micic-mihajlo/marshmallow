"use client"

import { useEffect, useRef, memo, useState, useCallback } from "react"
import { MessageBubble } from "./message-bubble"
import { TypingIndicator } from "./typing-indicator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChevronDown } from "lucide-react"
import { Id } from "../../../convex/_generated/dataModel"

interface Message {
  id: string
  role: "user" | "assistant" | "system" | "data"
  content: string
  createdAt?: Date
  attachments?: Id<"fileAttachments">[]
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastScrollTime = useRef<number>(0)

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // immediately hide scroll button when scrolling to bottom
    setShowScrollButton(false)
    setIsAutoScrolling(true)
    messagesEndRef.current?.scrollIntoView({ 
      behavior: smooth ? "smooth" : "auto",
      block: "end"
    })
    
    scrollTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(false)
      // double-check if we're actually at bottom after scroll completes
      const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        const { scrollTop, scrollHeight, clientHeight } = scrollElement
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
        setShowScrollButton(!isNearBottom)
      }
    }, smooth ? 300 : 100)
  }, [])

  const throttledScrollToBottom = useCallback(() => {
    const now = Date.now()
    if (now - lastScrollTime.current < 50) { // throttle to max 20fps
      return
    }
    lastScrollTime.current = now
    
    requestAnimationFrame(() => {
      scrollToBottom(false) // use immediate scroll during fast streaming
    })
  }, [scrollToBottom])

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (isAutoScrolling) return
    
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
    setShowScrollButton(!isNearBottom)
  }, [isAutoScrolling])

  // scroll on new messages
  useEffect(() => {
    const scrollElement = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]')
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150
      
      if (isNearBottom || isLoading) {
        scrollToBottom(true) // smooth scroll for new messages
      }
    }
  }, [messages.length, scrollToBottom, isLoading])

  const filteredMessages = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  )

  const lastContent = filteredMessages.length > 0 ? filteredMessages[filteredMessages.length - 1].content : ""

  // autoscroll during streaming with throttling
  useEffect(() => {
    if (isLoading && filteredMessages.length > 0) {
      throttledScrollToBottom()
    }
  }, [lastContent, isLoading, throttledScrollToBottom, filteredMessages.length])

  // cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

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
                attachments={message.attachments}
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
          type="button"
          onClick={() => {
            setShowScrollButton(false)
            scrollToBottom(true)
          }}
          className="fixed bottom-32 right-6 w-12 h-12 bg-white border border-gray-300 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:bg-gray-50 hover:border-gray-400 z-20 backdrop-blur-sm"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 text-gray-700" />
        </button>
      )}
    </div>
  )
}) 