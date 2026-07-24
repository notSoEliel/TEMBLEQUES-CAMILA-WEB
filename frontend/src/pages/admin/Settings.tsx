import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { settingsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown, Info, Lock, Unlock } from "lucide-react";
import { useErrorModal } from "@/components/ErrorModal";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { useSearchParams, Link } from "react-router-dom";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface Category {
  id: string;
  label: string;
}

interface SizeGroup {
  label: string;
  sizes: string[];
}

export default function AdminSettings() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([]);
  const [lowStockThreshold, setLowStockThreshold] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalCategories, setOriginalCategories] = useState<Category[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Record<number, boolean>>({});
  const { errorModal, showError } = useErrorModal();

  // Categories Pagination
  const [catPage, setCatPage] = useState(Number(searchParams.get("cat_page")) || 1);
  const [catLimit, setCatLimit] = useState(Number(searchParams.get("cat_limit")) || 5);

  // Size Groups Pagination
  const [sgPage, setSgPage] = useState(Number(searchParams.get("sg_page")) || 1);
  const [sgLimit, setSgLimit] = useState(Number(searchParams.get("sg_limit")) || 5);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Ensure all pagination params are in URL
    const newParams = new URLSearchParams(searchParams);
    let changed = false;
    if (!searchParams.get("cat_page")) { newParams.set("cat_page", "1"); changed = true; }
    if (!searchParams.get("cat_limit")) { newParams.set("cat_limit", "5"); changed = true; }
    if (!searchParams.get("sg_page")) { newParams.set("sg_page", "1"); changed = true; }
    if (!searchParams.get("sg_limit")) { newParams.set("sg_limit", "5"); changed = true; }
    if (changed) setSearchParams(newParams, { replace: true });
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { settings } = await settingsApi.get();
      setCategories(settings.categories || []);
      setOriginalCategories(JSON.parse(JSON.stringify(settings.categories || [])));
      setSizeGroups(settings.size_groups || []);
      setLowStockThreshold(settings.low_stock_threshold ?? 1);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update({ categories, size_groups: sizeGroups, low_stock_threshold: lowStockThreshold }, token!);
      showError("Configuración guardada exitosamente.", "success");
      setOriginalCategories(JSON.parse(JSON.stringify(categories)));
      setUnlockedIds({});
    } catch (err: any) {
      console.error(err);
      showError(err.message || "Error al guardar la configuración.", "generic");
    }
    setSaving(false);
  };

  const addCategory = () => {
    setCategories([{ id: "", label: "" }, ...categories]);
    handleCatPageChange(1);
  };

  const removeCategory = (indexInCategories: number) => {
    setCategories(categories.filter((_, i) => i !== indexInCategories));
  };

  const updateCategory = (indexInCategories: number, field: keyof Category, value: string) => {
    const updated = [...categories];
    updated[indexInCategories][field] = value;
    if (field === "label" && !updated[indexInCategories].id) {
      updated[indexInCategories].id = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    }
    setCategories(updated);
  };

  const addSizeGroup = () => {
    setSizeGroups([{ label: "", sizes: [] }, ...sizeGroups]);
    handleSgPageChange(1);
  };

  const removeSizeGroup = (indexInGroups: number) => {
    setSizeGroups(sizeGroups.filter((_, i) => i !== indexInGroups));
  };

  const updateSizeGroupLabel = (indexInGroups: number, label: string) => {
    const updated = [...sizeGroups];
    updated[indexInGroups].label = label;
    setSizeGroups(updated);
  };

  const updateSizeGroupSizes = (indexInGroups: number, sizesString: string) => {
    const updated = [...sizeGroups];
    updated[indexInGroups].sizes = sizesString.split(",").map(s => s.trim()).filter(Boolean);
    setSizeGroups(updated);
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;
    const updated = [...categories];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setCategories(updated);
  };

  const moveSizeGroup = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sizeGroups.length) return;
    const updated = [...sizeGroups];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setSizeGroups(updated);
  };

  // Pagination Handlers
  const handleCatPageChange = (page: number) => {
    setCatPage(page);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("cat_page", String(page));
    setSearchParams(newParams);
  };

  const handleCatLimitChange = (limit: number) => {
    setCatLimit(limit);
    setCatPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("cat_limit", String(limit));
    newParams.set("cat_page", "1");
    setSearchParams(newParams);
  };

  const handleSgPageChange = (page: number) => {
    setSgPage(page);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sg_page", String(page));
    setSearchParams(newParams);
  };

  const handleSgLimitChange = (limit: number) => {
    setSgLimit(limit);
    setSgPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sg_limit", String(limit));
    newParams.set("sg_page", "1");
    setSearchParams(newParams);
  };

  // Client-side pagination logic
  const pagedCategories = categories.slice((catPage - 1) * catLimit, catPage * catLimit);
  const catTotalPages = Math.ceil(categories.length / catLimit);

  const pagedSizeGroups = sizeGroups.slice((sgPage - 1) * sgLimit, sgPage * sgLimit);
  const sgTotalPages = Math.ceil(sizeGroups.length / sgLimit);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {errorModal}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Filtros y Configuración</h1>
          <p className="text-muted-foreground mt-1">Gestiona las categorías y las opciones de tallas para el catálogo.</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar Cambios
        </Button>
      </div>

      {/* ID Management Global Alert */}
      <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-500 p-4 rounded-lg flex gap-3 text-sm border-2 border-blue-200 dark:border-blue-900">
        <Info className="h-5 w-5 shrink-0" />
        <div>
          <p className="font-bold">Gestión de IDs</p>
          <p>
            Los IDs vinculan productos a filtros. Ahora el sistema sincroniza los cambios automáticamente. {" "}
            <Link to="/admin/business-rules?section=catalog" className="underline font-bold hover:text-blue-700 transition-colors">
              Ver guía de mejores prácticas
            </Link>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Control de bajo stock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="low-stock-threshold">Umbral de alerta por talla</Label>
          <Input
            id="low-stock-threshold"
            type="number"
            min={0}
            max={1000}
            step={1}
            value={lowStockThreshold}
            onChange={(event) => setLowStockThreshold(Math.max(0, Number(event.target.value) || 0))}
            className="max-w-xs"
          />
          <p className="text-sm text-muted-foreground">Se notificará al equipo cuando una talla tenga este número o menos de unidades disponibles. Las tallas en mantenimiento quedan excluidas.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorías */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categorías de Productos</CardTitle>
            <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-4 w-4 mr-2"/> Añadir</Button>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-3">
              {pagedCategories.map((cat) => {
                const globalIndex = categories.indexOf(cat);
                return (
                  <div key={globalIndex} className="flex items-start gap-3 p-3 bg-muted/50 border-2 border-border rounded-lg group">
                    <div className="flex flex-col gap-1 mt-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 p-0 hover:bg-background"
                        onClick={() => moveCategory(globalIndex, 'up')}
                        disabled={globalIndex === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 p-0 hover:bg-background"
                        onClick={() => moveCategory(globalIndex, 'down')}
                        disabled={globalIndex === categories.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Nombre Público</Label>
                          <Input 
                            value={cat.label} 
                            onChange={e => updateCategory(globalIndex, "label", e.target.value)} 
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs flex items-center gap-1">
                            ID Interno 
                            {unlockedIds[globalIndex] ? <Unlock className="h-3 w-3 text-green-600" /> : <Lock className="h-3 w-3 text-muted-foreground" />}
                          </Label>
                          {unlockedIds[globalIndex] ? (
                            <Input 
                              value={cat.id} 
                              onChange={e => updateCategory(globalIndex, "id", e.target.value)} 
                              className="h-9 font-mono text-xs border-primary focus-visible:ring-primary"
                              autoFocus
                            />
                          ) : (
                            <ConfirmModal
                              title="Editar Identificador"
                              description="¿Quieres cambiar este ID? El sistema actualizará automáticamente todos los productos vinculados a este identificador al guardar."
                              confirmText="Permitir editar"
                              onConfirm={() => setUnlockedIds({ ...unlockedIds, [globalIndex]: true })}
                            >
                              <div className="relative group cursor-pointer">
                                <Input 
                                  value={cat.id} 
                                  readOnly
                                  className="h-9 font-mono text-xs bg-muted/50 cursor-pointer group-hover:border-primary transition-colors"
                                />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/20 backdrop-blur-[1px]">
                                  <span className="text-[10px] font-bold bg-white px-2 py-1 border border-black">CLIC PARA EDITAR</span>
                                </div>
                              </div>
                            </ConfirmModal>
                          )}
                        </div>
                      </div>
                    </div>
                    <ConfirmModal
                      title="Eliminar Categoría"
                      description="¿Seguro que deseas eliminar esta categoría? Los productos existentes mantendrán el ID internamente pero no aparecerán en los filtros."
                      confirmText="Eliminar"
                      variant="destructive"
                      onConfirm={() => removeCategory(globalIndex)}
                    >
                      <Button variant="ghost" size="icon" className="mt-6 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmModal>
                  </div>
                );
              })}
            </div>
            {categories.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay categorías.</p>}
          </CardContent>
          <div className="px-6 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 py-4 border-t border-border/40">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Ver:</span>
                  <select
                    value={catLimit}
                    onChange={(e) => handleCatLimitChange(Number(e.target.value))}
                    className="h-8 rounded-xl border-2 border-border/40 bg-background px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {[5, 10, 20].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <span>Total: <span className="font-bold text-foreground">{categories.length}</span></span>
              </div>

              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (catPage > 1) handleCatPageChange(catPage - 1); }}
                      className={cn("rounded-xl border-2 border-border/40 h-8 text-xs", catPage <= 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: catTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === catTotalPages || Math.abs(p - catPage) <= 1)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && p - arr[i-1] > 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            isActive={p === catPage}
                            onClick={(e) => { e.preventDefault(); handleCatPageChange(p); }}
                            className="rounded-xl border-2 border-border/40 font-bold h-8 w-8 text-xs"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    ))}

                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (catPage < catTotalPages) handleCatPageChange(catPage + 1); }}
                      className={cn("rounded-xl border-2 border-border/40 h-8 text-xs", catPage >= catTotalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </Card>

        {/* Grupos de Tallas */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Grupos de Tallas (Filtros)</CardTitle>
            <Button variant="outline" size="sm" onClick={addSizeGroup}><Plus className="h-4 w-4 mr-2"/> Añadir</Button>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <p className="text-sm text-muted-foreground">Configura cómo se agruparán las tallas en el catálogo.</p>
            <div className="space-y-3">
              {pagedSizeGroups.map((group) => {
                const globalIndex = sizeGroups.indexOf(group);
                return (
                  <div key={globalIndex} className="flex items-start gap-3 p-3 bg-muted/50 border-2 border-border rounded-lg group">
                    <div className="flex flex-col gap-1 mt-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 p-0 hover:bg-background"
                        onClick={() => moveSizeGroup(globalIndex, 'up')}
                        disabled={globalIndex === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 p-0 hover:bg-background"
                        onClick={() => moveSizeGroup(globalIndex, 'down')}
                        disabled={globalIndex === sizeGroups.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nombre del Grupo</Label>
                        <Input 
                          value={group.label} 
                          onChange={e => updateSizeGroupLabel(globalIndex, e.target.value)} 
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Tallas (por coma)</Label>
                        <Input 
                          value={group.sizes.join(", ")} 
                          onChange={e => updateSizeGroupSizes(globalIndex, e.target.value)} 
                          className="h-9"
                        />
                      </div>
                    </div>
                    <ConfirmModal
                      title="Eliminar Grupo de Tallas"
                      description="¿Seguro que deseas eliminar este grupo de tallas?"
                      confirmText="Eliminar"
                      variant="destructive"
                      onConfirm={() => removeSizeGroup(globalIndex)}
                    >
                      <Button variant="ghost" size="icon" className="mt-6 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ConfirmModal>
                  </div>
                );
              })}
            </div>
            {sizeGroups.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay grupos.</p>}
          </CardContent>
          <div className="px-6 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 py-4 border-t border-border/40">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Ver:</span>
                  <select
                    value={sgLimit}
                    onChange={(e) => handleSgLimitChange(Number(e.target.value))}
                    className="h-8 rounded-xl border-2 border-border/40 bg-background px-2 py-1 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {[5, 10, 20].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <span>Total: <span className="font-bold text-foreground">{sizeGroups.length}</span></span>
              </div>

              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (sgPage > 1) handleSgPageChange(sgPage - 1); }}
                      className={cn("rounded-xl border-2 border-border/40 h-8 text-xs", sgPage <= 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: sgTotalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === sgTotalPages || Math.abs(p - sgPage) <= 1)
                    .map((p, i, arr) => (
                      <React.Fragment key={p}>
                        {i > 0 && p - arr[i-1] > 1 && (
                          <PaginationItem>
                            <PaginationEllipsis />
                          </PaginationItem>
                        )}
                        <PaginationItem>
                          <PaginationLink
                            href="#"
                            isActive={p === sgPage}
                            onClick={(e) => { e.preventDefault(); handleSgPageChange(p); }}
                            className="rounded-xl border-2 border-border/40 font-bold h-8 w-8 text-xs"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    ))}

                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (sgPage < sgTotalPages) handleSgPageChange(sgPage + 1); }}
                      className={cn("rounded-xl border-2 border-border/40 h-8 text-xs", sgPage >= sgTotalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
