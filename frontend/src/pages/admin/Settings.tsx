import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { settingsApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Loader2, GripVertical, AlertTriangle } from "lucide-react";
import { useErrorModal } from "@/components/ErrorModal";
import { Pagination } from "@/components/ui/Pagination";
import { useSearchParams } from "react-router-dom";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
      setSizeGroups(settings.size_groups || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsApi.update({ categories, size_groups: sizeGroups }, token!);
      showError("Configuración guardada exitosamente.", "success");
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
    if (!confirm("¿Seguro que deseas eliminar esta categoría? Los productos existentes mantendrán el ID internamente pero no aparecerán en los filtros.")) return;
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
    if (!confirm("¿Seguro que deseas eliminar este grupo de tallas?")) return;
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorías */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categorías de Productos</CardTitle>
            <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-4 w-4 mr-2"/> Añadir</Button>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 p-3 rounded-lg flex gap-3 text-sm border-2 border-amber-200 dark:border-amber-900 mb-4">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>
                <strong>Precaución con el ID:</strong> Si cambias el ID, los productos existentes con el ID viejo no aparecerán en los filtros.
              </p>
            </div>
            
            <div className="space-y-3">
              {pagedCategories.map((cat) => {
                const globalIndex = categories.indexOf(cat);
                return (
                  <div key={globalIndex} className="flex items-start gap-3 p-3 bg-muted/50 border-2 border-border rounded-lg">
                    <GripVertical className="h-5 w-5 mt-2.5 text-muted-foreground cursor-move opacity-50" />
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
                          <Label className="text-xs">ID Interno</Label>
                          <Input 
                            value={cat.id} 
                            onChange={e => updateCategory(globalIndex, "id", e.target.value)} 
                            className="h-9 font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeCategory(globalIndex)} className="mt-6 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {categories.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay categorías.</p>}
          </CardContent>
          <div className="px-6 pb-4">
            <Pagination 
              currentPage={catPage}
              totalPages={catTotalPages}
              onPageChange={handleCatPageChange}
              limit={catLimit}
              onLimitChange={handleCatLimitChange}
              totalResults={categories.length}
              limitOptions={[5, 10, 20]}
            />
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
                  <div key={globalIndex} className="flex items-start gap-3 p-3 bg-muted/50 border-2 border-border rounded-lg">
                    <GripVertical className="h-5 w-5 mt-2.5 text-muted-foreground cursor-move opacity-50" />
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
                    <Button variant="ghost" size="icon" onClick={() => removeSizeGroup(globalIndex)} className="mt-6 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
            {sizeGroups.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay grupos.</p>}
          </CardContent>
          <div className="px-6 pb-4">
            <Pagination 
              currentPage={sgPage}
              totalPages={sgTotalPages}
              onPageChange={handleSgPageChange}
              limit={sgLimit}
              onLimitChange={handleSgLimitChange}
              totalResults={sizeGroups.length}
              limitOptions={[5, 10, 20]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
