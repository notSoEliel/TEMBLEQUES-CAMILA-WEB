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
import { Plus, Pencil, Trash2, X, Loader2, Eye, Calendar, Search } from "lucide-react";
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
import { useSearchParams } from "react-router-dom";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductForm {
  name: string;
  name_en?: string;
  category: string[];
  description: string;
  description_en?: string;
  rental_price: number;
  variants: SizeVariant[];
  images: string[];
  deposit_settings: {
    required: boolean;
    overrideAmount?: number | "";
  };
}

const emptyForm: ProductForm = {
  name: "", category: [], description: "", rental_price: 0,
  variants: [], images: [],
  deposit_settings: { required: false, overrideAmount: "" },
};

export default function AdminInventory() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductForm>({ ...emptyForm });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<ProductForm | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const [maintenanceProduct, setMaintenanceProduct] = useState<any>(null);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<any[]>([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(false);
  const [maintenanceSize, setMaintenanceSize] = useState("");
  const [maintenanceStart, setMaintenanceStart] = useState("");
  const [maintenanceEnd, setMaintenanceEnd] = useState("");
  const [maintenanceReason, setMaintenanceReason] = useState("");
  const [creatingMaintenance, setCreatingMaintenance] = useState(false);

  const openMaintenance = async (product: any) => {
    setMaintenanceProduct(product);
    setMaintenanceSize(product.variants?.[0]?.size || "");
    setMaintenanceStart("");
    setMaintenanceEnd("");
    setMaintenanceReason("");
    if (token) {
      try {
        setLoadingMaintenance(true);
        const res = await adminApi.listMaintenance(token);
        setMaintenanceBlocks(res.blocks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMaintenance(false);
      }
    }
  };

  const handleCreateMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !maintenanceProduct) return;
    try {
      setCreatingMaintenance(true);
      await adminApi.createMaintenance({
        productId: maintenanceProduct._id,
        selectedSize: maintenanceSize,
        startDate: maintenanceStart,
        endDate: maintenanceEnd,
        reason: maintenanceReason,
      }, token);
      
      setMaintenanceStart("");
      setMaintenanceEnd("");
      setMaintenanceReason("");
      
      const res = await adminApi.listMaintenance(token);
      setMaintenanceBlocks(res.blocks || []);
    } catch (err: any) {
      alert(err.message || "Error al programar mantenimiento");
    } finally {
      setCreatingMaintenance(false);
    }
  };

  const handleDeleteMaintenance = async (blockId: string) => {
    if (!token) return;
    if (!window.confirm("¿Seguro que deseas eliminar este bloqueo de mantenimiento?")) return;
    try {
      await adminApi.deleteMaintenance(blockId, token);
      const res = await adminApi.listMaintenance(token);
      setMaintenanceBlocks(res.blocks || []);
    } catch (err: any) {
      alert(err.message || "Error al eliminar mantenimiento");
    }
  };
  
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [currentLimit, setCurrentLimit] = useState(Number(searchParams.get("limit")) || 10);

  const [categories, setCategories] = useState<{id: string, label: string}[]>([]);
  const [sizeGroups, setSizeGroups] = useState<{label: string, sizes: string[]}[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Ensure page and limit are always in the URL
    if (!searchParams.get("page") || !searchParams.get("limit")) {
      const newParams = new URLSearchParams(searchParams);
      if (!searchParams.get("page")) newParams.set("page", "1");
      if (!searchParams.get("limit")) newParams.set("limit", "10");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  useEffect(() => { 
    loadSettings();
    loadProducts(); 
  }, [searchParams]);

  const loadSettings = async () => {
    try {
      const { settings } = await settingsApi.get();
      setCategories(settings.categories || []);
      setSizeGroups(settings.size_groups || []);
      if (settings.categories?.length > 0) {
        // No longer set a default category as it's an array
        setForm(f => f.category.length === 0 ? { ...f, category: [] } : f);
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
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 10;

    // Update local state to match URL
    if (page !== currentPage) setCurrentPage(page);
    if (limit !== currentLimit) setCurrentLimit(limit);

    setLoading(true);
    try {
      const response = await productsApi.list({ page, limit, search: searchParams.get("search") || undefined });
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    const normalizedSearch = search.trim();
    if (normalizedSearch) newParams.set("search", normalizedSearch);
    else newParams.delete("search");
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (product: any) => {
    setForm({
      name: product.name,
      category: Array.isArray(product.category) ? product.category : [product.category],
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
        handlePageChange(1); // Go to first page to see the new product
      }
      resetForm();
      loadProducts();
    } catch (err) { console.error(err); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteProduct(id, token!);
      loadProducts();
    } catch (err) { console.error(err); }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(page));
    setSearchParams(newParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimitChange = (limit: number) => {
    setCurrentLimit(limit);
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("limit", String(limit));
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const openPreviewFromForm = () => {
    setPreviewProduct({ ...form });
    setPreviewOpen(true);
  };

  const openPreviewFromProduct = (product: any) => {
    setPreviewProduct({
      name: product.name,
      category: Array.isArray(product.category) ? product.category : [product.category],
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
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2" role="search">
        <label htmlFor="admin-product-search" className="sr-only">Buscar productos</label>
        <Input id="admin-product-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre de producto" />
        <Button type="submit"><Search className="h-4 w-4 mr-2" />Buscar</Button>
      </form>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Producto" : "Nuevo Producto"}</DialogTitle>
            <DialogDescription>
              Completa la información del producto a continuación.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre (Español)</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre (Inglés - Opcional)</Label>
                    <Input value={form.name_en || ""} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Label>Categorías</Label>
                  <div className="grid grid-cols-2 gap-3 border-2 border-border p-4 rounded-xl bg-muted/20">
                    {categories.map((c) => (
                      <div key={c.id} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`cat-${c.id}`} 
                          checked={form.category.includes(c.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setForm({ ...form, category: [...form.category, c.id] });
                            } else {
                              setForm({ ...form, category: form.category.filter(id => id !== c.id) });
                            }
                          }}
                        />
                        <label
                          htmlFor={`cat-${c.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {c.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  {form.category.length === 0 && (
                    <p className="text-[10px] text-destructive font-bold uppercase">Selecciona al menos una categoría</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Descripción (Español)</Label>
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
                  <div className="space-y-2">
                    <Label>Descripción (Inglés - Opcional)</Label>
                    <textarea
                      value={form.description_en || ""}
                      onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                      rows={3}
                      className="flex w-full rounded-lg border-2 border-border bg-input px-4 py-3 text-sm min-h-[80px] resize-y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors placeholder:text-muted-foreground"
                      placeholder="Product details..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Precio base por día ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.rental_price}
                    onChange={(e) => setForm({ ...form, rental_price: Number(e.target.value) })}
                    required
                  />
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">
                    Precio por defecto. Puedes ajustarlo por talla abajo.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 border border-border p-4 rounded-lg bg-muted/20">
                  <div className="space-y-2">
                    <Label>Reserva Fija</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Checkbox
                        id="deposit-required"
                        checked={form.deposit_settings.required}
                        onCheckedChange={(checked) => setForm({
                          ...form,
                          deposit_settings: { ...form.deposit_settings, required: !!checked }
                        })}
                      />
                      <Label htmlFor="deposit-required" className="text-sm font-normal cursor-pointer">
                        Forzar cobro de reserva
                      </Label>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold mt-1">
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
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <SizeManager
              category={form.category[0] || ""}
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

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button
                type="button"
                variant="outline"
                onClick={openPreviewFromForm}
                disabled={!form.name || form.category.length === 0}
              >
                <Eye className="h-4 w-4 mr-2" />
                Vista Previa
              </Button>
              <Button type="submit" disabled={saving || form.category.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {editingId ? "Guardar Cambios" : "Crear Producto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {Array.isArray(product.category) ? product.category.map((catId: string) => (
                            <Badge key={catId} variant="outline" className="text-[10px] uppercase font-bold border-primary/20 bg-primary/5">
                              {categories.find(c => c.id === catId)?.label || catId}
                            </Badge>
                          )) : (
                            <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/20 bg-primary/5">
                              {categories.find(c => c.id === product.category)?.label || product.category}
                            </Badge>
                          )}
                          <span className="text-sm text-primary font-bold ml-1">
                            {range.min === range.max
                              ? `$${range.min}/día`
                              : `$${range.min} – $${range.max}/día`}
                          </span>
                        </div>
                          <span className="text-xs text-muted-foreground">
                            Stock: {stock} · {sizeCount} talla{sizeCount !== 1 ? "s" : ""}
                          </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openPreviewFromProduct(product)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />Vista Previa
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openMaintenance(product)}>
                        <Calendar className="h-3.5 w-3.5 mr-1" />Mantenimiento
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                      </Button>
                      <ConfirmModal
                        title="Eliminar Producto"
                        description="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
                        confirmText="Eliminar"
                        variant="destructive"
                        onConfirm={() => handleDelete(product._id)}
                      >
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-3.5 w-3.5 mr-1" />Eliminar
                        </Button>
                      </ConfirmModal>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {pagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-6 border-t border-border/40">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>Ver:</span>
                  <select
                    value={currentLimit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="h-9 rounded-xl border-2 border-border/40 bg-background px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {[5, 10, 20, 50].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <span>Total: <span className="font-bold text-foreground">{pagination.total}</span></span>
              </div>

              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(currentPage - 1); }}
                      className={cn("rounded-xl border-2 border-border/40", currentPage <= 1 && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === pagination.totalPages || Math.abs(p - currentPage) <= 1)
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
                            isActive={p === currentPage}
                            onClick={(e) => { e.preventDefault(); handlePageChange(p); }}
                            className="rounded-xl border-2 border-border/40 font-bold"
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      </React.Fragment>
                    ))}

                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (currentPage < pagination.totalPages) handlePageChange(currentPage + 1); }}
                      className={cn("rounded-xl border-2 border-border/40", currentPage >= pagination.totalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
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

      {/* Maintenance Dialog */}
      <Dialog open={!!maintenanceProduct} onOpenChange={(open) => !open && setMaintenanceProduct(null)}>
        <DialogContent className="max-w-xl rounded-[2rem] p-6 bg-background">
          <DialogHeader>
            <DialogTitle className="text-xl font-serif">Mantenimiento de Prendas</DialogTitle>
            <DialogDescription>
              Programa un rango de fechas para mantenimiento artesanal en {maintenanceProduct?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateMaintenance} className="space-y-4 my-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="maint-size" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Talla</Label>
                <select
                  id="maint-size"
                  value={maintenanceSize}
                  onChange={(e) => setMaintenanceSize(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-border/80 bg-background text-sm"
                  required
                >
                  {maintenanceProduct?.variants?.map((v: any) => (
                    <option key={v.size} value={v.size}>{v.size}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="maint-reason" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Razón</Label>
                <Input
                  id="maint-reason"
                  type="text"
                  placeholder="E.g. Costura de encajes"
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  className="rounded-xl border border-border/80 h-10 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="maint-start" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Fecha Inicio</Label>
                <Input
                  id="maint-start"
                  type="date"
                  value={maintenanceStart}
                  onChange={(e) => setMaintenanceStart(e.target.value)}
                  className="rounded-xl border border-border/80 h-10 text-sm"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="maint-end" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Fecha Fin</Label>
                <Input
                  id="maint-end"
                  type="date"
                  value={maintenanceEnd}
                  onChange={(e) => setMaintenanceEnd(e.target.value)}
                  className="rounded-xl border border-border/80 h-10 text-sm"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={creatingMaintenance}
              className="w-full rounded-[2rem] h-10 bg-primary font-semibold"
            >
              {creatingMaintenance ? <Loader2 className="h-4 w-4 animate-spin" /> : "Bloquear Fechas"}
            </Button>
          </form>

          <Separator />

          <div className="mt-4 space-y-3">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bloqueos Programados</h4>
            {loadingMaintenance ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 text-primary animate-spin" /></div>
            ) : maintenanceBlocks.filter(b => b.product_id?._id === maintenanceProduct?._id).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No hay bloqueos de mantenimiento activos para esta prenda.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                {maintenanceBlocks
                  .filter(b => b.product_id?._id === maintenanceProduct?._id)
                  .map((b) => (
                    <div key={b._id} className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl border border-border/40 text-xs">
                      <div>
                        <p className="font-semibold">Talla: {b.selected_size} {b.reason && `• ${b.reason}`}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(b.start_date).toLocaleDateString("es-PA")} al {new Date(b.end_date).toLocaleDateString("es-PA")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteMaintenance(b._id)}
                        className="text-destructive hover:bg-destructive/8 rounded-full h-8 w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
