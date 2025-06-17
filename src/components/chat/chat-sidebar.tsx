"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Plus, Trash2 } from "lucide-react"
import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Id } from "../../../convex/_generated/dataModel"
import { useState } from "react"

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
  onDeleteConversation: (id: Id<"conversations">) => void
}

export function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const [hoveredConversation, setHoveredConversation] = useState<Id<"conversations"> | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Id<"conversations"> | null>(null)

  const handleDeleteClick = (e: React.MouseEvent, conversationId: Id<"conversations">) => {
    e.stopPropagation()
    setShowDeleteConfirm(conversationId)
  }

  const handleConfirmDelete = (conversationId: Id<"conversations">) => {
    onDeleteConversation(conversationId)
    setShowDeleteConfirm(null)
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200">
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
            <div
              key={conversation._id}
              className="relative group"
              onMouseEnter={() => setHoveredConversation(conversation._id)}
              onMouseLeave={() => setHoveredConversation(null)}
            >
              <button
                onClick={() => onSelectConversation(conversation._id)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-all duration-150 pr-10",
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

              {/* Delete button */}
              {hoveredConversation === conversation._id && (
                <button
                  onClick={(e) => handleDeleteClick(e, conversation._id)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}

              {/* Delete confirmation modal */}
              {showDeleteConfirm === conversation._id && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                    <h3 className="font-semibold text-gray-900 mb-2">Delete Conversation</h3>
                    <p className="text-gray-600 text-sm mb-4">
                      Are you sure you want to delete "{conversation.title}"? This action cannot be undone.
                    </p>
                    <div className="flex gap-3 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={() => handleConfirmDelete(conversation._id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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