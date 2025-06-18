"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Plus, Trash2, Clock, Share2, Check, Link as LinkIcon } from "lucide-react"

import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Id } from "../../../convex/_generated/dataModel"
import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"

interface Conversation {
  _id: Id<"conversations">
  title: string
  modelSlug: string
  _creationTime: number
  shareId?: string
  isPublic?: boolean
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
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null)
  
  const toggleSharing = useMutation(api.conversations.toggleConversationSharing)

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

    if (minutes < 1) return "now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString()
  }

  const handleShare = async (e: React.MouseEvent, conversation: Conversation) => {
    e.stopPropagation()
    
    try {
      const shareId = await toggleSharing({ 
        id: conversation._id, 
        isPublic: !conversation.isPublic 
      })
      
      if (shareId && !conversation.isPublic) {
        // Copy to clipboard
        const shareUrl = `${window.location.origin}/share/${shareId}`
        await navigator.clipboard.writeText(shareUrl)
        setCopiedShareId(shareId)
        setTimeout(() => setCopiedShareId(null), 2000)
      }
    } catch (error) {
      console.error("Failed to toggle sharing:", error)
    }
  }

  const copyShareLink = async (e: React.MouseEvent, shareId: string) => {
    e.stopPropagation()
    const shareUrl = `${window.location.origin}/share/${shareId}`
    await navigator.clipboard.writeText(shareUrl)
    setCopiedShareId(shareId)
    setTimeout(() => setCopiedShareId(null), 2000)
  }

  return (
    <div className="w-72 bg-white border-r border-slate-200 flex flex-col h-screen">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:bg-slate-800 transition-colors duration-200 shadow-sm">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-slate-900 text-xl tracking-tight">Marshmallow</span>
          </Link>
          <UserButton 
            afterSignOutUrl="/" 
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 shadow-sm"
              }
            }}
          />
        </div>
        
        <Button 
          onClick={onCreateConversation}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium shadow-sm hover:shadow-md transition-all duration-200"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          New conversation
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-auto p-3">
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
                  "w-full text-left p-3 rounded-xl transition-all duration-200 relative border",
                  selectedConversationId === conversation._id
                    ? "bg-slate-50 border-slate-200 shadow-sm"
                    : "border-transparent hover:bg-slate-50 hover:border-slate-100"
                )}
              >
                <div className="pr-8">
                  <div className="font-medium text-slate-900 text-sm leading-relaxed truncate">
                    {conversation.title}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(conversation._creationTime)}</span>
                    {conversation.isPublic && (
                      <>
                        <span className="mx-1">•</span>
                        <LinkIcon className="h-3 w-3" />
                        <span>Shared</span>
                      </>
                    )}
                  </div>
                </div>
              </button>

              {/* Action buttons */}
              {hoveredConversation === conversation._id && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  {conversation.isPublic && conversation.shareId ? (
                    <button
                      onClick={(e) => copyShareLink(e, conversation.shareId!)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200"
                      title="Copy share link"
                    >
                      {copiedShareId === conversation.shareId ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}
                  
                  <button
                    onClick={(e) => handleShare(e, conversation)}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      conversation.isPublic
                        ? "hover:bg-amber-50 text-amber-600 hover:text-amber-700"
                        : "hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                    )}
                    title={conversation.isPublic ? "Make private" : "Share conversation"}
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  
                  <button
                    onClick={(e) => handleDeleteClick(e, conversation._id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all duration-200"
                    title="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Delete confirmation modal */}
              {showDeleteConfirm === conversation._id && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
                    <h3 className="font-semibold text-slate-900 text-lg mb-2">Delete conversation?</h3>
                                         <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                       This will permanently delete &ldquo;{conversation.title}&rdquo; and cannot be undone.
                     </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(null)}
                        className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm"
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
        </div>
        
        {(!conversations || conversations.length === 0) && (
          <div className="text-center py-12 px-4">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-100">
              <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-slate-400" />
              </div>
                             <p className="text-sm text-slate-600 font-medium mb-1">No conversations yet</p>
               <p className="text-xs text-slate-500">Click &ldquo;New conversation&rdquo; to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 