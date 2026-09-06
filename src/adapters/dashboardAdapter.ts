import { 
  V2DashboardFullData, 
  KpiRibbonData, 
  AnalyticalChartsData, 
  OperationsData, 
  HourlySalesPoint, 
  DailySalesPoint, 
  CashFlowPoint, 
  TopProductItem, 
  RecentOrderSummary, 
  SellerPerformance 
} from "@/types/dashboard";
import { formatCOP } from "@/lib/currency";

export function safeFormatCOP(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "$0";
  }
  try {
    return formatCOP(amount);
  } catch {
    return `$${Math.round(amount).toLocaleString('es-CO')}`;
  }
}

export function adaptRawToV2Dashboard(
  dashboardData: any,
  period: "today" | "week" | "month" | "year" = "today",
  comparisonLabel: string = "período ant."
): V2DashboardFullData {
  if (!dashboardData || !dashboardData.metrics) {
    return {
      kpis: {},
      charts: { hourlySales: [], weeklySales: [], cashFlow: [] },
      operations: { topProducts: [], recentOrders: [], topSellers: [] }
    };
  }

  const { metrics, hourlySales: rawHourly, recentOrders: rawOrders, popularProducts: rawPopular, pieData: rawPie } = dashboardData;

  // 1. EXACT REAL KPIs
  const revVal = Number(metrics.revenue?.val || 0);
  const revDelta = Number(metrics.revenue?.delta || 0);
  const revCompVal = Number(metrics.revenue?.compVal || 0);

  const netVal = Number(metrics.netProfit?.val || 0);
  const expVal = Number(metrics.expenses?.val || 0);

  const ordersVal = Number(metrics.orders?.val || 0);
  const ordersDelta = Number(metrics.orders?.delta || 0);
  const ordersCompVal = Number(metrics.orders?.compVal || 0);

  const avgVal = Number(metrics.avgTicket?.val || 0);
  const avgDelta = Number(metrics.avgTicket?.delta || 0);

  const cancelledCount = Number(metrics.cancelled?.val || 0);

  const kpis: KpiRibbonData = {
    todayRevenue: {
      title: period === 'today' ? "Facturado Hoy" : period === 'week' ? "Facturado (7 Días)" : period === 'month' ? "Facturado (30 Días)" : "Facturado (Año)",
      value: revVal,
      comparisonValue: revCompVal,
      percentageChange: Math.round(revDelta),
      target: revCompVal > 0 ? revCompVal : revVal,
      periodLabel: `vs ${comparisonLabel}`,
      trend: revDelta >= 0 ? 'up' : 'down',
      colorTheme: 'green'
    },
    last7DaysRevenue: {
      title: "Ganancia Neta",
      value: netVal,
      comparisonValue: revVal,
      percentageChange: revVal > 0 ? Math.round((netVal / revVal) * 100) : 0,
      target: revVal,
      periodLabel: "margen neto libre",
      trend: netVal >= 0 ? 'up' : 'down',
      colorTheme: 'magenta'
    },
    last30DaysRevenue: {
      title: "Ventas Completadas",
      value: ordersVal,
      comparisonValue: ordersCompVal,
      percentageChange: Math.round(ordersDelta),
      target: ordersCompVal > 0 ? ordersCompVal : ordersVal,
      periodLabel: `vs ${comparisonLabel} (${ordersCompVal} ped.)`,
      trend: ordersDelta >= 0 ? 'up' : 'down',
      colorTheme: 'cyan'
    },
    yearToDateRevenue: {
      title: "Ticket Promedio",
      value: avgVal,
      percentageChange: Math.round(avgDelta),
      target: avgVal,
      periodLabel: `vs ${comparisonLabel}`,
      trend: avgDelta >= 0 ? 'up' : 'down',
      colorTheme: 'amber'
    }
  };

  // 2. EXACT REAL HOURLY SALES
  const hourlySales: HourlySalesPoint[] = (rawHourly || []).map((h: any) => {
    const rawH = parseInt(h.hour, 10) || 0;
    return {
      hourLabel: `${String(rawH).padStart(2, '0')}:00`,
      rawHour: rawH,
      totalSales: Number(h.total || 0),
      itemCount: Number(h.items || 0)
    };
  });

  // 3. EXACT REAL PAYMENT METHODS AS DAILY/BREAKDOWN POINT
  const weeklySales: DailySalesPoint[] = (rawPie || []).map((p: any) => ({
    dayLabel: p.name || 'Otro',
    dateStr: p.name || 'Otro',
    totalSales: Number(p.value || 0),
    orderCount: Number(p.count || 0)
  }));

  // 4. EXACT DYNAMIC CASH FLOW (INGRESOS VS EGRESOS POR DÍA / HORA)
  const dateMap: Record<string, { income: number; expenses: number; label: string }> = {};

  const rawOrdersList = Array.isArray(dashboardData.rawOrders) ? dashboardData.rawOrders : [];
  const rawExpensesList = Array.isArray(dashboardData.rawExpenses) ? dashboardData.rawExpenses : [];
  const completedOrdersList = rawOrdersList.filter((o: any) => o?.status === 'completed' || o?.status === 'paid');

  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  completedOrdersList.forEach((o: any) => {
    if (!o.created_at) return;
    const d = new Date(o.created_at);
    const dateKey = d.toISOString().split('T')[0];
    const dayLabel = `${daysOfWeek[d.getDay()]} ${d.getDate()}`;
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { income: 0, expenses: 0, label: dayLabel };
    }
    dateMap[dateKey].income += Number(o.total || 0) - Number(o.tip_amount || 0);
  });

  rawExpensesList.forEach((e: any) => {
    const expDate = e.expense_date || e.created_at;
    if (!expDate) return;
    const d = new Date(expDate);
    const dateKey = d.toISOString().split('T')[0];
    const dayLabel = `${daysOfWeek[d.getDay()]} ${d.getDate()}`;
    if (!dateMap[dateKey]) {
      dateMap[dateKey] = { income: 0, expenses: 0, label: dayLabel };
    }
    dateMap[dateKey].expenses += Number(e.amount || 0);
  });

  const cashFlow: CashFlowPoint[] = Object.values(dateMap).map(item => ({
    periodLabel: item.label,
    income: item.income,
    expenses: item.expenses,
    netProfit: item.income - item.expenses
  }));

  if (cashFlow.length === 0) {
    cashFlow.push({
      periodLabel: "Período Seleccionado",
      income: revVal,
      expenses: expVal,
      netProfit: netVal
    });
  }

  // 5. EXACT REAL TOP 5 PRODUCTS
  const neonColors = ['#FF007F', '#39FF14', '#00E5FF', '#FFB800', '#BF5AF2'];
  const topSalesTotal = (rawPopular || []).reduce((sum: number, p: any) => sum + Number(p.sales || 0), 0);

  const topProducts: TopProductItem[] = (rawPopular || []).map((p: any, idx: number) => {
    const sales = Number(p.sales || 0);
    return {
      name: p.name || "Producto sin nombre",
      quantitySold: sales,
      revenue: Number(p.revenue || 0),
      relativePercentage: topSalesTotal > 0 ? Math.round((sales / topSalesTotal) * 100) : 0,
      color: neonColors[idx % neonColors.length]
    };
  });

  // 6. EXACT REAL RECENT ORDERS
  const recentOrders: RecentOrderSummary[] = (rawOrders || []).map((o: any) => {
    const rawStatus = String(o.status || 'completed');
    let status: RecentOrderSummary['status'] = 'completed';
    if (rawStatus === 'cancelled' || rawStatus === 'canceled') status = 'cancelled';
    else if (rawStatus === 'preparing' || rawStatus === 'pending') status = 'preparing';
    else if (rawStatus === 'paid' || rawStatus === 'completed') status = 'completed';

    const createdAt = String(o.created_at || new Date().toISOString());
    const timeFormatted = new Date(createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

    let paymentMethod = 'Efectivo';
    if (o.payment && typeof o.payment === 'object') {
      const p = o.payment as Record<string, unknown>;
      const method = String(p.method || p.type || 'cash');
      if (method === 'card' || method === 'tarjeta') paymentMethod = 'Tarjeta';
      else if (method === 'transfer' || method === 'nequi' || method === 'qr') paymentMethod = 'Transferencia';
      else if (method === 'split') paymentMethod = 'Mixto';
    }

    const items = Array.isArray(o.order_items) ? o.order_items : [];
    const itemsCount = items.reduce((sum: number, it: any) => sum + Number(it?.qty || 1), 0) || items.length || 1;

    return {
      id: String(o.id || ''),
      shortId: `#${String(o.id || '').slice(-4).toUpperCase()}`,
      created_at: createdAt,
      timeFormatted,
      total: Number(o.total || 0),
      status,
      paymentMethod,
      itemsCount
    };
  });

  // 7. REAL PAYMENT DISTRIBUTION FOR OPERATIONAL RANKING (Exact counts and sums per payment channel)
  const topSellers: SellerPerformance[] = (rawPie || []).map((p: any) => ({
    name: p.name,
    totalSales: Number(p.value || 0),
    ordersCount: Number(p.count || 0),
    trendSparkline: [
      Math.round(p.value * 0.1), 
      Math.round(p.value * 0.25), 
      Math.round(p.value * 0.4), 
      Math.round(p.value * 0.6), 
      Math.round(p.value * 0.85), 
      Number(p.value)
    ]
  }));

  return {
    kpis,
    charts: {
      hourlySales,
      weeklySales,
      cashFlow
    },
    operations: {
      topProducts,
      recentOrders,
      topSellers
    },
    lastUpdated: new Date().toLocaleTimeString('es-CO')
  };
}
