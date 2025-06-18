"use client"

import { Bot, Pencil, X, Check, Key } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { BYOKSettings } from "./byok-settings"
import { Button } from "@/components/ui/button"

interface ChatHeaderProps {
  conversationTitle?: string
  onTitleChange?: (title: string) => void
}

export function ChatHeader({ conversationTitle, onTitleChange }: ChatHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(conversationTitle || "")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
    }
  }, [editing])

  useEffect(() => {
    setTitleDraft(conversationTitle || "")
  }, [conversationTitle])

  const save = () => {
    const newTitle = titleDraft.trim() || "Untitled Chat"
    onTitleChange?.(newTitle)
    setEditing(false)
  }

  const cancel = () => {
    setTitleDraft(conversationTitle || "")
    setEditing(false)
  }

  const userApiKeyStatus = useQuery(api.userApiKeys.getUserApiKey)

  return (
    <div className="h-16 border-b border-gray-100 bg-white flex items-center px-6">
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gray-900 rounded-xl flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <input
                ref={inputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") save()
                  if (e.key === "Escape") cancel()
                }}
                className="text-lg font-medium text-gray-900 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              />
            ) : (
              <h1
                className="font-medium text-gray-900 text-lg cursor-pointer"
                onDoubleClick={() => setEditing(true)}
              >
                {conversationTitle || "New Chat"}
              </h1>
            )}
            {onTitleChange && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            {editing && (
              <div className="flex gap-1">
                <button onClick={save} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check className="h-4 w-4"/></button>
                <button onClick={cancel} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><X className="h-4 w-4"/></button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <BYOKSettings>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">
                {userApiKeyStatus?.hasApiKey ? "My API Key" : "Bring Your Own Key"}
              </span>
              {userApiKeyStatus?.hasApiKey && (
                <div className="h-2 w-2 bg-green-500 rounded-full" />
              )}
            </Button>
          </BYOKSettings>
        </div>
      </div>
    </div>
  )
} 