"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { MessageBubble } from "@/components/chat/message-bubble"
import { Button } from "@/components/ui/button"
import { MessageSquare, Copy, LogIn } from "lucide-react"
import Link from "next/link"
import { useAuth, SignInButton } from "@clerk/nextjs"
import { useRouter, useSearchParams, useParams } from "next/navigation"
import { useState, useEffect } from "react"

export default function SharePage() {
  const { shareId } = useParams<{ shareId: string }>()
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCloning, setIsCloning] = useState(false)
  const [hasTriedAutoClone, setHasTriedAutoClone] = useState(false)
  
  const publicConversation = useQuery(api.conversations.getPublicConversation, { 
    shareId: shareId as string 
  })
  
  const messages = useQuery(api.messages.getPublicMessages, { 
    shareId: shareId as string 
  })
  
  const cloneConversation = useMutation(api.conversations.cloneConversation)

  const handleClone = async () => {
    if (!isSignedIn || isCloning) {
      return
    }

    try {
      setIsCloning(true)
      const newConversationId = await cloneConversation({ shareId: shareId as string })
      router.push(`/chat?conversation=${newConversationId}`)
    } catch (error) {
      console.error("Failed to clone conversation:", error)
      setIsCloning(false)
    }
  }

  // Auto-clone after sign-in
  useEffect(() => {
    // Check if user just signed in and should auto-clone
    const shouldAutoClone = searchParams.get('clone') === 'true'
    
    if (isLoaded && isSignedIn && shouldAutoClone && !hasTriedAutoClone && publicConversation) {
      setHasTriedAutoClone(true)
      handleClone()
    }
  }, [isLoaded, isSignedIn, searchParams, hasTriedAutoClone, publicConversation])

  if (!publicConversation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Conversation not found</h1>
          <p className="text-gray-600 mb-6">This conversation may have been deleted or is no longer public.</p>
          <Link href="/">
            <Button className="rounded-xl">Go to Homepage</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-gray-900 hover:text-gray-700">
                <MessageSquare className="h-6 w-6" />
                <span className="font-semibold">Marshmallow</span>
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Shared conversation</span>
            </div>
            
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <Button
                  onClick={handleClone}
                  disabled={isCloning}
                  className="rounded-xl"
                  size="sm"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {isCloning ? "Cloning..." : "Clone & Continue"}
                </Button>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl={`${window.location.pathname}?clone=true`}>
                  <Button className="rounded-xl" size="sm">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in to Continue
                  </Button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Conversation info */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {publicConversation.conversation.title}
          </h1>
          <p className="text-sm text-gray-600">
            Shared by {publicConversation.ownerName}
          </p>
        </div>

        {/* Messages */}
        <div className="space-y-4">
          {messages?.map((message) => (
            <MessageBubble
              key={message._id}
              id={message._id}
              role={message.role}
              content={message.content}
              timestamp={new Date(message.timestamp)}
              attachments={message.attachments}
            />
          ))}
        </div>

        {/* Call to action */}
        {!isCloning && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Want to continue this conversation?
            </h3>
            <p className="text-gray-600 mb-4">
              {isSignedIn 
                ? "Clone this conversation to your account and continue chatting."
                : "Sign in to clone this conversation and continue where it left off."
              }
            </p>
            {isSignedIn ? (
              <Button
                onClick={handleClone}
                disabled={isCloning}
                className="rounded-xl"
              >
                <Copy className="h-4 w-4 mr-2" />
                {isCloning ? "Cloning..." : "Clone Conversation"}
              </Button>
            ) : (
              <SignInButton mode="modal" forceRedirectUrl={`${window.location.pathname}?clone=true`}>
                <Button className="rounded-xl">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in to Continue
                </Button>
              </SignInButton>
            )}
          </div>
        )}

        {/* Show loading state while cloning */}
        {isCloning && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Cloning conversation...</p>
          </div>
        )}
      </div>
    </div>
  )
} 