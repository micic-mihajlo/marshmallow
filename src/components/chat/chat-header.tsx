"use client"

import { Bot, Pencil, X, Check, Globe, Settings } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { ModelSelector } from "./model-selector"

interface ChatHeaderProps {
  conversationTitle?: string
  modelSlug?: string
  mcpUrl?: string
  webSearchEnabled?: boolean
  webSearchOptions?: {
    maxResults?: number
    searchContextSize?: "low" | "medium" | "high"
  }
  onModelChange?: (modelId: string) => void
  onTitleChange?: (title: string) => void
  onMcpUrlChange?: (url: string) => void
  onWebSearchChange?: (enabled: boolean, options?: { maxResults?: number; searchContextSize?: "low" | "medium" | "high" }) => void
  isLoading?: boolean
}

export function ChatHeader({ conversationTitle, modelSlug, mcpUrl, webSearchEnabled, webSearchOptions, onModelChange, onTitleChange, onMcpUrlChange, onWebSearchChange, isLoading }: ChatHeaderProps) {
  const [editing, setEditing] = useState(false)
  const [mcpEditing, setMcpEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState(conversationTitle || "")
  const inputRef = useRef<HTMLInputElement>(null)
  const mcpInputRef = useRef<HTMLInputElement>(null)

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

  const saveMcp = () => {
    const url = mcpInputRef.current?.value.trim() || ""
    onMcpUrlChange?.(url)
    setMcpEditing(false)
  }

  const cancelMcp = () => {
    setMcpEditing(false)
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
        
        {onModelChange && (
          <ModelSelector
            selectedModel={modelSlug || "google/gemini-2.5-flash-preview-05-20"}
            onModelChange={onModelChange}
            disabled={isLoading}
          />
        )}

        {onMcpUrlChange && (
          mcpEditing ? (
            <div className="flex items-center gap-2 ml-4">
              <input
                ref={mcpInputRef}
                defaultValue={mcpUrl || ""}
                placeholder="https://mcp-server.com"
                className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button onClick={saveMcp} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check className="h-4 w-4"/></button>
              <button onClick={cancelMcp} className="p-1 text-red-600 hover:bg-red-50 rounded"><X className="h-4 w-4"/></button>
            </div>
          ) : (
            <button
              onClick={() => setMcpEditing(true)}
              className="ml-4 text-xs text-gray-600 hover:text-gray-900 underline"
            >
              {mcpUrl ? "Edit MCP" : "Add MCP"}
            </button>
          )
        )}

        {onWebSearchChange && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => onWebSearchChange(!webSearchEnabled, webSearchOptions)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                webSearchEnabled 
                  ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Globe className="h-3 w-3" />
              Web Search
            </button>
            {webSearchEnabled && (
              <div className="text-xs text-gray-500">
                ({webSearchOptions?.maxResults || 5} results, {webSearchOptions?.searchContextSize || "medium"})
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 