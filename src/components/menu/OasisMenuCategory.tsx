import { motion } from "framer-motion";
import { MenuCategory } from "@/hooks/useDigitalMenu";
import { OasisMenuItem } from "./OasisMenuItem";
import { cn } from "@/lib/utils";

interface OasisMenuCategoryProps {
  category: MenuCategory;
  theme?: 'classic' | 'loggro';
}

export function OasisMenuCategory({ category, theme = 'classic' }: OasisMenuCategoryProps) {
  if (category.items.length === 0) return null;

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-16 scroll-mt-24"
      id={`category-${category.code}`}
    >
      <div className="flex items-center gap-4 mb-8">
        {theme === 'loggro' ? (
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 uppercase tracking-widest font-space-grotesk">
            {category.label}
          </h2>
        ) : (
          <h2 className="text-4xl md:text-6xl font-marker text-zinc-100 uppercase tracking-wider relative inline-block">
            {category.label}
            {/* Decorative chalk underline */}
            <span className="absolute -bottom-2 left-0 w-full h-[4px] bg-white/20 rounded-full" style={{ filter: 'url(#chalk)' }}></span>
          </h2>
        )}
        {category.emoji_icon && (
          <span className="text-3xl">{category.emoji_icon}</span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {category.items.map((item, idx) => (
          <OasisMenuItem key={item.id} item={item} theme={theme} />
        ))}
      </div>
    </motion.section>
  );
}
