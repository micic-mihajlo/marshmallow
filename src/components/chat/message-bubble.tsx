import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { MemoizedMarkdown } from "./markdown"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
  id: string
}

export function MessageBubble({ role, content, timestamp, id }: MessageBubbleProps) {
  const isUser = role === "user"
  
  return (
    <div className={cn("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
      
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "min-w-0")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-gray-900 text-white max-w-[85%] lg:max-w-md"
              : "bg-white max-w-[85%] lg:max-w-2xl"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{content}</div>
          ) : (
            <div className="overflow-hidden">
              <MemoizedMarkdown content={content} id={id} />
            </div>
          )}
        </div>
        
        {timestamp && (
          <div className="text-[11px] text-gray-400 mt-1 px-1">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  )
} 