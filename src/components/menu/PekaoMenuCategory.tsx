import { motion } from "framer-motion";
import { MenuCategory } from "@/hooks/useDigitalMenu";
import { PekaoMenuItem } from "./PekaoMenuItem";

export function PekaoMenuCategory({ category }: { category: MenuCategory }) {
  if (category.items.length === 0) return null;

  return (
    <motion.section 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-16 scroll-mt-24"
      id={`category-${category.code}`}
    >
      <div className="flex items-center gap-4 mb-8">
        <h2 className="text-4xl md:text-6xl font-marker text-zinc-100 uppercase tracking-wider relative inline-block">
          {category.label}
          {/* Decorative chalk underline */}
          <span className="absolute -bottom-2 left-0 w-full h-[4px] bg-white/20 rounded-full" style={{ filter: 'url(#chalk)' }}></span>
        </h2>
        {category.emoji_icon && (
          <span className="text-4xl">{category.emoji_icon}</span>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {category.items.map((item, idx) => (
          <PekaoMenuItem key={item.id} item={item} />
        ))}
      </div>
    </motion.section>
  );
}
