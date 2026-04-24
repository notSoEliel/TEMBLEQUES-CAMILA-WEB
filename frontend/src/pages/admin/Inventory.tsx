import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { productsApi, adminApi } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import ImageUpload from "@/components/ImageUpload";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  pollera: "Polleras", vestuario_masculino: "Vestuario Masculino", infantil: "Infantil",
  tembleques: "Tembleques", accesorios: "Accesorios", paquete_completo: "Paquetes Completos",
};

const CATEGORIES = ["pollera", "vestuario_masculino", "infantil", "tembleques", "accesorios", "paquete_completo"];

export default function AdminInventory() {
  const { token } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "pollera", description: "", rental_price: 0,
    stock: 1, condition_status: "disponible", size: "", images: [] as string[],
  });

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsApi.list();
      setProducts(data.products);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ name: "", category: "pollera", description: "", rental_price: 0, stock: 1, condition_status: "disponible", size: "", images: [] });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: any) => {
    setForm({
      name: product.name, category: product.category, description: product.description,
      rental_price: product.rental_price, stock: product.stock, condition_status: product.condition_status,
      size: product.size || "", images: product.images || [],
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        rental_price: Number(form.rental_price),
        stock: Number(form.stock),
      };

      if (editingId) {
        await adminApi.updateProduct(editingId, payload, token!);
      } else {
        await adminApi.createProduct(payload, token!);
      }
      resetForm();
      loadProducts();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eliminar este producto?")) return;
    try {
      await adminApi.deleteProduct(id, token!);
      loadProducts();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Inventario</h1>
          <p className="text-muted-foreground mt-1">Gestiona tus productos.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <select className="flex h-11 w-full rounded-lg border-2 border-border bg-input px-4 py-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descripción</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Precio por Día ($)</Label>
                <Input type="number" min={0} value={form.rental_price} onChange={(e) => setForm({ ...form, rental_price: Number(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Stock</Label>
                <Input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} required />
              </div>
              <div className="space-y-2">
                <Label>Talla</Label>
                <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <select className="flex h-11 w-full rounded-lg border-2 border-border bg-input px-4 py-2 text-sm" value={form.condition_status} onChange={(e) => setForm({ ...form, condition_status: e.target.value })}>
                  <option value="disponible">Disponible</option>
                  <option value="mantenimiento">En Mantenimiento</option>
                  <option value="alquilado">Alquilado</option>
                </select>
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label>Imágenes</Label>
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.images.map((url: string, i: number) => (
                      <div key={i} className="relative">
                        <img
                          src={url}
                          alt=""
                          className="w-20 h-20 object-cover rounded-lg border-2 border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, images: form.images.filter((_: string, j: number) => j !== i) })}
                          className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <ImageUpload
                  onUpload={(url: string) => setForm((prev: typeof form) => ({ ...prev, images: [...prev.images, url] }))}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={saving} className="w-full sm:w-auto">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingId ? "Guardar Cambios" : "Crear Producto"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Product List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-4"><div className="h-12 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => (
            <Card key={product._id}>
              <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={product.images?.[0] || "https://picsum.photos/seed/default/100/100"} alt="" className="w-14 h-14 object-cover rounded-lg border-2 border-border" />
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[product.category]}</Badge>
                      <span className="text-sm text-primary font-bold">${product.rental_price}/día</span>
                      <span className="text-xs text-muted-foreground">Stock: {product.stock}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(product._id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
