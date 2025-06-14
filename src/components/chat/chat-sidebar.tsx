"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Plus } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Id } from "../../../convex/_generated/dataModel"

interface Conversation {
  _id: Id<"conversations">
  title: string
  modelSlug: string
  _creationTime: number
}

interface ChatSidebarProps {
  conversations: Conversation[] | undefined
  selectedConversationId: Id<"conversations"> | null
  onSelectConversation: (id: Id<"conversations">) => void
  onCreateConversation: () => void
}

export function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
}: ChatSidebarProps) {
  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-lg">Marshmallow</span>
          </Link>
          <UserButton 
            afterSignOutUrl="/" 
            appearance={{
              elements: {
                avatarBox: "h-7 w-7"
              }
            }}
          />
        </div>
        
        <Button 
          onClick={onCreateConversation}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-auto p-2">
        <div className="space-y-1">
          {conversations?.map((conversation) => (
            <button
              key={conversation._id}
              onClick={() => onSelectConversation(conversation._id)}
              className={cn(
                "w-full text-left p-3 rounded-lg transition-all duration-150",
                selectedConversationId === conversation._id
                  ? "bg-white shadow-sm"
                  : "hover:bg-gray-100"
              )}
            >
              <div className="font-medium text-gray-900 text-sm truncate">
                {conversation.title}
              </div>
              <div className="text-xs text-gray-500 truncate mt-0.5">
                {new Date(conversation._creationTime).toLocaleDateString()}
              </div>
            </button>
          ))}
          
          {(!conversations || conversations.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No conversations yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 