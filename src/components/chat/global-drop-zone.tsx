"use client";

import { useCallback, useState, useEffect } from "react";
import { Upload } from "lucide-react";

interface GlobalDropZoneProps {
  onFilesDropped: (files: File[]) => void;
  isActive?: boolean;
  disabled?: boolean;
}

export function GlobalDropZone({ 
  onFilesDropped, 
  isActive = true, 
  disabled = false 
}: GlobalDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    console.log("[GlobalDropZone] Drag enter event, counter:", dragCounter + 1);
    setDragCounter(prev => prev + 1);
    
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      console.log("[GlobalDropZone] Files detected in drag, showing overlay");
      setIsDragging(true);
    }
  }, [dragCounter]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    const newCounter = dragCounter - 1;
    console.log("[GlobalDropZone] Drag leave event, counter:", newCounter);
    setDragCounter(newCounter);
    
    if (newCounter <= 0) {
      console.log("[GlobalDropZone] Hiding overlay");
      setIsDragging(false);
      setDragCounter(0);
    }
  }, [dragCounter]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    // Don't need to log this as it fires continuously
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    console.log("[GlobalDropZone] Drop event detected");
    setIsDragging(false);
    setDragCounter(0);
    
    if (disabled) {
      console.log("[GlobalDropZone] Drop zone disabled, ignoring drop");
      return;
    }
    
    if (e.dataTransfer?.files) {
      const files = Array.from(e.dataTransfer.files);
      console.log("[GlobalDropZone] Processing", files.length, "dropped files");
      onFilesDropped(files);
    }
  }, [onFilesDropped, disabled]);

  useEffect(() => {
    if (!isActive) {
      console.log("[GlobalDropZone] Drop zone deactivated");
      return;
    }

    console.log("[GlobalDropZone] Activating global drop zone");

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);

    return () => {
      console.log("[GlobalDropZone] Cleaning up global drop zone");
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('drop', handleDrop);
    };
  }, [isActive, handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  if (!isDragging || !isActive) return null;

  console.log("[GlobalDropZone] Rendering drop overlay");

  return (
    <div className="fixed inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
      <div className="bg-white rounded-2xl shadow-2xl p-12 text-center border-2 border-dashed border-blue-500">
        <Upload className="w-16 h-16 text-blue-500 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          {disabled ? "File upload disabled" : "Drop files here"}
        </h3>
        <p className="text-gray-600">
          {disabled 
            ? "Please try again later" 
            : "Images and PDFs supported (max 10MB each)"
          }
        </p>
      </div>
    </div>
  );
} 