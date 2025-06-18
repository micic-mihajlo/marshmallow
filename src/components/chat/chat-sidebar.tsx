"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Plus, Trash2, Clock, Share2, Link as LinkIcon, Copy, Check } from "lucide-react"

import { UserButton } from "@clerk/nextjs"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Id } from "../../../convex/_generated/dataModel"
import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

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
  const [shareDialogConversation, setShareDialogConversation] = useState<Conversation | null>(null)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  
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

  const openShareDialog = async (conversation: Conversation) => {
    setIsGeneratingLink(true)
    try {
      let link: string
      if (conversation.isPublic && conversation.shareId) {
        link = `${window.location.origin}/share/${conversation.shareId}`
      } else {
        const shareId = await toggleSharing({ id: conversation._id, isPublic: true })
        link = `${window.location.origin}/share/${shareId}`
      }
      setShareLink(link)
      setShareDialogConversation({ ...conversation, isPublic: true, shareId: conversation.shareId ?? link.split("/").pop() })
    } catch (err) {
      console.error("Failed to generate share link", err)
    } finally {
      setIsGeneratingLink(false)
    }
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
                <div className="pr-16">
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
                  <button
                    onClick={(e) => { e.stopPropagation(); openShareDialog(conversation) }}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all duration-200"
                    title="Share conversation"
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

      <Dialog open={!!shareDialogConversation} onOpenChange={(open) => { if (!open) { setShareDialogConversation(null); setLinkCopied(false) } }}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">Share conversation</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Anyone with the link can view this chat
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 border">
              <h3 className="font-medium text-gray-900 truncate">
                {shareDialogConversation?.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {shareDialogConversation?._creationTime && formatTimeAgo(shareDialogConversation._creationTime)}
              </p>
            </div>

            {isGeneratingLink ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-200 border-t-gray-900"></div>
                  <span className="text-sm text-gray-600">Generating link...</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Share link</label>
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-3">
                    <input
                      value={shareLink || ""}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-700 font-mono overflow-hidden text-ellipsis focus:outline-none"
                      onClick={(e) => e.currentTarget.select()}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      if (shareLink) {
                        await navigator.clipboard.writeText(shareLink)
                        setLinkCopied(true)
                      }
                    }}
                    className={cn(
                      "flex-1 rounded-lg font-medium",
                      linkCopied 
                        ? "bg-green-600 hover:bg-green-700 text-white" 
                        : "bg-gray-900 hover:bg-gray-800 text-white"
                    )}
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy link
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShareDialogConversation(null)
                      setLinkCopied(false)
                    }}
                    className="rounded-lg border-gray-200 hover:bg-gray-50"
                  >
                    Done
                  </Button>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> File attachments are not included in shared conversations for privacy and security.
                  </p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 