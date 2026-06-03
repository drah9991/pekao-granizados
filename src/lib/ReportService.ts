export interface ReportConfig {
  title: string;
  subtitle?: string;
  fileName: string;
  columns: { header: string; dataKey: string }[];
}

class ReportService {
  /**
   * Export JSON data to Excel
   */
  async exportToExcel(data: Record<string, unknown>[], config: ReportConfig) {
    const XLSX = await import('xlsx');
    const { format } = await import('date-fns');

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, config.title.slice(0, 31));
    
    XLSX.writeFile(workbook, `${config.fileName}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  }

  /**
   * Export JSON data to PDF
   */
  async exportToPDF(data: Record<string, unknown>[], config: ReportConfig) {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;
    const { format } = await import('date-fns');
    const { es } = await import('date-fns/locale');

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 17, 23); // Dark slate
    doc.text(config.title, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(config.subtitle || `Reporte generado el ${format(new Date(), "PPpp", { locale: es })}`, 14, 30);
    
    // Horizontal line
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 35, 196, 35);

    // Filter headers and body
    const body = data.map(item => config.columns.map(col => {
      const val = item[col.dataKey];
      // Format if it's a date or currency
      if (val instanceof Date) return format(val, 'dd/MM/yyyy');
      const key = col.dataKey.toLowerCase();
      if (typeof val === 'number' && (key.includes('price') || key.includes('total') || key.includes('spent') || key.includes('subtotal'))) {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val);
      }
      return val ?? '-';
    }));

    const head = [config.columns.map(c => c.header)];

    autoTable(doc, {
      head: head,
      body: body,
      startY: 40,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 40 },
      didDrawPage: (data) => {
        // Footer (Page number)
        const str = `Página ${doc.getNumberOfPages()}`;
        doc.setFontSize(10);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        doc.text(str, data.settings.margin.left, pageHeight - 10);
      }
    });

    doc.save(`${config.fileName}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  }
}

export const reportService = new ReportService();
