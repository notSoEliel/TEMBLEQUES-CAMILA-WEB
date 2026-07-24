import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, productsApi } from "@/services/api";
import { 
  IProduct, 
  ICategoryConfig, 
  ISizeGroupConfig, 
  PaginationMetadata,
  ISizeVariant 
} from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, SlidersHorizontal, X, ChevronDown, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { settingsApi } from "@/services/api";
import { formatCurrency } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { getLocalizedCategoryLabel, getLocalizedText } from "@/lib/utils";
import { RequestState } from "@/components/ui/RequestState";

export default function Catalog() {
  const { t, language } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
  
  const [categories, setCategories] = useState<ICategoryConfig[]>([]);
  const [sizeGroups, setSizeGroups] = useState<ISizeGroupConfig[]>([]);

  const getCategoryLabel = (categoryId: string): string => {
    const category = categories.find((item) => item.id === categoryId);
    return getLocalizedCategoryLabel(categoryId, category, language);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await settingsApi.get();
      setCategories(response.settings.categories || []);
      setSizeGroups(response.settings.size_groups || []);
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
    setLoadError(null);
    try {
      const params: Record<string, string | string[] | number> = {
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
      setPagination(response.pagination || null);
    } catch (err: unknown) {
      setLoadError(err instanceof ApiError ? err.message : "No pudimos cargar el catálogo. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
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

  function getProductPriceInfo(product: IProduct) {
    const variants = product.variants || [];
    if (variants.length === 0) return { min: product.rental_price, max: product.rental_price, hasRange: false };
    const prices = variants.map((v: ISizeVariant) => v.price_override ?? product.rental_price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, hasRange: min !== max };
  }

  function getAvailableSizes(product: IProduct): string[] {
    const variants = product.variants || [];
    return variants
      .filter((v: ISizeVariant) => !v.in_maintenance && v.stock > 0)
      .map((v: ISizeVariant) => v.size);
  }

  function isProductAvailable(product: IProduct): boolean {
    const variants = product.variants || [];
    return variants.some((v: ISizeVariant) => !v.in_maintenance && v.stock > 0);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2 font-serif">
          {t("catalog.title")}
        </h1>
        <p className="text-muted-foreground">{t("catalog.subtitle")}</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("catalog.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="outline">{t("catalog.searchBtn")}</Button>
        </form>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="sm:w-auto"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          {t("catalog.filtersBtn")}
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
            <h3 className="font-bold mb-3">{t("catalog.categoryTitle")}</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  variant={selectedCategories.includes(cat.id) ? "default" : "outline"}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {getLocalizedCategoryLabel(cat.id, cat, language)}
                </Button>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold mb-3">{t("catalog.datesTitle")}</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleDateChange('start', e.target.value)}
                  className="w-full"
                />
                <span className="text-muted-foreground">{t("catalog.to")}</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleDateChange('end', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>
            
            <div>
              <h3 className="font-bold mb-3">{t("catalog.sizeTitle")}</h3>
              <Popover open={isSizeDropdownOpen} onOpenChange={setIsSizeDropdownOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={isSizeDropdownOpen}
                    className="w-full justify-between font-bold border-2 border-border/60 hover:border-primary/40 transition-all rounded-2xl h-11"
                  >
                    <span className="truncate">
                      {selectedSizes.length > 0
                        ? `${selectedSizes.length} ${selectedSizes.length > 1 ? t("catalog.sizesSelectedPlural") : t("catalog.sizesSelectedSingular")}`
                        : t("catalog.selectSizes")}
                    </span>
                    <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 transition-transform duration-200", isSizeDropdownOpen && "rotate-180")} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-2 border-border shadow-elegant-lg rounded-2xl overflow-hidden" align="start">
                  <Command className="rounded-none">
                    <CommandInput placeholder={t("catalog.searchSizePlaceholder")} className="h-10 border-none focus:ring-0" />
                    <CommandList className="max-h-60">
                      <CommandEmpty>{t("catalog.noSizesFound")}</CommandEmpty>
                      {sizeGroups.map((group) => (
                        <CommandGroup key={group.label} heading={group.label} className="px-2">
                          {group.sizes.map((s) => (
                            <CommandItem
                              key={s}
                              onSelect={() => toggleSize(s)}
                              className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-xl hover:bg-primary/5 transition-colors"
                            >
                              <div className={cn(
                                "flex h-4 w-4 items-center justify-center rounded border border-primary transition-all",
                                selectedSizes.includes(s) ? "bg-primary text-primary-foreground" : "bg-transparent"
                              )}>
                                {selectedSizes.includes(s) && <Check className="h-3 w-3" />}
                              </div>
                              <span className="font-medium">{s}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>

      {/* Active Filters */}
      {(selectedCategories.length > 0 || startDate || endDate || selectedSizes.length > 0) && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("catalog.activeFilters")}</span>
          {selectedCategories.map(catId => {
            const cat = categories.find(c => c.id === catId);
            return (
              <Badge key={catId} variant="secondary" className="gap-1">
                {getLocalizedCategoryLabel(catId, cat, language)}
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
              {t("catalog.sizesLabel")} {selectedSizes.join(", ")}
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
      ) : loadError ? (
        <RequestState
          title={t("catalog.errorTitle")}
          message={loadError}
          retryLabel={t("common.retry")}
          onRetry={() => void loadProducts()}
          busy={loading}
        />
      ) : products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl font-bold mb-2">{t("catalog.noProductsFound")}</p>
          <p className="text-muted-foreground">{t("catalog.noProductsDesc")}</p>
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
                    <div className="aspect-[3/4] overflow-hidden bg-muted relative">
                      <img
                        src={product.images?.[0] || "https://picsum.photos/seed/default/400/500"}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {!available && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Badge variant="destructive" className="text-sm font-bold border border-border/60">{t("catalog.outOfStock")}</Badge>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2 flex-1 flex flex-col">
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {Array.isArray(product.category) ? product.category.map(catId => (
                            <Badge key={catId} variant="outline" className="text-[10px] uppercase font-bold border-primary/20 bg-primary/5">
                              {getCategoryLabel(catId)}
                            </Badge>
                          )) : (
                            <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/20 bg-primary/5">
                              {getCategoryLabel(product.category)}
                            </Badge>
                          )}
                        </div>
                      <h3 className="font-bold text-lg leading-tight line-clamp-1 min-h-[1.5rem]">{getLocalizedText(product.name, product.name_en, language)}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem] flex-1">
                        {getLocalizedText(product.description, product.description_en, language)}
                      </p>
                      
                      <div className="flex items-center justify-between pt-2 border-t border-black/10 mt-auto">
                        <span className="text-lg font-black text-primary">
                          {hasRange
                            ? `${formatCurrency(min)} – ${formatCurrency(max)}`
                            : `${formatCurrency(min)}${t("catalog.perDay")}`
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
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-6 border-t border-border/60">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{t("catalog.viewLimit")}</span>
                  <select
                    value={currentLimit}
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="h-9 rounded-xl border-2 border-border/60 bg-background px-3 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  >
                    {[4, 8, 12, 20].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <span>{t("catalog.totalCount")} <span className="font-bold text-foreground">{pagination.total}</span></span>
              </div>

              <Pagination className="w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(currentPage - 1); }}
                      className={cn("rounded-xl border-2 border-border/60", currentPage <= 1 && "pointer-events-none opacity-50")}
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
                            className="rounded-xl border-2 border-border/60 font-bold"
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
                      className={cn("rounded-xl border-2 border-border/60", currentPage >= pagination.totalPages && "pointer-events-none opacity-50")}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
