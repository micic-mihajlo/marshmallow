"use client"

import { useAuth } from "@clerk/nextjs"
import { useMutation, useQuery } from "convex/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { EmptyState } from "@/components/chat/empty-state"
import { ChatView } from "@/components/chat/chat-view"

export default function ChatPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null)

  const conversations = useQuery(api.conversations.getUserConversations)
  const createConversation = useMutation(api.conversations.createConversation)
  
  const effectiveConversationId = selectedConversationId || (conversations && conversations.length > 0 ? conversations[0]._id : null)
  const selectedConversation = conversations?.find(c => c._id === effectiveConversationId)

  useEffect(() => {
    if (effectiveConversationId && !selectedConversationId) {
      setSelectedConversationId(effectiveConversationId)
    }
  }, [effectiveConversationId, selectedConversationId])

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="h-16 w-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Authentication Required</h1>
          <p className="text-gray-600 mb-6">Please sign in to access the chat interface</p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }
  
  const handleCreateConversation = async () => {
    try {
      const conversationId = await createConversation({ title: "New Chat" })
      setSelectedConversationId(conversationId)
    } catch (error) {
      console.error("Failed to create conversation:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ChatSidebar
        conversations={conversations}
        selectedConversationId={effectiveConversationId}
        onSelectConversation={setSelectedConversationId}
        onCreateConversation={handleCreateConversation}
      />

      <main className="flex-1 flex flex-col h-screen">
        {effectiveConversationId ? (
          <ChatView
            key={effectiveConversationId}
            conversationId={effectiveConversationId}
            conversationTitle={selectedConversation?.title}
            modelSlug={selectedConversation?.modelSlug}
          />
        ) : (
          <EmptyState onCreateConversation={handleCreateConversation} />
        )}
      </main>
    </div>
  )
} 