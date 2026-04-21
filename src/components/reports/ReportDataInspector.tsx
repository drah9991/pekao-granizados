import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCOP } from "@/lib/currency";
import { ReportType } from "@/hooks/useReports";

interface ReportDataInspectorProps {
  previewData: any[];
  reportType: ReportType;
  columns: { header: string; dataKey: string }[];
  selectedColumns: string[];
  onInitPreview: () => void;
}

export default function ReportDataInspector({
  previewData,
  reportType,
  columns,
  selectedColumns,
  onInitPreview
}: ReportDataInspectorProps) {
  const filteredColumns = columns.filter(c => selectedColumns.includes(c.dataKey));

  return (
    <Card className="bg-[#1C1F26] border border-white/5 rounded-[3.5rem] shadow-pro glass-pro overflow-hidden flex flex-col min-h-[500px] xl:h-[700px]">
        <CardHeader className="p-10 border-b border-white/5 flex flex-row items-center justify-between bg-white/[0.02]">
            <div>
                <CardTitle className="text-xl lg:text-3xl font-black italic uppercase font-space-grotesk tracking-tighter">Data Inspector</CardTitle>
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mt-1 italic font-space-grotesk">
                    {previewData.length > 0 ? `SYNC ACTIVE: ${previewData.length} NODOS DE DATOS` : "WAITING FOR GENERATION COMMAND"}
                </CardDescription>
            </div>
            {previewData.length > 0 && (
                <div className="flex gap-4">
                   <div className="flex items-center gap-2 bg-indigo-500/10 px-4 h-9 rounded-full border border-indigo-500/20 font-black text-[9px] text-indigo-400 italic uppercase">
                      <Hash className="w-3.5 h-3.5" /> {selectedColumns.length} COLS
                   </div>
                </div>
            )}
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-hidden relative">
            {previewData.length > 0 ? (
                <ScrollArea className="h-full w-full">
                    <Table>
                        <TableHeader className="bg-[#12141a] sticky top-0 z-20 shadow-pro">
                            <TableRow className="border-white/5 hover:bg-[#12141a]">
                                {filteredColumns.map((col) => (
                                    <TableHead key={col.dataKey} className="px-10 h-20 text-[10px] font-black text-white/40 uppercase tracking-[0.3em] font-space-grotesk italic">
                                        {col.header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <AnimatePresence mode="popLayout">
                                {previewData.map((row, idx) => (
                                    <motion.tr
                                        key={idx}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.005 }}
                                        className="border-white/5 hover:bg-white/[0.04] transition-all group h-20"
                                    >
                                        {filteredColumns.map((col) => (
                                            <TableCell key={col.dataKey} className="px-10 text-white font-black font-space-grotesk italic text-sm tracking-tight group-hover:text-indigo-400 transition-colors">
                                                {typeof row[col.dataKey] === 'number' && (col.dataKey.toLowerCase().includes('price') || col.dataKey.toLowerCase().includes('total'))
                                                    ? formatCOP(row[col.dataKey])
                                                    : row[col.dataKey]}
                                            </TableCell>
                                        ))}
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </TableBody>
                    </Table>
                </ScrollArea>
            ) : (
                <div className="flex flex-col items-center justify-center h-full gap-8 p-20 opacity-30">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white/5 border border-dashed border-white/20 flex items-center justify-center">
                        <BarChart3 className="w-16 h-16 text-white" />
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-black italic uppercase font-space-grotesk tracking-widest text-white">Inspector Inactivo</h3>
                        <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-3 max-w-xs mx-auto italic leading-relaxed">
                            Configure los parámetros en el panel lateral y ejecute el comando de telemetría para visualizar la red de datos.
                        </p>
                    </div>
                    <Button onClick={onInitPreview} variant="ghost" className="h-14 px-10 rounded-2xl border border-white/10 font-black italic uppercase tracking-widest text-[10px] hover:bg-white/5 transition-all text-white/40">
                        INIT DATA FLOW ✓
                    </Button>
                </div>
            )}
            <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-[#1C1F26] to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#1C1F26] to-transparent pointer-events-none z-10" />
        </CardContent>
    </Card>
  );
}
