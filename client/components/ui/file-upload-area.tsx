"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon, Video, File, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadAreaProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload: (files: File[]) => Promise<void>;
  uploading?: boolean;
  existingFiles?: Array<{ url: string; name?: string; caption?: string }>;
  onRemove?: (index: number) => void;
  type?: "image" | "video" | "document";
}

export function FileUploadArea({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  onUpload,
  uploading = false,
  existingFiles = [],
  onRemove,
  type = "image"
}: FileUploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    
    // Validate file sizes
    const oversizedFiles = fileArray.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      alert(`Some files are too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(0)}MB`);
      return;
    }

    // Create previews for images
    if (type === "image") {
      const previews = await Promise.all(
        fileArray.map(file => {
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
        })
      );
      setPreviewUrls(previews);
    }

    await onUpload(fileArray);
    
    // Clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [maxSize, onUpload, type]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const getIcon = () => {
    if (type === "video") return <Video className="h-8 w-8 text-gray-400" />;
    if (type === "document") return <File className="h-8 w-8 text-gray-400" />;
    return <ImageIcon className="h-8 w-8 text-gray-400" />;
  };

  const getAcceptText = () => {
    if (type === "video") return "MP4, WebM, MOV up to 100MB";
    if (type === "document") return "PDF up to 10MB";
    return "PNG, JPG, GIF, WebP up to 10MB";
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400",
          uploading && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
        <div className="text-center">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 mx-auto text-gray-400 mb-2 animate-spin" />
              <p className="text-sm text-gray-600">Uploading...</p>
            </>
          ) : (
            <>
              {getIcon()}
              <p className="text-sm text-gray-600 mt-2">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-400 mt-1">{getAcceptText()}</p>
              {multiple && <p className="text-xs text-gray-400 mt-1">You can select multiple files</p>}
            </>
          )}
        </div>
      </div>

      {/* Existing Files Preview */}
      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Uploaded Files ({existingFiles.length})
          </p>
          <div className={cn(
            "grid gap-4",
            type === "image" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1"
          )}>
            {existingFiles.map((file, index) => (
              <div
                key={index}
                className={cn(
                  "relative group rounded-lg overflow-hidden border",
                  type === "image" ? "aspect-square" : "p-4"
                )}
              >
                {type === "image" ? (
                  <img
                    src={file.url}
                    alt={file.name || `File ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : type === "video" ? (
                  <video
                    src={file.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <File className="h-8 w-8 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {file.name || `Document ${index + 1}`}
                      </p>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View Document
                      </a>
                    </div>
                  </div>
                )}
                {onRemove && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(index);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview URLs (for newly selected files before upload) */}
      {previewUrls.length > 0 && type === "image" && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">Selected Files</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewUrls.map((url, index) => (
              <div key={index} className="aspect-square rounded-lg overflow-hidden border relative">
                <img
                  src={url}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

