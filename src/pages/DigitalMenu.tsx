import { useDigitalMenu } from "@/hooks/useDigitalMenu";
import { useAuth } from "@/context/AuthContext";
import { PekaoMenuHeader } from "@/components/menu/PekaoMenuHeader";
import { PekaoMenuCategory } from "@/components/menu/PekaoMenuCategory";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";

export default function DigitalMenu() {
  const { storeId, user } = useAuth();
  const { categories, loading } = useDigitalMenu(storeId);

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

      <PekaoMenuHeader />

      <main className="container max-w-7xl mx-auto px-4 md:px-8 pb-24 relative z-10">
        
        {/* Sticky Tabs Navigation */}
        {!loading && categories.length > 0 && (
          <div className="sticky top-0 z-50 py-4 mb-12 -mx-4 px-4 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 flex gap-4 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <a 
                key={cat.code}
                href={`#category-${cat.code}`}
                className="whitespace-nowrap px-6 py-2 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-cyan-500/50 hover:bg-cyan-500/10 font-space-grotesk text-xs uppercase tracking-widest transition-all"
              >
                {cat.label}
              </a>
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
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <PekaoMenuCategory key={category.code} category={category} />
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
