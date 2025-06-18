"use client";

import { useCallback, useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Paperclip, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Id } from "../../../convex/_generated/dataModel";

interface FileUploadProps {
  conversationId: Id<"conversations">;
  onFileUploaded: (attachmentId: Id<"fileAttachments">) => void;
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
    console.log("[FileUpload] Starting file upload:", {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      conversationId,
    });

    if (file.size > MAX_FILE_SIZE) {
      const error = `File size must be less than 10MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
      console.error("[FileUpload] File too large:", error);
      onError(error);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      const error = `File type ${file.type} is not supported. Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.`;
      console.error("[FileUpload] Invalid file type:", error);
      onError(error);
      return;
    }

    setIsUploading(true);
    
    try {
      console.log("[FileUpload] Generating upload URL...");
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl();
      console.log("[FileUpload] Upload URL generated successfully");
      
      console.log("[FileUpload] Uploading file to Convex storage...");
      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) {
        const errorText = await result.text();
        console.error("[FileUpload] Upload failed:", result.status, errorText);
        throw new Error(`Upload failed: ${result.status} ${errorText}`);
      }
      
      const { storageId } = await result.json();
      console.log("[FileUpload] File uploaded successfully, storage ID:", storageId);
      
      console.log("[FileUpload] Storing file metadata...");
      // Store file metadata
      const attachmentId = await storeFileMetadata({
        storageId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        conversationId,
      });

      console.log("[FileUpload] File upload completed successfully:", attachmentId);
      onFileUploaded(attachmentId);
    } catch (error) {
      console.error("[FileUpload] Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      onError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [conversationId, generateUploadUrl, storeFileMetadata, onFileUploaded, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    console.log("[FileUpload] Files dropped");
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    console.log("[FileUpload] Processing", files.length, "dropped files");
    files.forEach(uploadFile);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) {
      console.log("[FileUpload] Drag enter detected");
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only set dragging to false if we're leaving the drop zone itself
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      console.log("[FileUpload] Drag leave detected");
      setIsDragging(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    console.log("[FileUpload] Files selected via input:", files.length, "files");
    files.forEach(uploadFile);
    // Reset the input so the same file can be selected again
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
        onClick={() => {
          console.log("[FileUpload] File attachment button clicked");
          fileInputRef.current?.click();
        }}
        disabled={isUploading}
        className={cn(
          "p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50",
          isUploading && "cursor-not-allowed"
        )}
        title="Attach file"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Paperclip className="w-5 h-5" />
        )}
      </button>

      {/* Local drop overlay for this component */}
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
            <p className="text-sm text-gray-500">Images and PDFs supported (max 10MB)</p>
          </div>
        </div>
      )}
    </div>
  );
} 