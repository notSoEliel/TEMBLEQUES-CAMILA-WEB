import fs from "fs";

let content = fs.readFileSync("frontend/src/pages/Catalog.tsx", "utf-8");

// State
content = content.replace(
  'const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "");',
  'const [selectedCategories, setSelectedCategories] = useState<string[]>(searchParams.getAll("category") || []);'
);

// useEffect dependencies
content = content.replace(
  '}, [selectedCategory, startDate, endDate, selectedSizes]);',
  '}, [selectedCategories, startDate, endDate, selectedSizes]);'
);

// loadProducts params
content = content.replace(
  'if (selectedCategory) params.category = selectedCategory;',
  'if (selectedCategories.length > 0) params.category = selectedCategories;'
);

// handleCategoryFilter -> toggleCategory
content = content.replace(
  '  const handleCategoryFilter = (cat: string) => {\n    const newCat = selectedCategory === cat ? "" : cat;\n    setSelectedCategory(newCat);\n    const newParams = new URLSearchParams(searchParams);\n    if (newCat) newParams.set("category", newCat); else newParams.delete("category");\n    setSearchParams(newParams);\n  };',
  '  const toggleCategory = (cat: string) => {\n    const newCats = selectedCategories.includes(cat) \n      ? selectedCategories.filter(x => x !== cat) \n      : [...selectedCategories, cat];\n    setSelectedCategories(newCats);\n    const newParams = new URLSearchParams(searchParams);\n    newParams.delete("category");\n    newCats.forEach(c => newParams.append("category", c));\n    setSearchParams(newParams);\n  };'
);

// UI Buttons
content = content.replace(
  'variant={selectedCategory === key ? "default" : "outline"}\n                  onClick={() => handleCategoryFilter(key)}',
  'variant={selectedCategories.includes(key) ? "default" : "outline"}\n                  onClick={() => toggleCategory(key)}'
);

// Active filters container
content = content.replace(
  '{(selectedCategory || startDate || endDate || selectedSizes.length > 0) && (',
  '{(selectedCategories.length > 0 || startDate || endDate || selectedSizes.length > 0) && ('
);

// Active filters badges
content = content.replace(
  '{selectedCategory && (\n            <Badge variant="secondary" className="gap-1">\n              {CATEGORY_LABELS[selectedCategory]}\n              <button onClick={() => handleCategoryFilter("")}>\n                <X className="h-3 w-3" />\n              </button>\n            </Badge>\n          )}',
  '{selectedCategories.map(cat => (\n            <Badge key={cat} variant="secondary" className="gap-1">\n              {CATEGORY_LABELS[cat]}\n              <button onClick={() => toggleCategory(cat)}>\n                <X className="h-3 w-3" />\n              </button>\n            </Badge>\n          ))}'
);

fs.writeFileSync("frontend/src/pages/Catalog.tsx", content);
