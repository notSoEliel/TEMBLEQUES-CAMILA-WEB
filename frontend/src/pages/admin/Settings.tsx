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
  const [categories, setCategories] = useState<Category[]>([]);
  const [sizeGroups, setSizeGroups] = useState<SizeGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { errorModal, showError } = useErrorModal();

  useEffect(() => {
    loadSettings();
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
    setCategories([...categories, { id: "", label: "" }]);
  };

  const removeCategory = (index: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta categoría? Los productos existentes mantendrán el ID internamente pero no aparecerán en los filtros.")) return;
    setCategories(categories.filter((_, i) => i !== index));
  };

  const updateCategory = (index: number, field: keyof Category, value: string) => {
    const updated = [...categories];
    updated[index][field] = value;
    if (field === "label" && !updated[index].id) {
      // Auto-generate ID from label if empty
      updated[index].id = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    }
    setCategories(updated);
  };

  const addSizeGroup = () => {
    setSizeGroups([...sizeGroups, { label: "", sizes: [] }]);
  };

  const removeSizeGroup = (index: number) => {
    if (!confirm("¿Seguro que deseas eliminar este grupo de tallas?")) return;
    setSizeGroups(sizeGroups.filter((_, i) => i !== index));
  };

  const updateSizeGroupLabel = (index: number, label: string) => {
    const updated = [...sizeGroups];
    updated[index].label = label;
    setSizeGroups(updated);
  };

  const updateSizeGroupSizes = (index: number, sizesString: string) => {
    const updated = [...sizeGroups];
    updated[index].sizes = sizesString.split(",").map(s => s.trim()).filter(Boolean);
    setSizeGroups(updated);
  };

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categorías de Productos</CardTitle>
            <Button variant="outline" size="sm" onClick={addCategory}><Plus className="h-4 w-4 mr-2"/> Añadir</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 p-3 rounded-lg flex gap-3 text-sm border-2 border-amber-200 dark:border-amber-900 mb-4">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p>
                <strong>Precaución con el ID Interno:</strong> Si cambias o eliminas el ID interno de una categoría existente, los productos que tenían esa categoría asignada seguirán teniéndola en la base de datos, pero ya no aparecerán filtrados correctamente en el catálogo. Intenta editar solo el <em>Nombre Público</em>.
              </p>
            </div>
            
            {categories.map((cat, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 border-2 border-border rounded-lg">
                <GripVertical className="h-5 w-5 mt-2.5 text-muted-foreground cursor-move opacity-50" />
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre Público (Label)</Label>
                      <Input 
                        value={cat.label} 
                        onChange={e => updateCategory(index, "label", e.target.value)} 
                        placeholder="Ej: Polleras"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">ID Interno</Label>
                      <Input 
                        value={cat.id} 
                        onChange={e => updateCategory(index, "id", e.target.value)} 
                        placeholder="ej: pollera"
                        className="h-9 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeCategory(index)} className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay categorías configuradas.</p>}
          </CardContent>
        </Card>

        {/* Grupos de Tallas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Grupos de Tallas (Filtros)</CardTitle>
            <Button variant="outline" size="sm" onClick={addSizeGroup}><Plus className="h-4 w-4 mr-2"/> Añadir</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Configura cómo se agruparán y ordenarán las tallas en el filtro del catálogo.</p>
            {sizeGroups.map((group, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 border-2 border-border rounded-lg">
                <GripVertical className="h-5 w-5 mt-2.5 text-muted-foreground cursor-move opacity-50" />
                <div className="flex-1 space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Nombre del Grupo</Label>
                    <Input 
                      value={group.label} 
                      onChange={e => updateSizeGroupLabel(index, e.target.value)} 
                      placeholder="Ej: Adultos"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tallas (Separadas por coma)</Label>
                    <Input 
                      value={group.sizes.join(", ")} 
                      onChange={e => updateSizeGroupSizes(index, e.target.value)} 
                      placeholder="Ej: S, M, L, XL"
                      className="h-9"
                    />
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeSizeGroup(index)} className="mt-6 text-destructive hover:text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {sizeGroups.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No hay grupos configurados.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
