import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Label } from "@/components/ui/label";
import ImageUpload from "@/components/ImageUpload";
import { cn } from "@/lib/utils";
import { X, GripVertical, Star } from "lucide-react";

// ─── Sortable Image Item ──────────────────────────────────────────────────────
function SortableImage({
  url,
  index,
  onRemove,
}: {
  url: string;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isFirst = index === 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group rounded-lg border-2 overflow-hidden aspect-square transition-all duration-200",
        isDragging && "opacity-50 scale-95 z-50",
        isFirst
          ? "border-primary ring-2 ring-primary/20"
          : "border-border"
      )}
    >
      <img
        src={url}
        alt={`Imagen ${index + 1}`}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {/* Principal badge */}
      {isFirst && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
          <Star className="h-3 w-3 fill-current" />
          Principal
        </div>
      )}

      {/* Drag handle */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1.5 right-8 p-1 rounded-md bg-black/50 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1.5 right-1.5 p-1 rounded-md bg-destructive text-destructive-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        aria-label="Eliminar imagen"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Index badge */}
      {!isFirst && (
        <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          {index + 1}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface ImageGalleryManagerProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export default function ImageGalleryManager({ images, onChange }: ImageGalleryManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.indexOf(active.id as string);
    const newIndex = images.indexOf(over.id as string);
    onChange(arrayMove(images, oldIndex, newIndex));
  }

  function handleRemove(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function handleUpload(url: string) {
    onChange([...images, url]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-bold">Imágenes del Producto</Label>
        {images.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {images.length} imagen{images.length !== 1 ? "es" : ""} · Arrastra para reordenar
          </span>
        )}
      </div>

      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((url, index) => (
                <SortableImage
                  key={url}
                  url={url}
                  index={index}
                  onRemove={() => handleRemove(index)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Upload zone */}
      <ImageUpload onUpload={handleUpload} />

      {images.length > 1 && (
        <p className="text-xs text-muted-foreground">
          💡 La primera imagen será la imagen principal que se muestra en el catálogo.
        </p>
      )}
    </div>
  );
}
