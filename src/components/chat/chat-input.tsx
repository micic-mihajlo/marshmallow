"use client"

import { Button } from "@/components/ui/button"
import { Send, X, Globe, Settings, AlertTriangle } from "lucide-react"
import { useRef, KeyboardEvent, useState, useEffect } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { FileUpload } from "./file-upload"
import { AttachmentPreview } from "./attachment-preview"
import { GlobalDropZone } from "./global-drop-zone"
import { ModelSelector } from "./model-selector"
import { ApiKeyStatus } from "./api-key-status"
import { BYOKSettings } from "./byok-settings"
import { Id } from "../../../convex/_generated/dataModel"

interface ChatInputProps {
  input: string
  isLoading: boolean
  conversationId: Id<"conversations">
  modelSlug?: string
  webSearchEnabled?: boolean
  webSearchOptions?: {
    maxResults?: number
    searchContextSize?: "low" | "medium" | "high"
  }
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSubmit: (e: React.FormEvent, attachments?: Id<"fileAttachments">[]) => void
  onModelChange?: (modelId: string) => void
  onWebSearchChange?: (enabled: boolean, options?: { maxResults?: number; searchContextSize?: "low" | "medium" | "high" }) => void
}

export function ChatInput({ 
  input, 
  isLoading, 
  conversationId,
  modelSlug,
  webSearchEnabled,
  webSearchOptions,
  onInputChange, 
  onSubmit,
  onModelChange,
  onWebSearchChange
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [attachments, setAttachments] = useState<Id<"fileAttachments">[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Add mutations for direct file upload
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl)
  const storeFileMetadata = useMutation(api.fileStorage.storeFileMetadata)
  
  // Check BYOK requirements for current model
  const modelBYOKCheck = useQuery(
    api.modelSettings.checkModelBYOKRequirement, 
    modelSlug ? { modelSlug } : "skip"
  )
  const currentUser = useQuery(api.users.getCurrentUser)
  
  // Check if model requires BYOK but user doesn't have it enabled
  const requiresBYOKButNotEnabled = Boolean(
    modelBYOKCheck?.requiresBYOK && 
    currentUser && 
    !currentUser.useBYOK
  )

  // Clear upload error when switching to a model that doesn't require BYOK
  useEffect(() => {
    if (!requiresBYOKButNotEnabled && uploadError && uploadError.includes("BYOK")) {
      setUploadError(null)
    }
  }, [requiresBYOKButNotEnabled, uploadError])

  console.log("[ChatInput] Rendering with", attachments.length, "attachments")
  console.log("[ChatInput] BYOK check:", {
    modelSlug,
    requiresBYOK: modelBYOKCheck?.requiresBYOK,
    userHasBYOK: currentUser?.useBYOK,
    blocked: requiresBYOKButNotEnabled
  })

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      
      // Block Enter key submission if BYOK is required but not enabled
      if (requiresBYOKButNotEnabled) {
        console.log("[ChatInput] Enter key blocked: BYOK required but not enabled for", modelSlug)
        setUploadError("This model requires BYOK. Please enable BYOK in settings or select a different model.")
        return
      }
      
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Block submission if BYOK is required but not enabled
    if (requiresBYOKButNotEnabled) {
      console.log("[ChatInput] Submission blocked: BYOK required but not enabled for", modelSlug)
      setUploadError("This model requires BYOK. Please enable BYOK in settings or select a different model.")
      return
    }
    
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

      <div className="flex-shrink-0 bg-gradient-to-t from-gray-50 to-white">
        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="px-4 pt-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">
                  Attachments ({attachments.length})
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
          </div>
        )}

        {/* Error display */}
        {uploadError && (
          <div className="px-4 pt-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start justify-between">
                <p className="text-sm text-red-700 flex-1">{uploadError}</p>
                <button
                  type="button"
                  onClick={() => setUploadError(null)}
                  className="ml-3 text-red-500 hover:text-red-700 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* BYOK warning display */}
        {requiresBYOKButNotEnabled && (
          <div className="px-4 pt-4">
            <div className="max-w-4xl mx-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 font-medium">
                    BYOK Required for {modelBYOKCheck?.modelName || modelSlug}
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    This model requires you to bring your own OpenRouter API key. 
                    <BYOKSettings>
                      <button type="button" className="underline hover:text-amber-900 ml-1">
                        Enable BYOK in settings
                      </button>
                    </BYOKSettings> to use this model.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
              {/* Controls row */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {onModelChange && (
                    <ModelSelector
                      selectedModel={modelSlug || "google/gemini-2.5-flash-preview-05-20"}
                      onModelChange={onModelChange}
                      disabled={isLoading}
                      dropdownDirection="up"
                    />
                  )}
                  
                  {onWebSearchChange && (
                    <button
                      type="button"
                      onClick={() => onWebSearchChange(!webSearchEnabled, webSearchOptions)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        webSearchEnabled 
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200" 
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                      Search
                    </button>
                  )}
                </div>
                
                <a
                  href="/settings"
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Model Settings"
                >
                  <Settings className="h-4 w-4" />
                </a>
              </div>

              {/* Input row */}
              <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 focus-within:shadow-md focus-within:border-gray-300 px-4 py-3">
                <FileUpload
                  conversationId={conversationId}
                  onFileUploaded={handleFileUploaded}
                  onError={handleFileError}
                  disabled={requiresBYOKButNotEnabled}
                />
                
                <input
                  ref={inputRef}
                  value={input}
                  onChange={onInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    requiresBYOKButNotEnabled
                      ? "Enable BYOK in settings to use this model"
                      : attachments.length > 0 
                        ? "Add a message about your files..." 
                        : "Type your message here..."
                  }
                  className={`flex-1 py-1 bg-transparent outline-none text-[15px] placeholder:text-gray-400 ${
                    requiresBYOKButNotEnabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-800'
                  }`}
                  disabled={isLoading || requiresBYOKButNotEnabled}
                />
                
                <Button
                  type="submit"
                  disabled={(!input.trim() && attachments.length === 0) || isLoading || requiresBYOKButNotEnabled}
                  className={`
                    p-2.5 rounded-xl transition-all duration-200
                    ${(!input.trim() && attachments.length === 0) || isLoading || requiresBYOKButNotEnabled
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 hover:bg-gray-800 text-white hover:scale-105 active:scale-100'
                    }
                  `}
                  size="sm"
                  title={requiresBYOKButNotEnabled ? "Enable BYOK in settings to use this model" : undefined}
                >
                  <Send className={`h-4 w-4 ${(input.trim() || attachments.length > 0) && !isLoading && !requiresBYOKButNotEnabled ? 'rotate-0' : '-rotate-12'} transition-transform duration-200`} />
                </Button>
              </div>
              
              {/* API Key Status */}
              <div className="mt-2 flex justify-end">
                <ApiKeyStatus />
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
} 