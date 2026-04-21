import React from "react";
import Layout from "@/components/Layout";
import { FlaskConical } from "lucide-react";
import { motion } from "framer-motion";
import { usePreparation } from "@/hooks/usePreparation";
import PreparationForm from "@/components/preparation/PreparationForm";
import PreparationLogList from "@/components/preparation/PreparationLogList";

export default function Preparation() {
  const {
    products, sizes, logs, loading, isProcessing, isEmptying,
    selectedProductId, setSelectedProductId,
    liters, setLiters,
    currentMixtureStock, currentMixtureName,
    handleAutoLink, handleEmptyTank, handleRegisterPreparation, handleDeleteLog
  } = usePreparation();

  return (
    <Layout>
        <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="p-6 md:p-8 space-y-10"
        >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-4 border-b border-white/5 relative">
                <div className="absolute -left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full shadow-glow-pro" />
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black font-space-grotesk italic tracking-tighter uppercase text-foreground mb-2 flex items-center gap-4">
                        <FlaskConical className="w-8 h-8 md:w-10 md:h-10 text-primary drop-shadow-glow" />
                        PREPARACIÓN <span className="text-primary text-glow italic">DE MEZCLA</span>
                    </h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 font-space-grotesk italic">
                        Batch Production & Volume Intelligence v2.0
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <PreparationForm 
                    products={products}
                    selectedProductId={selectedProductId}
                    onProductChange={setSelectedProductId}
                    liters={liters}
                    onLitersChange={setLiters}
                    currentStock={currentMixtureStock}
                    mixtureName={currentMixtureName}
                    onAutoLink={handleAutoLink}
                    onEmptyTank={handleEmptyTank}
                    onRegister={handleRegisterPreparation}
                    isProcessing={isProcessing}
                    isEmptying={isEmptying}
                    sizes={sizes}
                />

                <PreparationLogList 
                    logs={logs}
                    loading={loading}
                    onDelete={handleDeleteLog}
                />
            </div>
        </motion.div>
    </Layout>
  );
}
