import { MessageSquare, Plus, Sparkles, Zap, Brain } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onCreateConversation: () => void
}

export function EmptyState({ onCreateConversation }: EmptyStateProps) {
  const suggestions = [
    {
      icon: Brain,
      title: "Brainstorm ideas",
      description: "Get creative suggestions for your projects"
    },
    {
      icon: Zap,
      title: "Quick answers",
      description: "Ask questions and get instant responses"
    },
    {
      icon: Sparkles,
      title: "Creative writing",
      description: "Generate stories, poems, or content"
    }
  ]

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="h-20 w-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
          <MessageSquare className="h-10 w-10 text-orange-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Start a conversation
        </h2>
        <p className="text-gray-600 mb-8 leading-relaxed">
          Create a new chat to begin talking with AI. Ask questions, get help, or just have a conversation.
        </p>
        
        <Button 
          onClick={onCreateConversation}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-sm mb-8 px-6 py-3"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Start New Chat
        </Button>

        <div className="grid gap-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Try asking about:</div>
          {suggestions.map((suggestion, index) => (
            <div key={index} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <suggestion.icon className="h-4 w-4 text-orange-600" />
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-900 text-sm">{suggestion.title}</div>
                <div className="text-xs text-gray-500">{suggestion.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 