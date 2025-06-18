# Multi-Modal File Upload Implementation Plan

## Overview
Integrate file upload functionality for PDFs and images into the marshmallow chat application using Convex file storage and OpenRouter's multi-modal API support.

## Technical Stack
- **Backend**: Convex for file storage and database
- **AI Provider**: OpenRouter with multi-modal support
- **Frontend**: Next.js 15 with React
- **Authentication**: Clerk

## Implementation Phases

### Phase 1: Database Schema Updates ✅
- [x] Add file attachments table to Convex schema (commit: 0802d18)
- [x] Add attachment references to messages table (commit: 0802d18)
- [x] Update conversation metadata for file support (commit: 0802d18)

### Phase 2: Convex File Storage Setup ✅
- [x] Create file upload mutations (commit: 7dd26be)
- [x] Create file URL generation queries (commit: 7dd26be)
- [x] Add file metadata storage (commit: 7dd26be)
- [x] Implement file deletion functionality (commit: 7dd26be)

### Phase 3: Frontend File Upload Components ✅
- [x] Create file upload component with drag-and-drop (commit: e3cedfc)
- [x] Add file attachment preview component (commit: e3cedfc)
- [x] Create global drag-and-drop overlay (commit: e3cedfc)
- [x] Add file attachment icon to chat input (commit: e3cedfc)

### Phase 4: Chat Input Enhancement ✅
- [x] Modify chat input to support file attachments (commit: 7c4f654)
- [x] Add file selection button (commit: 7c4f654)
- [x] Implement attachment display in input area (commit: 7c4f654)
- [x] Add file removal functionality (commit: 7c4f654)

### Phase 5: OpenRouter Integration ✅
- [x] Update chat action to handle file attachments (commit: 7c4f654)
- [x] Convert Convex file storage IDs to URLs (commit: 7c4f654)
- [x] Format messages for OpenRouter multi-modal API (commit: 7c4f654)
- [x] Handle base64 encoding for images (commit: 7c4f654)

### Phase 6: Message Display Updates ✅
- [x] Update message bubble component for file display (commit: 0d94b0f)
- [x] Add file preview in chat history (commit: 0d94b0f)
- [x] Implement file download functionality (commit: 0d94b0f)
- [x] Add proper error handling for unsupported files (commit: 0d94b0f)

### Phase 7: Model Configuration 🔄
- [ ] Update model settings to include file upload capabilities
- [ ] Add vision/multi-modal flags to models
- [ ] Implement model-specific file restrictions

### Phase 8: Testing & Optimization 🔄
- [ ] Test file upload flow end-to-end
- [ ] Test drag-and-drop functionality
- [ ] Verify OpenRouter integration
- [ ] Performance optimization for large files

## Implementation Status Summary

### ✅ **COMPLETED PHASES (1-6)**
All core functionality for multi-modal file uploads has been implemented:

1. **Database Schema** - File attachments table with proper relationships
2. **File Storage** - Convex file storage with upload/download/delete operations
3. **Upload Components** - Drag-and-drop file upload with preview
4. **Chat Input** - Enhanced input with attachment support and global drop zones
5. **OpenRouter Integration** - Multi-modal message formatting for AI models
6. **Message Display** - File previews in chat history with download functionality

### 🔄 **REMAINING WORK (Phases 7-8)**
- Model-specific file upload restrictions
- End-to-end testing and performance optimization

### 🚀 **READY FOR TESTING**
The implementation is now ready for testing! You can:
- Upload images and PDFs via the attachment button
- Drag and drop files anywhere on the chat interface
- View file previews in chat messages
- Download files from chat history
- Send files to OpenRouter-compatible AI models

### 📋 **Testing Instructions**
1. Start your Convex development server: `npx convex dev`
2. Start your Next.js development server: `npm run dev`
3. Create a new conversation
4. Try uploading images and PDFs
5. Send messages with attachments to test AI integration
6. Verify file previews appear correctly in chat history

## Detailed Implementation Steps

### 1. Database Schema Updates

#### Update `marshmallow/convex/schema.ts`:
- Add `fileAttachments` table
- Update `messages` table with attachment references

```typescript
export default defineSchema({
  // ... existing tables

  fileAttachments: defineTable({
    userId: v.id("users"),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")), // null for pending uploads
    fileName: v.string(),
    fileType: v.string(), // mime type
    fileSize: v.number(),
    storageId: v.id("_storage"), // Convex file storage ID
    createdAt: v.number(),
    uploadedAt: v.number(),
  })
  .index("by_user", ["userId"])
  .index("by_conversation", ["conversationId"])
  .index("by_message", ["messageId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
    tokenCount: v.optional(v.number()),
    attachments: v.optional(v.array(v.id("fileAttachments"))), // file attachment IDs
  }).index("by_conversation", ["conversationId"]),
});
```

### 2. Convex File Storage Functions

#### Create `marshmallow/convex/fileStorage.ts`:
```typescript
import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Generate upload URL for file
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    
    return await ctx.storage.generateUploadUrl();
  },
});

// Store file metadata after upload
export const storeFileMetadata = mutation({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
    conversationId: v.id("conversations"),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new ConvexError("User not found");

    // Verify conversation ownership
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== user._id) {
      throw new ConvexError("Unauthorized");
    }

    return await ctx.db.insert("fileAttachments", {
      userId: user._id,
      conversationId: args.conversationId,
      messageId: args.messageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      storageId: args.storageId,
      createdAt: Date.now(),
      uploadedAt: Date.now(),
    });
  },
});

// Get file URL for serving
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get file attachments for a message
export const getMessageAttachments = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const attachments = await ctx.db
      .query("fileAttachments")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .collect();

    // Generate URLs for all attachments
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await ctx.storage.getUrl(attachment.storageId),
      }))
    );

    return attachmentsWithUrls;
  },
});

// Delete file attachment
export const deleteFileAttachment = mutation({
  args: { attachmentId: v.id("fileAttachments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");

    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment) throw new ConvexError("Attachment not found");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || attachment.userId !== user._id) {
      throw new ConvexError("Unauthorized");
    }

    // Delete from storage
    await ctx.storage.delete(attachment.storageId);
    
    // Delete metadata
    await ctx.db.delete(args.attachmentId);
  },
});
```

### 3. File Upload Components

#### Create `marshmallow/src/components/chat/file-upload.tsx`:
```typescript
"use client";

import { useCallback, useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Paperclip, Upload, X, File, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  conversationId: string;
  onFileUploaded: (attachmentId: string) => void;
  onError: (error: string) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png", 
  "image/gif",
  "image/webp",
  "application/pdf",
];

export function FileUpload({ conversationId, onFileUploaded, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);
  const storeFileMetadata = useMutation(api.fileStorage.storeFileMetadata);

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      onError("File size must be less than 10MB");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      onError("Only images (JPEG, PNG, GIF, WebP) and PDFs are supported");
      return;
    }

    setIsUploading(true);
    
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      
      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) throw new Error("Upload failed");
      
      const { storageId } = await result.json();
      
      // Store file metadata
      const attachmentId = await storeFileMetadata({
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        conversationId,
      });

      onFileUploaded(attachmentId);
    } catch (error) {
      console.error("Upload error:", error);
      onError("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, generateUploadUrl, storeFileMetadata, onFileUploaded, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(uploadFile);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [uploadFile]);

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
        title="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* Drop overlay */}
      {isDragging && (
        <div 
          className="fixed inset-0 bg-blue-500/20 border-2 border-dashed border-blue-500 z-50 flex items-center justify-center"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <Upload className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Drop files here to upload</p>
            <p className="text-sm text-gray-500">Images and PDFs supported</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

#### Create `marshmallow/src/components/chat/attachment-preview.tsx`:
```typescript
"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { File, Image as ImageIcon, X } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface AttachmentPreviewProps {
  attachmentId: Id<"fileAttachments">;
  onRemove: () => void;
}

export function AttachmentPreview({ attachmentId, onRemove }: AttachmentPreviewProps) {
  const attachments = useQuery(api.fileStorage.getMessageAttachments, { 
    messageId: attachmentId as any // This needs to be adjusted based on your query structure
  });

  // This component would show a preview of the uploaded file
  // Implementation details depend on your specific needs
  
  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-3">
      <div className="flex-1">
        {/* File preview content */}
      </div>
      <button onClick={onRemove} className="text-gray-500 hover:text-red-500">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

### 4. Enhanced Chat Input

#### Update `marshmallow/src/components/chat/chat-input.tsx`:
```typescript
"use client"

import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { useRef, KeyboardEvent, useState } from "react"
import { FileUpload } from "./file-upload"
import { AttachmentPreview } from "./attachment-preview"
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

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(e, attachments)
    setAttachments([]) // Clear attachments after sending
  }

  const handleFileUploaded = (attachmentId: Id<"fileAttachments">) => {
    setAttachments(prev => [...prev, attachmentId])
    setUploadError(null)
  }

  const handleFileError = (error: string) => {
    setUploadError(error)
  }

  const handleRemoveAttachment = (attachmentId: Id<"fileAttachments">) => {
    setAttachments(prev => prev.filter(id => id !== attachmentId))
  }

  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white">
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="max-w-4xl mx-auto space-y-2">
            {attachments.map((attachmentId) => (
              <AttachmentPreview
                key={attachmentId}
                attachmentId={attachmentId}
                onRemove={() => handleRemoveAttachment(attachmentId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {uploadError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-100">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-red-600">{uploadError}</p>
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
              placeholder={attachments.length > 0 ? "Add a message about your files..." : "Send a message..."}
              className="flex-1 px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent text-[15px] placeholder:text-gray-400"
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
  )
}
```

### 5. OpenRouter Integration

#### Update `marshmallow/convex/chat.ts`:
```typescript
export const sendMessage = action({
  args: {
    conversationId: v.id("conversations"),
    prompt: v.string(),
    attachments: v.optional(v.array(v.id("fileAttachments"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // ... existing conversation verification code ...

    // Add user message with attachments
    const messageId = await ctx.runMutation(api.messages.addMessage, {
      conversationId: args.conversationId,
      role: "user",
      content: args.prompt,
      attachments: args.attachments,
    });

    // Get file attachments if any
    let attachmentContents: any[] = [];
    if (args.attachments && args.attachments.length > 0) {
      for (const attachmentId of args.attachments) {
        const attachment = await ctx.runQuery(api.fileStorage.getFileUrl, {
          storageId: attachmentId as any, // Adjust based on your implementation
        });
        
        if (attachment) {
          if (attachment.fileType.startsWith('image/')) {
            // For images, convert to base64 or use URL
            attachmentContents.push({
              type: "image_url",
              image_url: {
                url: attachment.url
              }
            });
          } else if (attachment.fileType === 'application/pdf') {
            // For PDFs, need to handle base64 encoding
            // This is a simplified version - you'd need proper base64 conversion
            attachmentContents.push({
              type: "file",
              file: {
                filename: attachment.fileName,
                file_data: `data:${attachment.fileType};base64,${attachment.base64}` // You'd need to implement base64 conversion
              }
            });
          }
        }
      }
    }

    // ... rest of existing code ...

    // Format messages for OpenRouter with attachments
    const formattedMessages = recentMessages.map((msg, index) => {
      const baseMessage = {
        role: msg.role as "user" | "assistant",
        content: msg.content,
      };

      // Add attachments to the message if it's the current one
      if (index === recentMessages.length - 1 && attachmentContents.length > 0) {
        return {
          ...baseMessage,
          content: [
            { type: "text", text: msg.content },
            ...attachmentContents
          ]
        };
      }

      return baseMessage;
    });

    // ... rest of OpenRouter API call ...
  },
});
```

### 6. Message Display Updates

#### Update `marshmallow/src/components/chat/message-bubble.tsx`:
```typescript
import { Bot, User, Download, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import { MemoizedMarkdown } from "./markdown"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
  timestamp?: Date
  id: string
  attachments?: Id<"fileAttachments">[]
}

export function MessageBubble({ role, content, timestamp, id, attachments }: MessageBubbleProps) {
  const isUser = role === "user"
  
  // Get attachment details if any
  const attachmentData = useQuery(
    api.fileStorage.getMessageAttachments,
    attachments && attachments.length > 0 ? { messageId: id as Id<"messages"> } : "skip"
  )
  
  return (
    <div className={cn("flex gap-3 w-full", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-gray-900 rounded-lg flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
      
      <div className={cn("flex flex-col", isUser ? "items-end" : "items-start", "min-w-0")}>
        {/* Attachments display */}
        {attachmentData && attachmentData.length > 0 && (
          <div className="mb-2 space-y-2">
            {attachmentData.map((attachment) => (
              <div key={attachment._id} className="border rounded-lg overflow-hidden bg-white">
                {attachment.fileType.startsWith('image/') ? (
                  <img 
                    src={attachment.url} 
                    alt={attachment.fileName}
                    className="max-w-xs rounded-lg"
                  />
                ) : (
                  <div className="p-3 flex items-center gap-2">
                    <div className="text-red-500">PDF</div>
                    <span className="text-sm">{attachment.fileName}</span>
                    <button 
                      onClick={() => window.open(attachment.url, '_blank')}
                      className="ml-auto text-blue-500 hover:text-blue-700"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          className={cn(
            "rounded-2xl px-4 py-2.5",
            isUser
              ? "bg-gray-900 text-white max-w-[85%] lg:max-w-md"
              : "bg-white max-w-[85%] lg:max-w-2xl"
          )}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{content}</div>
          ) : (
            <div className="overflow-hidden">
              <MemoizedMarkdown content={content} id={id} />
            </div>
          )}
        </div>
        
        {timestamp && (
          <div className="text-[11px] text-gray-400 mt-1 px-1">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="h-8 w-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  )
}
```

### 7. Global Drag & Drop

#### Create `marshmallow/src/components/chat/global-drop-zone.tsx`:
```typescript
"use client";

import { useCallback, useState, useEffect } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

interface GlobalDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  isActive?: boolean;
}

export function GlobalDropZone({ onFilesDropped, isActive = true }: GlobalDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setDragCounter(prev => prev - 1);
    if (dragCounter <= 1) {
      setIsDragging(false);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setDragCounter(0);
    
    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files);
      onFilesDropped(files);
    }
  }, [onFilesDropped]);

  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isActive, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  if (!isDragging) return null;

  return (
    <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-2 border-dashed border-blue-500">
        <Upload className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Drop files here</h3>
        <p className="text-gray-600">Images and PDFs supported</p>
      </div>
    </div>
  );
}
```

## Integration Notes

### OpenRouter API Format
Based on the documentation, messages should be formatted as:
```typescript
{
  role: "user",
  content: [
    {
      type: "text",
      text: "What's in this image?"
    },
    {
      type: "image_url",
      image_url: {
        url: "https://convex-file-url"
      }
    }
  ]
}
```

For PDFs:
```typescript
{
  role: "user", 
  content: [
    {
      type: "text",
      text: "What are the main points in this document?"
    },
    {
      type: "file",
      file: {
        filename: "document.pdf",
        file_data: "data:application/pdf;base64,..."
      }
    }
  ]
}
```

### Convex File Storage
- Use `ctx.storage.generateUploadUrl()` for client uploads
- Store metadata in custom table for querying
- Use `ctx.storage.getUrl()` to generate serving URLs
- Files are automatically served with proper CORS headers

### Model Compatibility
Update model settings to indicate which models support:
- `supportsImageUpload: boolean`
- `supportsFileUpload: boolean` 
- `supportsVision: boolean`

Only show file upload options for compatible models.

## Testing Checklist

- [ ] File upload via attachment button works
- [ ] Global drag & drop overlay appears and functions
- [ ] Image files display correctly in chat
- [ ] PDF files can be opened/downloaded
- [ ] File size limits are enforced
- [ ] File type restrictions work
- [ ] OpenRouter receives properly formatted messages
- [ ] Error handling for failed uploads
- [ ] File deletion works properly
- [ ] Performance with large files is acceptable

## Security Considerations

- [ ] Validate file types on server side
- [ ] Implement file size limits
- [ ] Scan uploaded files for malware (if needed)
- [ ] Ensure proper access controls for file URLs
- [ ] Rate limit file uploads per user
- [ ] Clean up orphaned files periodically

## Performance Optimizations

- [ ] Implement image compression for large images
- [ ] Add progress indicators for uploads
- [ ] Use lazy loading for attachment previews
- [ ] Cache file URLs when possible
- [ ] Optimize drag & drop event handlers

---

**Next Steps**: Start with Phase 1 (Database Schema Updates) and proceed sequentially through each phase. Each checkbox should be marked as completed with a commit hash for tracking progress. 