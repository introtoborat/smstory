"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import { getCsrfToken } from "@/lib/csrf-client";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null, publicId: string | null) => void;
  /** Optional existing publicId (used to track previous upload) */
  publicId?: string | null;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export function ImageUpload({ value, onChange, publicId: _publicId }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error("Only JPEG, PNG, WebP, and GIF images are allowed");
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error("Image must be smaller than 5 MB");
        return;
      }

      setUploading(true);
      try {
        const csrfToken = await getCsrfToken();
        const formData = new FormData();
        formData.append("file", file);

        const headers: Record<string, string> = {};
        if (csrfToken) headers["x-csrf-token"] = csrfToken;

        const res = await fetch("/api/upload", {
          method: "POST",
          headers,
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 504) {
            toast.error(data.error ?? "Upload timed out — please try a smaller image or try again");
          } else {
            toast.error(data.error ?? "Upload failed");
          }
          return;
        }

        const data = await res.json();
        onChange(data.url, data.publicId);
        toast.success("Image uploaded");
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  };

  const handleRemove = () => {
    onChange(null, null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      {value ? (
        /* Preview */
        <div className="relative w-full max-w-xs rounded-lg overflow-hidden border bg-muted group">
          <div className="relative aspect-[4/3]">
            <Image
              src={value}
              alt="Story cover"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 320px"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 h-7 w-7 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 w-full max-w-xs h-40 rounded-lg border-2 border-dashed cursor-pointer transition-colors
            ${dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50 hover:bg-muted/50"
            }`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
          ) : (
            <>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Click to upload</span> or drag &amp; drop
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WebP, GIF — max 5 MB</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      {!value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Choose Image"}
        </Button>
      )}
    </div>
  );
}
