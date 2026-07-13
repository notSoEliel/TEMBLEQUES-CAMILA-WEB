import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, AlertCircle } from "lucide-react";
import { mediaApi } from "@/services/api";
import {
  IMAGE_ACCEPT_ATTRIBUTE,
  validateProductImage,
} from "@/lib/media-validation";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  className?: string;
}

export default function ImageUpload({ onUpload, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  function setFilePreview(file: File) {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setPreview(objectUrl);
  }

  function clearFilePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreview(null);
  }

  async function upload(file: File) {
    const validationError = validateProductImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const res = await mediaApi.uploadImage(file);
      clearFilePreview();
      onUpload(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function selectFile(file: File) {
    const validationError = validateProductImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setFilePreview(file);
    void upload(file);
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file);
    }
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      selectFile(file);
    }
  }

  return (
    <div className={cn("w-full flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de imagen"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !uploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 w-full h-48",
          "border border-dashed border-zinc-300 bg-zinc-50",
          "rounded-[2rem] shadow-elegant cursor-pointer transition-all duration-300",
          "hover:bg-zinc-100 hover:border-zinc-400 focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 overflow-hidden outline-none",
          dragOver && "bg-zinc-100 border-zinc-400",
          uploading && "pointer-events-none opacity-80",
          error && "border-red-300 bg-red-50/50"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center z-10 bg-white/80 p-4 rounded-2xl backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground mt-2">Subiendo...</p>
          </div>
        ) : preview ? (
          <div className="absolute inset-0 w-full h-full">
            <img
              src={preview}
              alt="Vista previa"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-center bg-black/45 p-3">
              <span className="text-white text-sm font-semibold">Toca para cambiar</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center px-4">
            <ImagePlus className="h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm font-medium text-foreground">Selecciona o arrastra una imagen</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, WEBP (máx. 5 MB)</p>
          </div>
        )}
      </div>

      {error && (
        <div 
          id="file-upload-error"
          role="alert"
          className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-[2rem] shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />
    </div>
  );
}
