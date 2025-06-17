"use client"

import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useRef, KeyboardEvent } from "react"

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent) => void
}

export function ChatInput({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-4">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={onSubmit} className="relative">
          <input
            ref={inputRef}
            value={input}
            onChange={onInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Send a message..."
            className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent text-[15px] placeholder:text-gray-400"
            disabled={isLoading}
          />
          
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            size="sm"
          >
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
      </div>
    </div>
  )
} 