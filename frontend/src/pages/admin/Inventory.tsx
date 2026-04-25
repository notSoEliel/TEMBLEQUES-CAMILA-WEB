import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { productsApi, adminApi, settingsApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SizeManager, { type SizeVariant } from "@/components/SizeManager";
import ImageGalleryManager from "@/components/ImageGalleryManager";
import ProductPreview from "@/components/ProductPreview";
import { Plus, Pencil, Trash2, X, Loader2, Eye } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";

interface ProductForm {
  name: string;
  category: string;
  description: string;
  rental_price: number;
  variants: SizeVariant[];
  images: string[];
  deposit_settings: {
    required: boolean;
    overrideAmount?: number | "";
  };
}

const emptyForm: ProductForm = {
  name: "", category: "", description: "", rental_price: 0,
  variants: [], images: [],
  deposit_settings: { required: false, overrideAmount: "" },
};

export default function AdminInventory() {
  const { token } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ProductForm | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [categories, setCategories] = useState<{id: string, label: string}[]>([]);
  const [sizeGroups, setSizeGroups] = useState<{label: string, sizes: string[]}[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { 
    loadSettings();
    loadProducts(); 
  }, [currentPage]);

  const loadSettings = async () => {
    try {
      const { settings } = await settingsApi.get();
      setCategories(settings.categories || []);
      setSizeGroups(settings.size_groups || []);
      if (settings.categories?.length > 0) {
        emptyForm.category = settings.categories[0].id;
        setForm(f => f.category === "" ? { ...f, category: settings.categories[0].id } : f);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [form.description, showForm]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await productsApi.list({ page: currentPage, limit: 10 });
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: any) => {
    setForm({
      name: product.name,
      category: product.category,
      description: product.description,
      rental_price: product.rental_price,
      variants: (product.variants || []).map((v: any) => ({
        size: v.size,
        stock: v.stock,
        price_override: v.price_override ?? null,
        in_maintenance: v.in_maintenance ?? false,
      })),
      images: product.images || [],
      deposit_settings: {
        required: product.deposit_settings?.required ?? false,
        overrideAmount: product.deposit_settings?.overrideAmount ?? "",
      },
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
        variants: form.variants.map((v) => ({
          ...v,
          stock: Number(v.stock),
          price_override: v.price_override ? Number(v.price_override) : undefined,
        })),
        deposit_settings: {
          required: form.deposit_settings.required,
          overrideAmount: form.deposit_settings.overrideAmount ? Number(form.deposit_settings.overrideAmount) : undefined,
        },
      };

      if (editingId) {
        await adminApi.updateProduct(editingId, payload, token!);
      } else {
        await adminApi.createProduct(payload, token!);
        setCurrentPage(1); // Go to first page to see the new product
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

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPreviewFromForm = () => {
    setPreviewProduct({ ...form });
    setPreviewOpen(true);
  };

  const openPreviewFromProduct = (product: any) => {
    setPreviewProduct({
      name: product.name,
      category: product.category,
      description: product.description,
      rental_price: product.rental_price,
      variants: product.variants || [],
      images: product.images || [],
      deposit_settings: {
        required: product.deposit_settings?.required ?? false,
        overrideAmount: product.deposit_settings?.overrideAmount ?? "",
      },
    });
    setPreviewOpen(true);
  };

  const totalStock = (product: any) =>
    (product.variants || []).reduce((s: number, v: any) => s + (v.stock || 0), 0);

  const priceRange = (product: any) => {
    const vars = product.variants || [];
    if (vars.length === 0) return { min: product.rental_price, max: product.rental_price };
    const prices = vars.map((v: any) => v.price_override ?? product.rental_price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
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

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{editingId ? "Editar Producto" : "Nuevo Producto"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <select
                    className="flex h-11 w-full rounded-lg border-2 border-border bg-input px-4 py-2 text-sm"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <textarea
                  ref={textareaRef}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  rows={3}
                  className="flex w-full rounded-lg border-2 border-border bg-input px-4 py-3 text-sm min-h-[80px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors placeholder:text-muted-foreground"
                  placeholder="Describe el producto..."
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label>Precio base por día ($)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.rental_price}
                  onChange={(e) => setForm({ ...form, rental_price: Number(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Precio por defecto. Puedes ajustarlo por talla abajo.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border p-4 rounded-lg bg-muted/20">
                <div className="space-y-2">
                  <Label>Depósito Fijo</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="deposit-required"
                      checked={form.deposit_settings.required}
                      onChange={(e) => setForm({
                        ...form,
                        deposit_settings: { ...form.deposit_settings, required: e.target.checked }
                      })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="deposit-required" className="text-sm font-normal cursor-pointer">
                      Forzar cobro de depósito
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si no está marcado, usará la regla global (&gt;$350).
                  </p>
                </div>
                {form.deposit_settings.required && (
                  <div className="space-y-2">
                    <Label>Monto Override ($) (Opcional)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.deposit_settings.overrideAmount}
                      onChange={(e) => setForm({
                        ...form,
                        deposit_settings: { ...form.deposit_settings, overrideAmount: e.target.value ? Number(e.target.value) : "" }
                      })}
                      placeholder="Ej. 50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Si lo dejas vacío usará el porcentaje global de depósito.
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              <SizeManager
                category={form.category}
                sizeGroups={sizeGroups}
                basePrice={form.rental_price}
                variants={form.variants}
                onChange={(variants) => setForm({ ...form, variants })}
              />

              <Separator />

              <ImageGalleryManager
                images={form.images}
                onChange={(images) => setForm({ ...form, images })}
              />

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" disabled={saving} className="flex-1 sm:flex-none">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  {editingId ? "Guardar Cambios" : "Crear Producto"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openPreviewFromForm}
                  disabled={!form.name}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Vista Previa
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
        <>
          <div className="space-y-3">
            {products.map((product) => {
              const stock = totalStock(product);
              const range = priceRange(product);
              const sizeCount = (product.variants || []).length;
              return (
                <Card key={product._id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={product.images?.[0] || "https://picsum.photos/seed/default/100/100"}
                        alt=""
                        className="w-14 h-14 object-cover rounded-lg border-2 border-border"
                      />
                      <div>
                        <h3 className="font-bold">{product.name}</h3>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">{categories.find(c => c.id === product.category)?.label || product.category}</Badge>
                          <span className="text-sm text-primary font-bold">
                            {range.min === range.max
                              ? `$${range.min}/día`
                              : `$${range.min} – $${range.max}/día`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Stock: {stock} · {sizeCount} talla{sizeCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openPreviewFromProduct(product)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />Vista Previa
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(product._id)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {pagination && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}

      {/* Preview Modal */}
      {previewProduct && (
        <ProductPreview
          product={previewProduct}
          isOpen={previewOpen}
          onClose={() => { setPreviewOpen(false); setPreviewProduct(null); }}
        />
      )}
    </div>
  );
}
