import fs from "fs";

let content = fs.readFileSync("frontend/src/pages/Catalog.tsx", "utf-8");

// Imports
content = content.replace(
  'import { Search, SlidersHorizontal, X } from "lucide-react";',
  'import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react";\nimport { Checkbox } from "@/components/ui/checkbox";'
);

// State
content = content.replace(
  'const [size, setSize] = useState(searchParams.get("size") || "");\n  const [showFilters, setShowFilters] = useState(false);',
  'const [selectedSizes, setSelectedSizes] = useState<string[]>(searchParams.getAll("size") || []);\n  const [availableSizes, setAvailableSizes] = useState<string[]>([]);\n  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);\n  const [showFilters, setShowFilters] = useState(false);\n\n  useEffect(() => {\n    const fetchSizes = async () => {\n      try {\n        const params: Record<string, string> = {};\n        if (selectedCategory) params.category = selectedCategory;\n        const data = await productsApi.list(params);\n        const sizes = new Set<string>();\n        data.products.forEach(p => {\n          p.variants?.forEach((v: any) => {\n            if (!v.in_maintenance && v.stock > 0) sizes.add(v.size);\n          });\n        });\n        setAvailableSizes(Array.from(sizes).sort());\n      } catch (err) {\n        console.error("Error fetching sizes:", err);\n      }\n    };\n    fetchSizes();\n  }, [selectedCategory]);'
);

// useEffect
content = content.replace(
  '}, [selectedCategory, startDate, endDate, size]);',
  '}, [selectedCategory, startDate, endDate, selectedSizes]);'
);

// loadProducts
content = content.replace(
  'const params: Record<string, string> = {};\n      if (selectedCategory) params.category = selectedCategory;\n      if (searchTerm || search) params.search = searchTerm ?? search;\n      if (startDate) params.startDate = startDate;\n      if (endDate) params.endDate = endDate;\n      if (size) params.size = size;',
  'const params: Record<string, string | string[]> = {};\n      if (selectedCategory) params.category = selectedCategory;\n      if (searchTerm || search) params.search = searchTerm ?? search;\n      if (startDate) params.startDate = startDate;\n      if (endDate) params.endDate = endDate;\n      if (selectedSizes.length > 0) params.size = selectedSizes;'
);

// handleSizeFilter -> toggleSize
content = content.replace(
  '  const handleSizeFilter = (s: string) => {\n    setSize(s);\n    const newParams = new URLSearchParams(searchParams);\n    if (s) newParams.set("size", s); else newParams.delete("size");\n    setSearchParams(newParams);\n  };',
  '  const toggleSize = (s: string) => {\n    const newSizes = selectedSizes.includes(s) \n      ? selectedSizes.filter(x => x !== s) \n      : [...selectedSizes, s];\n    setSelectedSizes(newSizes);\n    const newParams = new URLSearchParams(searchParams);\n    newParams.delete("size");\n    newSizes.forEach(size => newParams.append("size", size));\n    setSearchParams(newParams);\n  };\n\n  const clearSizes = () => {\n    setSelectedSizes([]);\n    const newParams = new URLSearchParams(searchParams);\n    newParams.delete("size");\n    setSearchParams(newParams);\n  };'
);

// Filters panel animation
content = content.replace(
  '{showFilters && (\n        <div className="mb-6 p-4 border-2 border-border rounded-lg bg-card space-y-4">',
  '<div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? "max-h-[1000px] opacity-100 mb-6" : "max-h-0 opacity-0 mb-0"}`}>\n        <div className="p-4 border-2 border-border rounded-lg bg-card space-y-4">'
);
content = content.replace(
  '            <div>\n              <h3 className="font-bold mb-3">Talla</h3>\n              <Input\n                placeholder="Ej. S, M, L, XL, Única"\n                value={size}\n                onChange={(e) => handleSizeFilter(e.target.value)}\n              />\n            </div>\n          </div>\n        </div>\n      )}',
  `            <div>
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
                      ? \`\${selectedSizes.length} talla\${selectedSizes.length > 1 ? 's' : ''} seleccionada\${selectedSizes.length > 1 ? 's' : ''}\`
                      : "Seleccionar tallas"}
                  </span>
                  <ChevronDown className={\`h-4 w-4 shrink-0 transition-transform duration-200 \${isSizeDropdownOpen ? "rotate-180" : ""}\`} />
                </Button>
                
                <div className={\`absolute top-full left-0 right-0 z-10 mt-2 bg-card border-2 border-border rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-300 ease-in-out origin-top \${isSizeDropdownOpen ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none"}\`}>
                  <div className="max-h-48 overflow-y-auto p-2 space-y-1">
                     {availableSizes.length === 0 ? (
                       <p className="text-sm text-muted-foreground p-2">Cargando tallas...</p>
                     ) : (
                       availableSizes.map(s => (
                         <label key={s} className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded transition-colors">
                           <Checkbox 
                             checked={selectedSizes.includes(s)} 
                             onCheckedChange={() => toggleSize(s)} 
                           />
                           <span className="text-sm">{s}</span>
                         </label>
                       ))
                     )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`
);

// Active filters
content = content.replace(
  '{(selectedCategory || startDate || endDate || size) && (',
  '{(selectedCategory || startDate || endDate || selectedSizes.length > 0) && ('
);
content = content.replace(
  '{size && (\n            <Badge variant="secondary" className="gap-1">\n              Talla: {size}\n              <button onClick={() => handleSizeFilter("")}>\n                <X className="h-3 w-3" />\n              </button>\n            </Badge>\n          )}',
  '{selectedSizes.length > 0 && (\n            <Badge variant="secondary" className="gap-1">\n              Tallas: {selectedSizes.join(", ")}\n              <button onClick={clearSizes}>\n                <X className="h-3 w-3" />\n              </button>\n            </Badge>\n          )}'
);

fs.writeFileSync("frontend/src/pages/Catalog.tsx", content);
