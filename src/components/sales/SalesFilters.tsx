import { Search, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface SalesFiltersProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  quickFilter: string;
  handleQuickFilterChange: (val: string) => void;
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
}

export function SalesFilters({
  searchQuery,
  setSearchQuery,
  quickFilter,
  handleQuickFilterChange,
  dateRange,
  setDateRange
}: SalesFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-5 items-stretch">
      <div className="relative flex-1 group">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder="BUSCAR POR ID, CAJERO O CLIENTE..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-14 h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk focus:border-primary/50 focus:ring-primary/20 transition-all shadow-pro"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={quickFilter} onValueChange={handleQuickFilterChange}>
          <SelectTrigger className="w-[180px] h-16 bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk shadow-pro">
            <SelectValue placeholder="PERIODO" />
          </SelectTrigger>
          <SelectContent className="glass-pro border-border rounded-[1.5rem]">
            <SelectItem value="all" className="text-[10px] font-black uppercase tracking-widest italic">Todo el Historial</SelectItem>
            <SelectItem value="today" className="text-[10px] font-black uppercase tracking-widest italic">Hoy</SelectItem>
            <SelectItem value="week" className="text-[10px] font-black uppercase tracking-widest italic">Esta Semana</SelectItem>
            <SelectItem value="month" className="text-[10px] font-black uppercase tracking-widest italic">Este Mes</SelectItem>
            <SelectItem value="year" className="text-[10px] font-black uppercase tracking-widest italic">Este Año</SelectItem>
            <SelectItem value="custom" className="text-[10px] font-black uppercase tracking-widest italic">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[240px] h-16 justify-start text-left bg-muted/40 border-border rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest italic font-space-grotesk hover:bg-muted/80 transition-all shadow-pro",
                !dateRange && "text-muted-foreground/40"
              )}
            >
              <CalendarDays className="mr-3 h-4 w-4 text-primary" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <span className="text-foreground">
                    {format(dateRange.from, "dd MMM", { locale: es })} — {format(dateRange.to, "dd MMM", { locale: es })}
                  </span>
                ) : (
                  <span className="text-foreground">{format(dateRange.from, "dd MMM, y", { locale: es })}</span>
                )
              ) : (
                "RANGO CALENDARIO"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="glass-pro border-white/10 rounded-[2rem] p-4 shadow-pro" align="end">
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className="bg-transparent text-foreground"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
