import { Bot } from "lucide-react"

export function TypingIndicator() {
  return (
    <div className="flex gap-3 w-full justify-start">
      <div className="flex-shrink-0">
        <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      </div>
      
      <div className="bg-white rounded-2xl px-4 py-3">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
        </div>
      </div>
    </div>
  )
} 