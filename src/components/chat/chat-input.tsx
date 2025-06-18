"use client"

import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useRef, KeyboardEvent, useState } from "react"
import { FileUpload } from "./file-upload"
import { AttachmentPreview } from "./attachment-preview"
import { GlobalDropZone } from "./global-drop-zone"
import { Id } from "../../../convex/_generated/dataModel"

interface ChatInputProps {
  input: string
  isLoading: boolean
  conversationId: Id<"conversations">
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent, attachments?: Id<"fileAttachments">[]) => void
}

export function ChatInput({ 
  input, 
  isLoading, 
  conversationId,
  onInputChange, 
  onSubmit 
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Id<"fileAttachments">[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  console.log("[ChatInput] Rendering with", attachments.length, "attachments")

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[ChatInput] Form submitted with", attachments.length, "attachments")
    onSubmit(e, attachments.length > 0 ? attachments : undefined)
    setAttachments([]) // Clear attachments after sending
  }

  const handleFileUploaded = (attachmentId: Id<"fileAttachments">) => {
    console.log("[ChatInput] File uploaded:", attachmentId)
    setAttachments(prev => [...prev, attachmentId])
    setUploadError(null)
  }

  const handleFileError = (error: string) => {
    console.error("[ChatInput] File upload error:", error)
    setUploadError(error)
  }

  const handleRemoveAttachment = (attachmentId: Id<"fileAttachments">) => {
    console.log("[ChatInput] Removing attachment:", attachmentId)
    setAttachments(prev => prev.filter(id => id !== attachmentId))
  }

  const handleGlobalFilesDropped = (files: File[]) => {
    console.log("[ChatInput] Global files dropped:", files.length, "files")
    // We can't directly handle the files here, so we'll just show an info message
    // The FileUpload component will handle the actual upload
    setUploadError("Please use the attachment button to upload files or drag them directly to the attachment area.")
  }

  return (
    <>
      {/* Global drop zone for drag and drop anywhere */}
      <GlobalDropZone
        onFilesDropped={handleGlobalFilesDropped}
        isActive={!isLoading}
        disabled={isLoading}
      />

      <div className="flex-shrink-0 border-t border-gray-200 bg-white">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Attached files ({attachments.length}):
              </p>
              <div className="space-y-2">
                {attachments.map((attachmentId) => (
                  <AttachmentPreview
                    key={attachmentId}
                    attachmentId={attachmentId}
                    onRemove={() => handleRemoveAttachment(attachmentId)}
                    showRemoveButton={true}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {uploadError && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm text-red-600">{uploadError}</p>
              <button
                onClick={() => setUploadError(null)}
                className="text-xs text-red-500 hover:text-red-700 underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
              <FileUpload
                conversationId={conversationId}
                onFileUploaded={handleFileUploaded}
                onError={handleFileError}
              />
              
              <input
                ref={inputRef}
                value={input}
                onChange={onInputChange}
                onKeyPress={handleKeyPress}
                placeholder={
                  attachments.length > 0 
                    ? "Add a message about your files..." 
                    : "Send a message..."
                }
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent text-[15px] placeholder:text-gray-400"
                disabled={isLoading}
              />
              
              <Button
                type="submit"
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
                className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                size="sm"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
} 