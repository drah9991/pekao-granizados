import { motion } from "framer-motion";

export function OasisMenuHeader({ storeName }: { storeName?: string }) {
  return (
    <header className="py-12 border-b border-white/5 relative overflow-hidden mb-12">
      {/* Texture */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
      
      <div className="container max-w-7xl mx-auto relative z-10 flex flex-col items-center justify-center text-center">
        
        {/* Dynamic Banner */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-8 inline-block rotate-[-2deg] bg-cyan-500 text-zinc-950 font-black uppercase tracking-widest text-xs md:text-sm px-6 py-2 rounded-sm shadow-[0_0_20px_rgba(6,182,212,0.4)]"
        >
          Special 40% Discount on Selected Drinks
        </motion.div>

        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-6xl md:text-8xl lg:text-9xl font-marker text-white tracking-widest mb-6"
          style={{ textShadow: '2px 4px 10px rgba(0,0,0,0.5)' }}
        >
          {storeName || "PUNTO PLAY PAUSA"}
        </motion.h1>

        <motion.p 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-xl md:text-3xl font-caveat text-orange-400 max-w-2xl mx-auto leading-relaxed"
        >
          Signature Granizados, Cocktails & More. 
          <br/>
          Crafted with love, served with style.
        </motion.p>
      </div>
    </header>
  );
}
