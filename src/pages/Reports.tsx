import React from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useReports } from "@/hooks/useReports";
import ReportFilters from "@/components/reports/ReportFilters";
import ReportStats from "@/components/reports/ReportStats";
import ReportDataInspector from "@/components/reports/ReportDataInspector";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

export default function Reports() {
  const { storeId } = useAuth();
  const {
    reportType, setReportType,
    dateRange, setDateRange,
    isExporting, isLoadingPreview,
    previewData, selectedColumns, toggleColumn,
    groupBy, setGroupBy,
    summary, handleLoadPreview, handleExport,
    columnsByType
  } = useReports(storeId);

  return (
    <Layout>
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="min-h-screen text-foreground p-6 lg:p-10 space-y-10"
      >
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-glow-pro overflow-hidden relative">
                    <BarChart3 className="w-10 h-10 text-indigo-400 relative z-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent" />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tighter mb-1 bg-gradient-to-r from-foreground via-foreground/80 to-foreground/40 bg-clip-text text-transparent italic uppercase font-space-grotesk whitespace-nowrap">
                        Executive Analytics
                    </h1>
                    <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-[10px] italic font-space-grotesk">
                        Business Intelligence • Data Visualization v2.0
                    </p>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <Button 
                    onClick={handleLoadPreview} 
                    className="h-14 px-8 rounded-2xl bg-primary text-primary-foreground font-black italic uppercase tracking-widest text-[10px] hover:shadow-glow-pro transition-all gap-4 border-none shadow-pro"
                    disabled={isLoadingPreview}
                >
                    {isLoadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" /> }
                    Refrescar Telemetría
                </Button>
            </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            <motion.div variants={itemVariants} className="xl:col-span-4">
                <ReportFilters 
                    reportType={reportType} 
                    setReportType={setReportType}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                    columns={columnsByType[reportType]}
                    selectedColumns={selectedColumns}
                    toggleColumn={toggleColumn}
                    groupBy={groupBy}
                    setGroupBy={setGroupBy}
                    handleExport={handleExport}
                    isExporting={isExporting}
                    previewDataLength={previewData.length}
                />
            </motion.div>

            <motion.div variants={itemVariants} className="xl:col-span-8 space-y-10">
                <AnimatePresence mode="wait">
                    {summary && (
                        <ReportStats summary={summary} reportType={reportType} />
                    )}
                </AnimatePresence>

                <ReportDataInspector 
                    previewData={previewData} 
                    reportType={reportType}
                    columns={columnsByType[reportType]}
                    selectedColumns={selectedColumns}
                    onInitPreview={handleLoadPreview}
                />
            </motion.div>
        </div>
      </motion.div>
    </Layout>
  );
}
