import { useState, ChangeEvent } from "react";
import { UploadCloud, AlertCircle } from "lucide-react";

interface ImageUploaderProps {
  onUploadSuccess: (file: File) => void;
}

export function ImageUploader({ onUploadSuccess }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  const MAX_SIZE_MB = 5;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    // 1. Validación de tamaño en cliente
    if (file.size > MAX_SIZE_BYTES) {
      setError(`El archivo es demasiado pesado. Máximo permitido: ${MAX_SIZE_MB}MB.`);
      return;
    }

    // 2. Validación de tipo MIME en cliente
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Formato no soportado. Usa JPEG, PNG, WEBP o SVG.");
      return;
    }

    // Generar vista previa
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    
    // Propagar el archivo verificado hacia arriba para ser procesado/subido
    onUploadSuccess(file);
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-md">
      {/* Contenedor del Input */}
      <label 
        className="relative flex flex-col items-center justify-center w-full h-48 border border-dashed border-zinc-300 bg-zinc-50 rounded-[2rem] shadow-elegant cursor-pointer transition-all duration-300 hover:bg-zinc-100 hover:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-900 focus-within:ring-offset-2 overflow-hidden"
      >
        <input 
          type="file" 
          className="sr-only" 
          accept=".jpg,.jpeg,.png,.webp,.svg"
          onChange={handleFileChange}
          aria-invalid={!!error}
          aria-describedby={error ? "file-upload-error" : undefined}
        />
        
        {preview ? (
          <img 
            src={preview} 
            alt="Vista previa de imagen a subir" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-500">
            <UploadCloud className="w-8 h-8 text-zinc-600" aria-hidden="true" />
            <span className="text-sm font-medium">Seleccionar imagen</span>
            <span className="text-xs">JPEG, PNG, WEBP, SVG (máx. 5MB)</span>
          </div>
        )}
      </label>

      {/* Mensaje de Error Inline */}
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
    </div>
  );
}
