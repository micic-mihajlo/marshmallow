"use client"

import { Bot } from "lucide-react"

interface ChatHeaderProps {
  conversationTitle?: string
  modelSlug?: string
}

export function ChatHeader({ conversationTitle, modelSlug }: ChatHeaderProps) {
  return (
    <div className="h-14 border-b border-gray-200 bg-white flex items-center px-4">
      <div className="max-w-4xl mx-auto w-full flex items-center gap-3">
        <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-medium text-gray-900 text-sm">{conversationTitle || "Chat"}</h2>
          <p className="text-xs text-gray-500">{modelSlug || "GPT-4o"}</p>
        </div>
      </div>
    </div>
  )
} 