import React from "react";
import { Button } from "./button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdvancedPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  totalRecords?: number;
  pageSizeOptions?: number[];
  className?: string;
}

export function AdvancedPagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  totalRecords = 0,
  pageSizeOptions = [5, 10, 20, 50, 100],
  className
}: AdvancedPaginationProps) {
  
  // Calculate range of records being shown
  const startRecord = totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  // Generate page numbers to display: e.g., 1 ... 4 5 [6] 7 8 ... 20
  const getPageNumbers = () => {
    const pageNumbers: (number | string)[] = [];
    const delta = 2; // Number of pages to show before and after current page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      const leftBoundary = Math.max(2, currentPage - delta);
      const rightBoundary = Math.min(totalPages - 1, currentPage + delta);

      if (leftBoundary > 2) {
        pageNumbers.push("...");
      }

      for (let i = leftBoundary; i <= rightBoundary; i++) {
        pageNumbers.push(i);
      }

      if (rightBoundary < totalPages - 1) {
        pageNumbers.push("...");
      }

      // Always show last page
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-[#1C1F26]/30 border-t border-white/5 backdrop-blur-xl transition-all duration-300 font-sans", className)}>
      
      {/* Records range info */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-black text-white/40 uppercase tracking-widest italic">
          {totalRecords > 0 ? (
            <>
              Mostrando <span className="text-cyan-400 font-bold">{startRecord}</span> - <span className="text-cyan-400 font-bold">{endRecord}</span> de <span className="text-white/80 font-bold">{totalRecords}</span> registros
            </>
          ) : (
            `Página ${currentPage} de ${Math.max(1, totalPages)}`
          )}
        </span>
      </div>

      {/* Center: Page numbers navigation buttons */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* First page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-lg bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Primera Página"
        >
          <ChevronsLeft className="w-3.5 h-3.5 text-white/70" />
        </Button>

        {/* Previous page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="w-8 h-8 rounded-lg bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Página Anterior"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-white/70" />
        </Button>

        {/* Page buttons */}
        {getPageNumbers().map((page, idx) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-white/35">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isSelected = pageNum === currentPage;

          return (
            <Button
              key={`page-${pageNum}`}
              variant={isSelected ? "default" : "outline"}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "w-8 h-8 rounded-lg text-xs font-bold font-space-grotesk transition-all duration-200",
                isSelected
                  ? "bg-cyan-500 hover:bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)] border-none"
                  : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-white/70 hover:text-white"
              )}
            >
              {pageNum}
            </Button>
          );
        })}

        {/* Next page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="w-8 h-8 rounded-lg bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Siguiente Página"
        >
          <ChevronRight className="w-3.5 h-3.5 text-white/70" />
        </Button>

        {/* Last page */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="w-8 h-8 rounded-lg bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          title="Última Página"
        >
          <ChevronsRight className="w-3.5 h-3.5 text-white/70" />
        </Button>
      </div>

      {/* Page size selector (Rows per page) */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest italic">
            Filas:
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-white/5 border border-white/10 hover:border-white/20 rounded-lg text-xs font-bold text-white/70 hover:text-white px-2 py-1 focus:outline-none transition-all cursor-pointer font-space-grotesk"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt} className="bg-slate-900 text-white">
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
