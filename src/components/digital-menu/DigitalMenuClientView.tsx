import { useState } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { OasisMenuHeader } from "@/components/menu/OasisMenuHeader";
import { OasisMenuCategory } from "@/components/menu/OasisMenuCategory";
import type { MenuCategory } from "@/hooks/useDigitalMenu";
import type { ThemeStyles } from "./themeStyles";

interface DigitalMenuClientViewProps {
  storeName?: string;
  commercialName: string;
  phones: string;
  formTheme: string;
  activeStyles: ThemeStyles;
  storesList: { id: string; name: string }[];
  effectiveStoreId: string | null;
  onStoreChange: (newStoreId: string) => void;
  categories: MenuCategory[];
  loading: boolean;
}

export function DigitalMenuClientView({
  storeName,
  commercialName,
  phones,
  formTheme,
  activeStyles,
  storesList,
  effectiveStoreId,
  onStoreChange,
  categories,
  loading
}: DigitalMenuClientViewProps) {
  const isChalkboard = activeStyles.style === "classic";
  const fontClass = activeStyles.font;
  const [clientTheme, setClientTheme] = useState<'classic' | 'loggro'>(
    formTheme === "tema-2" || formTheme === "tema-4" || formTheme === "tema-5" ? 'loggro' : 'classic'
  );

  return (
    <div
      className={cn("min-h-screen overflow-x-hidden relative menu-client-view", fontClass)}
      style={{ backgroundColor: activeStyles.bg, color: activeStyles.text }}
    >
      {/* Dynamic Theme Styles Injected Local to Client View */}
      <style>{`
        .menu-client-view .text-primary {
          color: ${activeStyles.primary} !important;
        }
        .menu-client-view .bg-primary {
          background-color: ${activeStyles.primary} !important;
        }
        .menu-client-view .border-primary {
          border-color: ${activeStyles.primary} !important;
        }
        .menu-client-view .category-tab-active {
          background-color: ${activeStyles.primary} !important;
          color: ${activeStyles.bg === '#fffbeb' || activeStyles.bg === '#f0fdf4' || activeStyles.bg === '#f0f9ff' ? '#ffffff' : '#000000'} !important;
        }
      `}</style>

      {isChalkboard && (
        <div className="fixed inset-0 pointer-events-none opacity-[0.12] mix-blend-overlay z-0"
             style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/black-paper.png')` }}></div>
      )}

      <OasisMenuHeader
        storeName={commercialName || storeName}
        theme={clientTheme}
        onThemeChange={(newTheme) => setClientTheme(newTheme)}
        canChangeTheme={true}
        stores={storesList}
        activeStoreId={effectiveStoreId}
        onStoreChange={onStoreChange}
      />

      <main className="container max-w-7xl mx-auto px-4 md:px-8 pb-24 relative z-10">
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
              <OasisMenuCategory key={category.code} category={category} theme={clientTheme} />
            ))}

            {categories.length === 0 && (
              <div className="text-center py-24">
                <p className="font-caveat text-3xl opacity-40">
                  No hay productos configurados como públicos para mostrar en el menú.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer id="contacto" className="w-full py-10 px-6 md:px-12 mt-16 border-t border-white/5 opacity-80" style={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
        <div className="container max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-widest font-space-grotesk">Contacto</h4>
            <div className="flex items-center gap-2 text-sm font-bold opacity-80">
              <Phone className="w-4 h-4" />
              <span>{phones || "3107112503"}</span>
            </div>
          </div>

          <div className="flex flex-col items-start md:items-end gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold opacity-60">Hecho para</span>
              <span className="text-xs font-black uppercase tracking-widest text-primary">
                {commercialName || storeName || "Loggro"}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
