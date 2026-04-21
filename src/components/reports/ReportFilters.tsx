import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, Zap, FileSpreadsheet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportType } from "@/hooks/useReports";

interface ReportFiltersProps {
  reportType: ReportType;
  setReportType: (v: ReportType) => void;
  dateRange: { from: Date; to: Date };
  setDateRange: (range: { from: Date; to: Date }) => void;
  columns: { header: string; dataKey: string }[];
  selectedColumns: string[];
  toggleColumn: (key: string) => void;
  groupBy: string;
  setGroupBy: (v: string) => void;
  handleExport: (type: "excel" | "pdf") => void;
  isExporting: boolean;
  previewDataLength: number;
}

export default function ReportFilters({
  reportType, setReportType,
  dateRange, setDateRange,
  columns, selectedColumns, toggleColumn,
  groupBy, setGroupBy,
  handleExport, isExporting, previewDataLength
}: ReportFiltersProps) {
  return (
    <Card className="bg-muted border border-border rounded-[3rem] shadow-pro glass-pro p-10 group overflow-hidden relative h-fit">
        <CardHeader className="px-0 pt-0 pb-8 border-b border-border/50 mb-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-muted border border-border rounded-2xl text-foreground/40">
                    <Zap className="w-5 h-5" />
                </div>
                <CardTitle className="text-2xl font-black italic uppercase font-space-grotesk tracking-tight">Configuration</CardTitle>
            </div>
        </CardHeader>
        <CardContent className="px-0 space-y-8">
            <div className="space-y-3">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">PARÁMETRO DE REPORTE</label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                    <SelectTrigger className="h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:ring-primary/20 shadow-pro transition-all">
                        <SelectValue placeholder="SELECCIONAR TIPO" />
                    </SelectTrigger>
                    <SelectContent className="glass-pro border-border rounded-3xl">
                        <SelectItem value="sales" className="text-[10px] font-black uppercase italic">VENTAS MENSUALES</SelectItem>
                        <SelectItem value="inventory" className="text-[10px] font-black uppercase italic">ESTADO DE INVENTARIO</SelectItem>
                        <SelectItem value="movements" className="text-[10px] font-black uppercase italic">KARDEX DE MOVIMIENTOS</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {reportType !== "inventory" && (
                <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">VENTANA DE TIEMPO</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                className="w-full h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk justify-start px-6 gap-3 hover:bg-muted transition-all border shadow-pro"
                            >
                                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <span className="text-foreground">
                                            {format(dateRange.from, "dd LLL", { locale: es })} — {format(dateRange.to, "dd LLL", { locale: es })}
                                        </span>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
                                    )
                                ) : (
                                    <span>Seleccionar fecha</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-background border-border rounded-3xl shadow-pro" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range: any) => range?.from && range?.to && setDateRange(range)}
                                numberOfMonths={1}
                                className="text-foreground"
                                locale={es}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            )}

            <div className="space-y-6">
                <label className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">COLUMN MASTER (FILTER)</label>
                <div className="flex flex-wrap gap-3">
                    {columns.map((col) => (
                        <button 
                            key={col.dataKey}
                            onClick={() => toggleColumn(col.dataKey)}
                            className={cn(
                                "px-4 h-9 rounded-xl text-[9px] font-black uppercase italic tracking-widest transition-all border",
                                selectedColumns.includes(col.dataKey) 
                                    ? "bg-primary/20 text-primary border-primary/40 shadow-glow-pro" 
                                    : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                            )}
                        >
                            {col.header}
                        </button>
                    ))}
                </div>
            </div>

            {reportType === "sales" && (
                <div className="space-y-3 pt-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground italic px-2">AGRUPACIÓN TÁCTICA</label>
                    <Select value={groupBy} onValueChange={setGroupBy}>
                        <SelectTrigger className="h-14 bg-muted/40 border-border rounded-2xl text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:ring-primary/20 transition-all">
                            <SelectValue placeholder="SIN AGRUPAR" />
                        </SelectTrigger>
                        <SelectContent className="glass-pro border-border rounded-2xl">
                            <SelectItem value="none" className="text-[10px] font-black uppercase italic">DIRECTO (DETALLADO)</SelectItem>
                            <SelectItem value="payment" className="text-[10px] font-black uppercase italic">VÍA MÉTODO DE PAGO</SelectItem>
                            <SelectItem value="employee" className="text-[10px] font-black uppercase italic">VÍA ANALISTA DE CAJA</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <div className="pt-10 grid grid-cols-2 gap-4">
                <Button 
                    onClick={() => handleExport("excel")} 
                    className="h-16 rounded-[1.5rem] bg-emerald-500/10 text-emerald-500 font-black italic uppercase tracking-widest text-[10px] hover:bg-emerald-500 hover:text-primary-foreground transition-all shadow-pro border border-emerald-500/20 gap-3"
                    disabled={isExporting || previewDataLength === 0}
                >
                    <FileSpreadsheet className="w-4 h-4" /> Excel Matrix
                </Button>
                <Button 
                    onClick={() => handleExport("pdf")} 
                    className="h-16 rounded-[1.5rem] bg-rose-500/10 text-rose-500 font-black italic uppercase tracking-widest text-[10px] hover:bg-rose-500 hover:text-primary-foreground transition-all shadow-pro border border-rose-500/20 gap-3"
                    disabled={isExporting || previewDataLength === 0}
                >
                    <FileText className="w-4 h-4" /> PDF Report
                </Button>
            </div>
        </CardContent>
    </Card>
  );
}
