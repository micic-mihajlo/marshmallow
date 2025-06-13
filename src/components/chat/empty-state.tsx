import { Bot, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onCreateConversation: () => void
}

export function EmptyState({ onCreateConversation }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Bot className="h-8 w-8 text-gray-600" />
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Marshmallow</h2>
        <p className="text-gray-600 mb-8">
          Start a conversation with our AI assistant
        </p>
        
        <Button
          onClick={onCreateConversation}
          className="bg-gray-900 hover:bg-gray-800 text-white"
          size="lg"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Start New Chat
        </Button>
      </div>
    </div>
  )
} 