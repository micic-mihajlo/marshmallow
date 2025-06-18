"use client"

import { Bot, Pencil, X, Check, Settings } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { ModelSelector } from "./model-selector"

interface ChatHeaderProps {
  conversationTitle?: string
  modelSlug?: string
  onModelChange?: (modelId: string) => void
  onTitleChange?: (title: string) => void
  isLoading?: boolean
}

export function ChatHeader({ conversationTitle, modelSlug, onModelChange, onTitleChange, isLoading }: ChatHeaderProps) {
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

  return (
    <div className="h-14 border-b border-gray-200 bg-white flex items-center px-4">
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
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
                className="text-sm font-medium text-gray-900 px-2 py-0.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            ) : (
              <h2
                className="font-medium text-gray-900 text-sm cursor-pointer"
                onDoubleClick={() => setEditing(true)}
              >
                {conversationTitle || "Chat"}
              </h2>
            )}
            {onTitleChange && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="p-1 rounded hover:bg-gray-100 text-gray-500 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {editing && (
              <div className="flex gap-1">
                <button onClick={save} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="h-4 w-4"/></button>
                <button onClick={cancel} className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="h-4 w-4"/></button>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <a
            href="/settings"
            className="p-2 rounded hover:bg-gray-100 text-gray-500 transition-colors"
            title="Model Settings"
          >
            <Settings className="h-4 w-4" />
          </a>
          {onModelChange && (
            <ModelSelector
              selectedModel={modelSlug || "google/gemini-2.5-flash-preview-05-20"}
              onModelChange={onModelChange}
              disabled={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  )
} 