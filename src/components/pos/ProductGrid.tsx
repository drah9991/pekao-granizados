import { Product } from "@/lib/pos-types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { products as staticProducts } from "@/lib/pos-data";
import { useState } from "react";
import { formatCurrency } from "@/lib/formatters"; // Import the formatter

interface ProductGridProps {
  onProductSelect: (product: Product) => void;
}

export default function ProductGrid({ onProductSelect }: ProductGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = staticProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 p-4 md:p-6 overflow-auto">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-hero bg-clip-text text-transparent">
          Punto de Venta
        </h1>
        <Input 
          placeholder="🔍 Buscar productos..." 
          className="max-w-md text-base border-2"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onProductSelect(product)}
            className="group relative h-32 md:h-40 rounded-2xl border-2 border-border overflow-hidden transition-smooth hover:shadow-elevated hover:-translate-y-1 hover:border-primary"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-80`} />
            <div className="relative h-full p-4 flex flex-col items-start justify-between text-white">
              <div className="w-full flex items-start justify-between">
                <Badge variant="secondary" className="text-xs font-semibold bg-white/90 text-foreground hover:bg-white">
                  {product.category}
                </Badge>
                <div className="text-3xl md:text-4xl">{product.emoji}</div>
              </div>
              <div className="w-full">
                <p className="font-bold text-left text-sm md:text-base mb-1">{product.name}</p>
                <p className="font-bold text-left text-xl md:text-2xl">{formatCurrency(product.price)}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}