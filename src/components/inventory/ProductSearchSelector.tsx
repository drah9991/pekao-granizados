import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Check, ChevronsUpDown, Layers, Boxes, Tag, AlertCircle } from "lucide-react";
import type { Product } from "@/hooks/useInventory";
import { cn } from "@/lib/utils";

interface ProductSearchSelectorProps {
  products: Product[];
  stockMap: Map<string, number>;
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  className?: string;
}

type SearchParam = "all" | "name" | "category";

function normalizeInventoryUnit(unit?: string | null): string {
  if (!unit) return "und";
  const u = unit.trim().toLowerCase();
  if (u === "oz" || u === "onza" || u === "onzas" || u === "un" || u === "uni" || u === "unit" || u === "unidades") {
    return "und";
  }
  return unit;
}

export function ProductSearchSelector({
  products,
  stockMap,
  selectedProductId,
  onSelectProduct,
  className
}: ProductSearchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchParam, setSearchParam] = useState<SearchParam>("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      // Focus search input when opened
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Selected product object
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Extract unique categories from products
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      const cat = p.category || p.type;
      if (cat) cats.add(cat.trim().toUpperCase());
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filtered products based on search query, parameter, and category filter
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return products.filter((p) => {
      const pName = (p.name || "").toLowerCase();
      const pCategory = (p.category || p.type || "GENERAL").toLowerCase();
      const pUnit = (p.unit_measure || "").toLowerCase();

      // Category chip filter
      if (selectedCategoryFilter !== "ALL") {
        const itemCat = (p.category || p.type || "GENERAL").toUpperCase();
        if (itemCat !== selectedCategoryFilter) return false;
      }

      // Query filter by parameter
      if (!q) return true;

      if (searchParam === "name") {
        return pName.includes(q);
      }
      if (searchParam === "category") {
        return pCategory.includes(q);
      }
      // "all"
      return pName.includes(q) || pCategory.includes(q) || pUnit.includes(q);
    });
  }, [products, searchQuery, searchParam, selectedCategoryFilter]);

  const handleSelect = (productId: string) => {
    onSelectProduct(productId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectProduct("");
  };

  const selectedStock = selectedProduct ? (stockMap.get(selectedProduct.id) ?? 0) : 0;

  return (
    <div ref={containerRef} className={cn("relative w-full space-y-2", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={cn(
          "w-full h-11 bg-white/5 border border-white/10 rounded-xl px-3 flex items-center justify-between text-xs text-left transition-all hover:bg-white/[0.08] hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-primary/50",
          isOpen && "border-primary/50 bg-white/[0.08]"
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-black text-slate-100 uppercase truncate">
                {selectedProduct.name}
              </span>
              <span className="px-1.5 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30 text-[9px] font-black uppercase shrink-0">
                {selectedProduct.category || selectedProduct.type || "GENERAL"}
              </span>
              <span
                className={cn(
                  "px-1.5 py-0.5 rounded-md text-[9px] font-bold shrink-0 border",
                  selectedStock > 5
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                    : selectedStock > 0
                    ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                    : "bg-rose-500/15 text-rose-400 border-rose-500/20"
                )}
              >
                Stock: {selectedStock}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 font-medium">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Buscar o seleccionar producto...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {selectedProduct && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectProduct("");
                }
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronsUpDown className="w-4 h-4 text-slate-500" />
        </div>
      </button>

      {/* Selected Product Info Strip */}
      {selectedProduct && !isOpen && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-lg text-[10px] text-slate-400">
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-primary" />
            <span>Categoría:</span>
            <strong className="text-slate-200 font-bold uppercase">
              {selectedProduct.category || selectedProduct.type || "GENERAL"}
            </strong>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1">
            <Boxes className="w-3 h-3 text-emerald-400" />
            <span>Stock sede:</span>
            <strong
              className={cn(
                "font-black",
                selectedStock > 5
                  ? "text-emerald-400"
                  : selectedStock > 0
                  ? "text-amber-400"
                  : "text-rose-400"
              )}
            >
              {selectedStock} {normalizeInventoryUnit(selectedProduct.unit_measure)}
            </strong>
          </div>
          {selectedProduct.cost !== null && selectedProduct.cost !== undefined && selectedProduct.cost > 0 && (
            <>
              <span className="text-white/20">•</span>
              <div className="flex items-center gap-1">
                <span>Costo ref:</span>
                <strong className="text-slate-200 font-bold">
                  ${selectedProduct.cost.toLocaleString()}
                </strong>
              </div>
            </>
          )}
        </div>
      )}

      {/* Dropdown Floating Panel */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-full sm:w-[500px] z-50 bg-slate-950/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-xl p-3 space-y-3 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, categoría o unidad..."
              className="w-full h-10 pl-9 pr-8 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/60 focus:bg-white/[0.08] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Parameter Tabs */}
          <div className="flex items-center justify-between gap-2 pt-0.5 border-b border-white/5 pb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-primary" /> Parámetro:
            </span>
            <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/5 text-[10px]">
              <button
                type="button"
                onClick={() => setSearchParam("all")}
                className={cn(
                  "px-2 py-0.5 rounded-md font-bold uppercase transition-colors",
                  searchParam === "all"
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Todo
              </button>
              <button
                type="button"
                onClick={() => setSearchParam("name")}
                className={cn(
                  "px-2 py-0.5 rounded-md font-bold uppercase transition-colors",
                  searchParam === "name"
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Nombre
              </button>
              <button
                type="button"
                onClick={() => setSearchParam("category")}
                className={cn(
                  "px-2 py-0.5 rounded-md font-bold uppercase transition-colors",
                  searchParam === "category"
                    ? "bg-primary text-white"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                Categoría
              </button>
            </div>
          </div>

          {/* Category Chips Filters */}
          {uniqueCategories.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase whitespace-nowrap border transition-all",
                    selectedCategoryFilter === "ALL"
                      ? "bg-white/20 border-white/30 text-white"
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                  )}
                >
                  Todas ({products.length})
                </button>
                {uniqueCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-black uppercase whitespace-nowrap border transition-all",
                      selectedCategoryFilter === cat
                        ? "bg-primary/30 border-primary text-primary-foreground"
                        : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results List */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase px-1 pb-1">
              <span>Productos ({filteredProducts.length})</span>
              {selectedCategoryFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter("ALL")}
                  className="text-primary hover:underline text-[9px]"
                >
                  Ver todos
                </button>
              )}
            </div>

            <div className="max-h-56 sm:max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredProducts.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <AlertCircle className="w-6 h-6 mx-auto text-slate-600" />
                  <p className="text-xs font-semibold">No se encontraron productos coincidentes</p>
                  <p className="text-[10px] text-slate-600">
                    Intente buscar con otro término o cambie el filtro de categoría
                  </p>
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const stock = stockMap.get(prod.id) ?? 0;
                  const isSelected = prod.id === selectedProductId;
                  const categoryName = prod.category || prod.type || "GENERAL";

                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleSelect(prod.id)}
                      className={cn(
                        "p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none",
                        isSelected
                          ? "bg-primary/20 border-primary/50 text-white"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/[0.08] hover:border-white/20 text-slate-200"
                      )}
                    >
                      {/* Left: Name and Badges */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                          <span className="text-xs font-black uppercase tracking-wide truncate">
                            {prod.name}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                          <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-bold uppercase text-slate-400">
                            {categoryName}
                          </span>
                          <span className="text-slate-400 font-semibold uppercase">
                            {normalizeInventoryUnit(prod.unit_measure)}
                          </span>
                          {prod.cost !== null && prod.cost !== undefined && prod.cost > 0 && (
                            <span className="text-slate-400">
                              Costo: ${prod.cost.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Current Stock Pill */}
                      <div className="shrink-0 text-right">
                        <span
                          className={cn(
                            "inline-block px-2 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider",
                            stock > 5
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : stock > 0
                              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                              : "bg-rose-500/15 text-rose-400 border-rose-500/30"
                          )}
                        >
                          {stock > 0 ? `Stock: ${stock}` : "Sin stock"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
