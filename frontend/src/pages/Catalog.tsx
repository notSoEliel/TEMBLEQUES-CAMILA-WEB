import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { productsApi } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, SlidersHorizontal, X } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  pollera: "Polleras",
  vestuario_masculino: "Vestuario Masculino",
  infantil: "Infantil",
  tembleques: "Tembleques",
  accesorios: "Accesorios",
  paquete_completo: "Paquetes Completos",
};

export default function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory]);

  const loadProducts = async (searchTerm?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedCategory) params.category = selectedCategory;
      if (searchTerm || search) params.search = searchTerm ?? search;
      const data = await productsApi.list(params);
      setProducts(data.products);
    } catch (err) {
      console.error("Error loading products:", err);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts(search);
  };

  const handleCategoryFilter = (cat: string) => {
    const newCat = selectedCategory === cat ? "" : cat;
    setSelectedCategory(newCat);
    if (newCat) {
      setSearchParams({ category: newCat });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Catalogo
        </h1>
        <p className="text-muted-foreground">Explora nuestra coleccion de vestimenta tipica panamena.</p>
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
      {showFilters && (
        <div className="mb-6 p-4 border-2 border-border rounded-lg bg-card">
          <h3 className="font-bold mb-3">Categoria</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={selectedCategory === key ? "default" : "outline"}
                onClick={() => handleCategoryFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters */}
      {selectedCategory && (
        <div className="mb-6 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtro activo:</span>
          <Badge variant="secondary" className="gap-1">
            {CATEGORY_LABELS[selectedCategory]}
            <button onClick={() => handleCategoryFilter("")}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
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
          <p className="text-muted-foreground">Intenta con otros filtros o terminos de busqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <Link key={product._id} to={`/product/${product._id}`}>
              <Card className="group overflow-hidden transition-all duration-200 hover:-translate-y-1">
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={product.images?.[0] || "https://picsum.photos/seed/default/400/500"}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <CardContent className="p-4 space-y-2">
                  <Badge variant="outline" className="text-xs">
                    {CATEGORY_LABELS[product.category] || product.category}
                  </Badge>
                  <h3 className="font-bold line-clamp-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-lg font-bold text-primary">${product.rental_price}/dia</span>
                    {product.size && (
                      <span className="text-xs text-muted-foreground">Talla: {product.size}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
