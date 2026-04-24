import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, CheckCircle } from "lucide-react";

const CLOUDINARY_ENDPOINT =
  "https://api.cloudinary.com/v1_1/dfshkpehf/image/upload";
const UPLOAD_PRESET = "TemblequesCamila";
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];

function applyWebpTransform(secureUrl: string): string {
  return secureUrl.replace("/upload/", "/upload/f_auto,q_auto/");
}

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
      return "Solo se permiten archivos JPG o PNG.";
    }
    if (file.size > MAX_BYTES) {
      return "El archivo supera el limite de 8 MB.";
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
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(CLOUDINARY_ENDPOINT, { method: "POST", body: form });

      if (!res.ok) {
        throw new Error(`Error ${res.status} al subir la imagen.`);
      }

      const data = await res.json();
      const finalUrl = applyWebpTransform(data.secure_url as string);

      setPreview(null);
      onUpload(finalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div className={cn("w-full", className)}>
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
          "relative flex flex-col items-center justify-center gap-3",
          "w-full min-h-40 rounded-lg border-2 border-dashed border-border",
          "bg-muted/40 transition-colors duration-150",
          "cursor-pointer select-none outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring",
          dragOver && "bg-muted border-primary",
          uploading && "pointer-events-none opacity-70",
          preview && "border-solid border-border/60",
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Subiendo...</p>
          </>
        ) : preview ? (
          <div className="flex flex-col items-center gap-2 p-3 w-full">
            <img
              src={preview}
              alt="Vista previa"
              className="h-28 w-full object-cover rounded-md border border-border"
            />
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary shrink-0" />
              <span>Imagen subida. Toca para cambiar.</span>
            </div>
          </div>
        ) : (
          <>
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
            <div className="text-center px-4">
              <p className="text-sm font-medium text-foreground">Selecciona o arrastra una imagen</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG — maximo 8 MB</p>
            </div>
            <Button type="button" size="sm" variant="outline" tabIndex={-1}>
              Elegir archivo
            </Button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-destructive font-medium">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden
      />
    </div>
  );
}
