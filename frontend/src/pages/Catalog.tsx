import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { productsApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { Pagination } from "@/components/ui/Pagination";

import { settingsApi } from "@/services/api";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PA", { style: "currency", currency: "USD" }).format(amount);
}

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.getAll("category") || []);
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [selectedSizes, setSelectedSizes] = useState<string[]>(searchParams.getAll("size") || []);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page")) || 1);
  const [currentLimit, setCurrentLimit] = useState(Number(searchParams.get("limit")) || 12);
  
  useEffect(() => {
    // Ensure page and limit are always in the URL
    if (!searchParams.get("page") || !searchParams.get("limit")) {
      const newParams = new URLSearchParams(searchParams);
      if (!searchParams.get("page")) newParams.set("page", "1");
      if (!searchParams.get("limit")) newParams.set("limit", "12");
      setSearchParams(newParams, { replace: true });
    }
  }, []);

  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [categories, setCategories] = useState<{id: string, label: string}[]>([]);
  const [sizeGroups, setSizeGroups] = useState<{label: string, sizes: string[]}[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { settings } = await settingsApi.get();
      setCategories(settings.categories || []);
      setSizeGroups(settings.size_groups || []);
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [selectedCategories, startDate, endDate, selectedSizes, searchParams]); // Depend on searchParams for real routes

  const loadProducts = async (searchTerm?: string) => {
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 12;
    
    // Update local state to match URL
    if (page !== currentPage) setCurrentPage(page);
    if (limit !== currentLimit) setCurrentLimit(limit);

    setLoading(true);
    try {
      const params: Record<string, any> = {
        page,
        limit
      };
      if (selectedCategories.length > 0) params.category = selectedCategories;
      if (searchTerm || search) params.search = searchTerm ?? search;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedSizes.length > 0) params.size = selectedSizes;
      
      const response = await productsApi.list(params);
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err) {
      console.error("Error loading products:", err);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    resetPage();
    loadProducts(search);
  };

  const resetPage = () => {
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", "1");
    setSearchParams(newParams);
  };

  const toggleCategory = (cat: string) => {
    const newCats = selectedCategories.includes(cat) 
      ? selectedCategories.filter(x => x !== cat) 
      : [...selectedCategories, cat];
    setSelectedCategories(newCats);
    
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    newCats.forEach(c => newParams.append("category", c));
    newParams.set("page", "1"); // Reset page
    setCurrentPage(1);
    setSearchParams(newParams);
  };

  const handleDateChange = (type: 'start' | 'end', val: string) => {
    if (type === 'start') setStartDate(val);
    else setEndDate(val);
    
    const newParams = new URLSearchParams(searchParams);
    if (val) newParams.set(type === 'start' ? 'startDate' : 'endDate', val);
    else newParams.delete(type === 'start' ? 'startDate' : 'endDate');
    newParams.set("page", "1"); // Reset page
    setCurrentPage(1);
    setSearchParams(newParams);
  };

  const toggleSize = (s: string) => {
    const newSizes = selectedSizes.includes(s) 
      ? selectedSizes.filter(x => x !== s) 
      : [...selectedSizes, s];
    setSelectedSizes(newSizes);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("size");
    newSizes.forEach(size => newParams.append("size", size));
    newParams.set("page", "1"); // Reset page
    setCurrentPage(1);
    setSearchParams(newParams);
  };

  const clearSizes = () => {
    setSelectedSizes([]);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("size");
    newParams.set("page", "1"); // Reset page
    setCurrentPage(1);
    setSearchParams(newParams);
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

  function getProductPriceInfo(product: any) {
    const variants = product.variants || [];
    if (variants.length === 0) return { min: product.rental_price, max: product.rental_price, hasRange: false };
    const prices = variants.map((v: any) => v.price_override ?? product.rental_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, hasRange: min !== max };
  }

  function getAvailableSizes(product: any): string[] {
    const variants = product.variants || [];
    return variants
      .filter((v: any) => !v.in_maintenance && v.stock > 0)
      .map((v: any) => v.size);
  }

  function isProductAvailable(product: any): boolean {
    const variants = product.variants || [];
    return variants.some((v: any) => !v.in_maintenance && v.stock > 0);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Catálogo
        </h1>
        <p className="text-muted-foreground">Explora nuestra colección de vestimenta típica panameña.</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">Buscar</Button>
        </form>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="sm:w-auto"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Category Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, overflow: "hidden", marginBottom: 0 }}
            animate={{ height: "auto", opacity: 1, transitionEnd: { overflow: "visible" }, marginBottom: "1.5rem" }}
            exit={{ height: 0, opacity: 0, overflow: "hidden", marginBottom: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="p-4 border-2 border-border rounded-lg bg-card space-y-4">
          <div>
            <h3 className="font-bold mb-3">Categoría</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategories.includes(cat.id) ? "default" : "outline"}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3">Fechas Disponibles</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full"
                />
                <span className="text-muted-foreground">a</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-3">Talla</h3>
              <div className="relative">
                <Button 
                  variant="outline" 
                  onClick={() => setIsSizeDropdownOpen(!isSizeDropdownOpen)}
                  className="w-full justify-between font-normal text-left"
                  type="button"
                >
                  <span className="truncate">
                    {selectedSizes.length > 0 
                      ? `${selectedSizes.length} talla${selectedSizes.length > 1 ? 's' : ''} seleccionada${selectedSizes.length > 1 ? 's' : ''}`
                      : "Seleccionar tallas"}
                  </span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isSizeDropdownOpen ? "rotate-180" : ""}`} />
                </Button>
                
                <div className={`absolute top-full left-0 right-0 z-10 mt-2 bg-card border-2 border-border rounded-lg shadow-elegant overflow-hidden transition-all duration-300 ease-in-out origin-top ${isSizeDropdownOpen ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none"}`}>
                  <div className="max-h-56 overflow-y-auto p-2 space-y-3">
                     {sizeGroups.map((group) => (
                       <div key={group.label}>
                          <h4 className="text-[10px] font-bold text-muted-foreground mb-1 px-2 uppercase tracking-wider">{group.label}</h4>
                          <div className="space-y-1">
                            {group.sizes.map(s => (
                              <label key={s} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded transition-colors">
                                <Checkbox 
                                  checked={selectedSizes.includes(s)} 
                                  onCheckedChange={() => toggleSize(s)} 
                                />
                                <span className="text-sm font-medium">{s}</span>
                              </label>
                            ))}
                          </div>
                       </div>
                     ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || startDate || endDate || selectedSizes.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtros activos:</span>
          {selectedCategories.map(catId => {
            const cat = categories.find(c => c.id === catId);
            return (
              <Badge key={catId} variant="secondary" className="gap-1">
                {cat ? cat.label : catId}
                <button onClick={() => toggleCategory(catId)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
          {(startDate || endDate) && (
            <Badge variant="secondary" className="gap-1">
              {startDate || "?"} - {endDate || "?"}
              <button onClick={() => { handleDateChange('start', ''); handleDateChange('end', ''); }}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {selectedSizes.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              Tallas: {selectedSizes.join(", ")}
              <button onClick={clearSizes}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <Separator className="mb-8" />

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-muted" />
              <CardContent className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl font-bold mb-2">No se encontraron productos</p>
          <p className="text-muted-foreground">Intenta con otros filtros o términos de búsqueda.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => {
              const { min, max, hasRange } = getProductPriceInfo(product);
              const sizes = getAvailableSizes(product);
              const available = isProductAvailable(product);

              return (
                <Link key={product._id} to={`/product/${product._id}`} className="h-full">
                  <Card className="group overflow-hidden transition-all duration-200 border border-border/60 shadow-elegant hover:translate-x-1  h-full flex flex-col">
                    <div className="aspect-[3/4] overflow-hidden bg-muted relative border-b-2 border-black">
                      <img
                        src={product.images?.[0] || "https://picsum.photos/seed/default/400/500"}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {!available && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive" className="text-sm font-bold border border-border/60">Agotado</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
                      <Badge variant="outline" className="text-[10px] w-fit border-black uppercase font-bold tracking-wider">
                        {categories.find(c => c.id === product.category)?.label || product.category}
                      </Badge>
                      <h3 className="font-bold text-lg leading-tight line-clamp-1 min-h-[1.5rem]">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] flex-1">
                        {product.description}
                      </p>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-auto">
                        <span className="text-lg font-black text-primary">
                          {hasRange
                            ? `${formatCurrency(min)} – ${formatCurrency(max)}`
                            : `${formatCurrency(min)}/día`
                          }
                        </span>
                      </div>
                      
                      {/* Size badges */}
                      {sizes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {sizes.slice(0, 5).map((size) => (
                            <span
                              key={size}
                              className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full font-bold"
                            >
                              {size}
                            </span>
                          ))}
                          {sizes.length > 5 && (
                            <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                              +{sizes.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
          
          {pagination && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
              limit={currentLimit}
              onLimitChange={handleLimitChange}
              totalResults={pagination.total}
              limitOptions={[4, 8, 12, 20]}
            />
          )}
        </>
      )}
    </div>
  );
}
