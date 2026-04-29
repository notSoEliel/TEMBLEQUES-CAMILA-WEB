import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, Plus, X, Wrench } from "lucide-react";



export interface SizeVariant {
  size: string;
  stock: number;
  price_override?: number | null;
  in_maintenance: boolean;
}

interface SizeManagerProps {
  category: string;
  sizeGroups?: {label: string, sizes: string[]}[];
  basePrice: number;
  variants: SizeVariant[];
  onChange: (variants: SizeVariant[]) => void;
}

export default function SizeManager({ category, sizeGroups = [], basePrice, variants, onChange }: SizeManagerProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedSizes = new Set(variants.map((v) => v.size));

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleSize(size: string) {
    if (selectedSizes.has(size)) {
      onChange(variants.filter((v) => v.size !== size));
    } else {
      onChange([...variants, { size, stock: 1, price_override: null, in_maintenance: false }]);
    }
  }

  function addCustomSize() {
    const trimmed = customSize.trim();
    if (!trimmed || selectedSizes.has(trimmed)) return;
    onChange([...variants, { size: trimmed, stock: 1, price_override: null, in_maintenance: false }]);
    setCustomSize("");
  }

  function updateVariant(index: number, patch: Partial<SizeVariant>) {
    const updated = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    onChange(updated);
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-4">
      <Label className="text-sm font-bold">Tallas y Stock</Label>

      {/* ── Dropdown selector ── */}
      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between text-sm"
          onClick={() => setDropdownOpen(!dropdownOpen)}
        >
          <span className="flex items-center gap-2">
            <Plus className="h-3.5 w-3.5" />
            Añadir tallas
          </span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", dropdownOpen && "rotate-180")} />
        </Button>

        {dropdownOpen && (
          <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-2xl shadow-elegant-lg p-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="max-h-60 overflow-y-auto pr-1 space-y-3">
              {sizeGroups.length === 0 && (
                <p className="text-xs text-muted-foreground p-2">No hay grupos configurados. Añade manual.</p>
              )}
              {sizeGroups.map(group => (
                <div key={group.label} className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground px-1 uppercase tracking-wider">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.sizes.map((size) => {
                      const isSelected = selectedSizes.has(size);
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={() => toggleSize(size)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-muted/50 text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom size input */}
            <div className="flex gap-2 pt-1">
              <Input
                placeholder="Talla personalizada..."
                value={customSize}
                onChange={(e) => setCustomSize(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomSize();
                  }
                }}
                className="h-9 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addCustomSize}
                disabled={!customSize.trim()}
                className="shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Variant pills ── */}
      {variants.length === 0 ? (
        <p className="text-sm text-muted-foreground italic py-2">
          No se han añadido tallas. Haz clic en "Añadir tallas" para comenzar.
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant, idx) => (
            <div
              key={variant.size}
              className={cn(
                "flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                variant.in_maintenance
                  ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
                  : "border-border/60 bg-card"
              )}
            >
              {/* Size badge */}
              <Badge variant="outline" className="self-start font-bold text-sm px-3 py-1 shrink-0">
                {variant.size}
              </Badge>

              {/* Stock */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <label className="text-xs text-muted-foreground shrink-0 w-12">Stock</label>
                <Input
                  type="number"
                  min={0}
                  value={variant.stock}
                  onChange={(e) => updateVariant(idx, { stock: Number(e.target.value) })}
                  className="h-9 w-20 text-sm text-center"
                />
              </div>

              {/* Price override */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <label className="text-xs text-muted-foreground shrink-0 w-12">Precio</label>
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-bold">B/.</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={String(basePrice)}
                    value={variant.price_override ?? ""}
                    onChange={(e) =>
                      updateVariant(idx, {
                        price_override: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="h-9 pl-6 text-sm"
                  />
                </div>
              </div>

              {/* Maintenance toggle + delete */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => updateVariant(idx, { in_maintenance: !variant.in_maintenance })}
                  title={variant.in_maintenance ? "Quitar de mantenimiento" : "Poner en mantenimiento"}
                  className={cn(
                    "p-1.5 rounded-lg border transition-all duration-150",
                    variant.in_maintenance
                      ? "bg-amber-500 text-white border-amber-600"
                      : "bg-muted/50 text-muted-foreground border-border/60 hover:border-amber-300 hover:bg-amber-50"
                  )}
                >
                  <Wrench className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeVariant(idx)}
                  className="p-1.5 rounded-lg border border-border/60 bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-all duration-150"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {variants.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
          <span>
            {variants.length} talla{variants.length !== 1 ? "s" : ""} ·{" "}
            {variants.reduce((s, v) => s + v.stock, 0)} unidades totales
          </span>
          {variants.some((v) => v.in_maintenance) && (
            <span className="text-amber-600 font-medium">
              ⚠ {variants.filter((v) => v.in_maintenance).length} en mantenimiento
            </span>
          )}
        </div>
      )}
    </div>
  );
}
