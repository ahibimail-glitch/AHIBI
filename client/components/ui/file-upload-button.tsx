"use client";

import { forwardRef, useRef, ChangeEvent } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploadButtonProps {
  id?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  label?: string;
  uploadingLabel?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const FileUploadButton = forwardRef<HTMLInputElement, FileUploadButtonProps>(
  (
    {
      id,
      accept,
      multiple = false,
      disabled = false,
      uploading = false,
      label = "Choose File",
      uploadingLabel = "Uploading...",
      onChange,
      className,
      variant = "outline",
      size = "default",
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const setRefs = (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <>
        <input
          id={id}
          ref={setRefs}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={onChange}
          className="hidden"
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant={variant}
          size={size}
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={cn(className)}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadingLabel}
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {label}
            </>
          )}
        </Button>
      </>
    );
  }
);

FileUploadButton.displayName = "FileUploadButton";
