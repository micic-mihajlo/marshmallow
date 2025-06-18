"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Plus, Trash2, Sparkles, Clock } from "lucide-react"

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

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  return (
    <div className="w-72 bg-gradient-to-b from-slate-50 via-white to-slate-50 border-r border-slate-200/60 flex flex-col h-screen backdrop-blur-sm">
      {/* Header with gradient overlay */}
      <div className="flex-shrink-0 p-6 border-b border-slate-200/60 bg-gradient-to-r from-white to-slate-50/80">
        <div className="flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25 group-hover:shadow-orange-500/40 transition-all duration-200 group-hover:scale-105">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
                         <span className="font-semibold text-slate-900 text-xl tracking-tight">Marshmallow</span>
          </Link>
          <div className="relative">
            <UserButton 
              afterSignOutUrl="/" 
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 shadow-md hover:shadow-lg transition-shadow"
                }
              }}
            />
          </div>
        </div>
        
        <Button 
          onClick={onCreateConversation}
          className="w-full bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white shadow-lg shadow-slate-900/25 hover:shadow-slate-900/40 transition-all duration-200 hover:scale-[1.02] border-0"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="font-medium">New Chat</span>
          <Sparkles className="h-3 w-3 ml-2 opacity-70" />
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-auto p-3 space-y-1">
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
                "w-full text-left p-4 rounded-xl transition-all duration-200 pr-12 border group-hover:shadow-sm",
                selectedConversationId === conversation._id
                  ? "bg-gradient-to-r from-white to-slate-50 shadow-md border-slate-200/80 ring-2 ring-orange-500/20"
                  : "hover:bg-white/70 hover:shadow-sm border-transparent hover:border-slate-200/60"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className={cn(
                    "h-2 w-2 rounded-full transition-colors",
                    selectedConversationId === conversation._id
                      ? "bg-orange-500 shadow-sm shadow-orange-500/50"
                      : "bg-slate-300 group-hover:bg-slate-400"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900 text-sm truncate leading-tight">
                    {conversation.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(conversation._creationTime)}</span>
                  </div>
                </div>
              </div>
            </button>

            {/* Delete button with improved styling */}
            {hoveredConversation === conversation._id && (
              <button
                onClick={(e) => handleDeleteClick(e, conversation._id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all duration-200 hover:scale-110 hover:shadow-md backdrop-blur-sm"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            {/* Enhanced delete confirmation modal */}
            {showDeleteConfirm === conversation._id && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-slate-200/60">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">Delete Conversation</h3>
                  </div>
                                     <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                     Are you sure you want to delete &ldquo;<span className="font-medium text-slate-900">{conversation.title}</span>&rdquo;? This action cannot be undone.
                   </p>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 border-slate-200 hover:bg-slate-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/25"
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
          <div className="text-center py-12 px-4">
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-8 border border-slate-200/60">
              <div className="h-12 w-12 bg-gradient-to-br from-slate-300 to-slate-400 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                <MessageSquare className="h-6 w-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-600 font-medium mb-1">No conversations yet</p>
              <p className="text-xs text-slate-500">Start a new chat to begin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 