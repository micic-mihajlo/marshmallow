"use client"

import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useRef, KeyboardEvent, useState } from "react"
import { useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
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
  
  // Add mutations for direct file upload
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl)
  const storeFileMetadata = useMutation(api.fileStorage.storeFileMetadata)

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
    
    // Process each dropped file using the same logic as FileUpload component
    files.forEach(async (file) => {
      console.log("[ChatInput] Processing globally dropped file:", file.name, file.type, file.size)
      
      // Validate file size and type (same as FileUpload component)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      const ALLOWED_TYPES = [
        "image/jpeg",
        "image/png", 
        "image/gif",
        "image/webp",
        "application/pdf",
      ];

      if (file.size > MAX_FILE_SIZE) {
        const error = `File "${file.name}" is too large. Maximum size is 10MB.`;
        console.error("[ChatInput] File too large:", error);
        setUploadError(error);
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        const error = `File type "${file.type}" is not supported. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.`;
        console.error("[ChatInput] Invalid file type:", error);
        setUploadError(error);
        return;
      }

             // If validation passes, upload the file directly
       try {
         console.log("[ChatInput] Starting upload for globally dropped file:", file.name);
         
         // Get upload URL from Convex
         const uploadUrl = await generateUploadUrl();
         console.log("[ChatInput] Upload URL generated for global drop");
         
         // Upload file to Convex storage
         const result = await fetch(uploadUrl, {
           method: "POST",
           headers: { "Content-Type": file.type },
           body: file,
         });

         if (!result.ok) {
           const errorText = await result.text();
           console.error("[ChatInput] Upload failed:", result.status, errorText);
           throw new Error(`Upload failed: ${result.status} ${errorText}`);
         }
         
         const { storageId } = await result.json();
         console.log("[ChatInput] Global drop file uploaded successfully, storage ID:", storageId);
         
         // Store file metadata
         const attachmentId = await storeFileMetadata({
           storageId,
           fileName: file.name,
           fileType: file.type,
           fileSize: file.size,
           conversationId,
         });

         console.log("[ChatInput] Global drop file upload completed successfully:", attachmentId);
         handleFileUploaded(attachmentId);
         
       } catch (error) {
         console.error("[ChatInput] Error processing globally dropped file:", error);
         const errorMessage = error instanceof Error ? error.message : `Failed to process file "${file.name}"`;
         setUploadError(errorMessage);
       }
    });
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