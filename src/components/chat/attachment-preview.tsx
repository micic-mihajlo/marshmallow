"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FileText, X, Download, Eye, Loader2 } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface AttachmentPreviewProps {
  attachmentId: Id<"fileAttachments">;
  onRemove: () => void;
  showRemoveButton?: boolean;
}

export function AttachmentPreview({ 
  attachmentId, 
  onRemove, 
  showRemoveButton = true 
}: AttachmentPreviewProps) {
  console.log("[AttachmentPreview] Rendering preview for attachment:", attachmentId);
  
  const attachment = useQuery(api.fileStorage.getFileAttachment, { 
    attachmentId 
  });

  if (attachment === undefined) {
    console.log("[AttachmentPreview] Loading attachment data...");
    return (
      <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (attachment === null) {
    console.error("[AttachmentPreview] Attachment not found:", attachmentId);
    return (
      <div className="flex items-center gap-3 bg-red-50 rounded-xl p-3 border border-red-100">
        <X className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-600">Attachment not found</span>
        {showRemoveButton && (
          <button 
            onClick={onRemove} 
            className="ml-auto text-red-500 hover:text-red-700 transition-colors"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  console.log("[AttachmentPreview] Attachment loaded:", {
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
  });

  const isImage = attachment.fileType.startsWith('image/');
  const isPdf = attachment.fileType === 'application/pdf';
  
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = () => {
    console.log("[AttachmentPreview] Downloading file:", attachment.fileName);
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  };

  const handleView = () => {
    console.log("[AttachmentPreview] Viewing file:", attachment.fileName);
    if (attachment.url) {
      window.open(attachment.url, '_blank');
    }
  };

  if (isImage && attachment.url) {
    console.log("[AttachmentPreview] Rendering image preview");
    return (
      <div className="relative group">
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white max-w-xs shadow-sm hover:shadow-md transition-shadow">
          <div className="relative">
            <img 
              src={attachment.url} 
              alt={attachment.fileName}
              className="w-full h-auto max-h-48 object-cover"
              onLoad={() => console.log("[AttachmentPreview] Image loaded successfully")}
              onError={() => console.error("[AttachmentPreview] Image failed to load")}
            />
            
            {/* Overlay controls */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
              <button
                onClick={handleView}
                className="p-2 bg-white rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-100"
                title="View fullscreen"
              >
                <Eye className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 bg-white rounded-xl hover:bg-gray-100 transition-all duration-200 hover:scale-105 active:scale-100"
                title="Download"
              >
                <Download className="w-4 h-4 text-gray-700" />
              </button>
              {showRemoveButton && (
                <button
                  onClick={onRemove}
                  className="p-2 bg-white rounded-xl hover:bg-red-50 transition-all duration-200 hover:scale-105 active:scale-100"
                  title="Remove"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              )}
            </div>
          </div>
          
          {/* File info */}
          <div className="p-3 bg-gray-50 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-700 truncate" title={attachment.fileName}>
              {attachment.fileName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatFileSize(attachment.fileSize)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Non-image file preview (PDF, etc.)
  console.log("[AttachmentPreview] Rendering file preview");
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-200 max-w-sm group hover:border-gray-300 hover:shadow-sm transition-all duration-200">
      <div className="flex-shrink-0">
        {isPdf ? (
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
        ) : (
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate" title={attachment.fileName}>
          {attachment.fileName}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatFileSize(attachment.fileSize)}
        </p>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={handleView}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
          title="View file"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={handleDownload}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
          title="Download file"
        >
          <Download className="w-4 h-4" />
        </button>
        {showRemoveButton && (
          <button
            onClick={onRemove}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
} 