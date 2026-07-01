import { useState } from "react";
import { useDigitalMenu } from "@/hooks/useDigitalMenu";
import { useAuth } from "@/context/AuthContext";
import { OasisMenuHeader } from "@/components/menu/OasisMenuHeader";
import { OasisMenuCategory } from "@/components/menu/OasisMenuCategory";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

export default function DigitalMenu() {
  const { storeId, storeName, user, userRole } = useAuth();
  const { categories, reorderCategories, loading } = useDigitalMenu(storeId);
  const [isEditingOrder, setIsEditingOrder] = useState(false);

  const canEditOrder = userRole === "admin" || userRole === "manager";

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData("text/plain");
    if (!sourceIndexStr) return;
    const sourceIndex = parseInt(sourceIndexStr, 10);
    if (sourceIndex === targetIndex) return;

    const newCategories = [...categories];
    const [moved] = newCategories.splice(sourceIndex, 1);
    newCategories.splice(targetIndex, 0, moved);
    reorderCategories(newCategories);
  };

  const content = (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-cyan-500/30 selection:text-cyan-200 overflow-x-hidden relative">
      {/* Texture Background - Chalkboard feel */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.15] mix-blend-overlay z-0" 
           style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/black-paper.png')` }}></div>

      {/* SVG filter for chalk effect used in titles */}
      <svg className="hidden">
        <filter id="chalk">
          <feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <OasisMenuHeader storeName={storeName} />

      <main className="container max-w-7xl mx-auto px-4 md:px-8 pb-24 relative z-10">
        {canEditOrder && !loading && (
          <div className="flex justify-end mb-8">
            <Button
              variant="outline"
              onClick={() => setIsEditingOrder(!isEditingOrder)}
              className="border-white/10 hover:border-primary/50 text-white bg-white/5 hover:bg-primary/10 transition-all font-space-grotesk text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-inner"
            >
              {isEditingOrder ? "Ver Menú" : "Editar Orden"}
            </Button>
          </div>
        )}

        {/* Sticky Tabs Navigation */}
        {!isEditingOrder && !loading && categories.length > 0 && (
          <div className="sticky top-0 z-50 py-4 mb-12 -mx-4 px-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 flex gap-4 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button 
                key={cat.code}
                onClick={(e) => {
                  e.preventDefault();
                  const target = document.getElementById(`category-${cat.code}`);
                  if (target) {
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="whitespace-nowrap px-6 py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 font-space-grotesk text-xs uppercase tracking-widest transition-all cursor-pointer"
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-16">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 w-64 bg-white/5 rounded-lg mb-8"></div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-32 bg-white/5 rounded-[2rem] border border-white/5"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : isEditingOrder ? (
          <div className="space-y-4 max-w-xl mx-auto py-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
              <h3 className="font-space-grotesk font-black text-sm uppercase tracking-widest text-primary">Reordenar Categorías</h3>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Arrastra para reordenar</span>
            </div>
            {categories.map((cat, index) => (
              <div
                key={cat.code}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className="flex items-center justify-between p-4 bg-white/5 border border-white/10 hover:border-primary/30 rounded-2xl cursor-grab active:cursor-grabbing transition-all select-none group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.emoji_icon || "📦"}</span>
                  <span className="font-space-grotesk uppercase font-bold text-xs tracking-wider">{cat.label}</span>
                </div>
                <div className="text-muted-foreground group-hover:text-primary transition-colors pr-2">
                  ☰
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <OasisMenuCategory key={category.code} category={category} />
            ))}
            
            {categories.length === 0 && (
              <div className="text-center py-24">
                <p className="text-white/40 font-caveat text-3xl">No hay ítems configurados para mostrar en el menú.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );

  return user ? <Layout>{content}</Layout> : content;
}
