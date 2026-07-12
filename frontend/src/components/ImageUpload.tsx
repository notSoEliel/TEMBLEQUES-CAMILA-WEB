import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { mediaApi } from "@/services/api";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

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

  function validate(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Formato no soportado. Usa JPEG, PNG, WEBP o SVG.";
    }
    if (file.size > MAX_BYTES) {
      return "El archivo es demasiado pesado. Máximo permitido: 5MB.";
    }
    return null;
  }

  async function upload(file: File) {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const res = await mediaApi.uploadImage(file);
      setPreview(null);
      onUpload(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      upload(file);
    }
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      upload(file);
    }
  }

  return (
    <div className={cn("w-full flex flex-col gap-3", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de imagen"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
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
            <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
               <span className="text-white text-sm font-semibold bg-black/50 px-3 py-1 rounded-full">Toca para cambiar</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center px-4">
            <ImagePlus className="h-8 w-8 text-zinc-600 mb-2" />
            <p className="text-sm font-medium text-foreground">Selecciona o arrastra una imagen</p>
            <p className="text-xs text-muted-foreground mt-0.5">JPEG, PNG, WEBP, SVG (máx. 5MB)</p>
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
        accept=".jpg,.jpeg,.png,.webp,.svg"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />
    </div>
  );
}
