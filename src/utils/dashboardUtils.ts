import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from "date-fns";

export interface DashboardRanges {
  current: { start: string; end: string };
  comparison: { start: string; end: string };
}

export function getDashboardRanges(period: "today" | "week" | "month" | "year"): DashboardRanges {
  const today = new Date();
  let current, comparison;

  switch (period) {
    case "today":
      current = { start: startOfDay(today).toISOString(), end: endOfDay(today).toISOString() };
      comparison = { start: startOfDay(subDays(today, 1)).toISOString(), end: endOfDay(subDays(today, 1)).toISOString() };
      break;
    case "week":
      current = { start: startOfWeek(today, { weekStartsOn: 1 }).toISOString(), end: endOfWeek(today, { weekStartsOn: 1 }).toISOString() };
      comparison = { start: startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }).toISOString(), end: endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 }).toISOString() };
      break;
    case "month":
      current = { start: startOfMonth(today).toISOString(), end: endOfMonth(today).toISOString() };
      comparison = { start: startOfMonth(subMonths(today, 1)).toISOString(), end: endOfMonth(subMonths(today, 1)).toISOString() };
      break;
    case "year":
      current = { start: startOfYear(today).toISOString(), end: endOfYear(today).toISOString() };
      comparison = { start: startOfYear(subYears(today, 1)).toISOString(), end: endOfYear(subYears(today, 1)).toISOString() };
      break;
    default:
      current = { start: startOfDay(today).toISOString(), end: endOfDay(today).toISOString() };
      comparison = { start: startOfDay(subDays(today, 1)).toISOString(), end: endOfDay(subDays(today, 1)).toISOString() };
  }

  return { current, comparison };
}

export function transformDashboardData(orders: any[], comparisonOrders: any[], expenses: any[] = []) {
  const completed = orders.filter(o => o.status === 'completed');
  const cancelled = orders.filter(o => o.status === 'cancelled');

  const totalRevenue = completed.reduce((sum, o) => sum + (Number(o.total || 0) - Number(o.tip_amount || 0)), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpenses;

  const ordersCount = completed.length;
  const cancelledCount = cancelled.length;
  const avgTicket = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

  const compOrders = (comparisonOrders || []).filter(o => o.status === 'completed');
  const compRevenue = compOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const compCount = compOrders.length;
  const compAvg = compCount > 0 ? Math.round(compRevenue / compCount) : 0;
  const compCancelled = (comparisonOrders || []).filter(o => o.status === 'cancelled').length;

  const revenueDelta = compRevenue > 0 ? ((totalRevenue - compRevenue) / compRevenue) * 100 : 0;
  const countDelta = ordersCount - compCount;
  const avgDelta = compAvg > 0 ? ((avgTicket - compAvg) / compAvg) * 100 : 0;

  const hourlySales = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, total: 0, items: 0 }));
  let peakHour = 0;
  let maxHourRev = 0;
  let totalItems = 0;
  let maxSale = 0;

  completed.forEach(o => {
    const date = new Date(o.created_at);
    const hour = date.getHours();
    const itemsInOrder = o.order_items?.reduce((sum: number, item: any) => sum + Number(item.qty), 0) || 0;
    
    hourlySales[hour].total += Number(o.total);
    hourlySales[hour].items += itemsInOrder;
    totalItems += itemsInOrder;
    
    if (Number(o.total) > maxSale) maxSale = Number(o.total);
    if (hourlySales[hour].total > maxHourRev) {
      maxHourRev = hourlySales[hour].total;
      peakHour = hour;
    }
  });

  const paymentSplit: Record<string, { total: number, count: number }> = {
    'Efectivo': { total: 0, count: 0 },
    'Transferencias / QR': { total: 0, count: 0 },
    'Tarjeta': { total: 0, count: 0 }
  };

  completed.forEach(o => {
    let method = 'cash';
    let splitInfo: { cash: number; transfer: number } | null = null;
    
    if (o.payment && typeof o.payment === 'object') {
      const p = o.payment as any;
      method = p.method || p.type || 'cash';
      if (method === 'split' && p.details) {
        splitInfo = p.details;
      }
    }
    
    if (method === 'split' && splitInfo) {
      paymentSplit['Efectivo'].total += Number(splitInfo.cash || 0);
      paymentSplit['Efectivo'].count += 1;
      paymentSplit['Transferencias / QR'].total += Number(splitInfo.transfer || 0);
      paymentSplit['Transferencias / QR'].count += 1;
    } else {
      const formattedMethod = (method === 'cash' || method === 'efectivo') ? 'Efectivo' : 
                            (method === 'card' || method === 'tarjeta') ? 'Tarjeta' : 
                            (method === 'transfer' || method === 'nequi' || method === 'qr') ? 'Transferencias / QR' : 'Efectivo';
      
      if (!paymentSplit[formattedMethod]) paymentSplit[formattedMethod] = { total: 0, count: 0 };
      paymentSplit[formattedMethod].total += Number(o.total);
      paymentSplit[formattedMethod].count += 1;
    }
  });

  const pieData = Object.entries(paymentSplit).map(([name, data]) => ({
    name, value: data.total, count: data.count, percentage: totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 100) : 0
  })).filter(d => d.value > 0);

  const productMap: Record<string, { sales: number, revenue: number }> = {};
  completed.forEach(o => {
    o.order_items?.forEach((item: any) => {
      if (!productMap[item.name]) productMap[item.name] = { sales: 0, revenue: 0 };
      productMap[item.name].sales += Number(item.qty);
      productMap[item.name].revenue += Number(item.price) * Number(item.qty);
    });
  });

  const popularProducts = Object.entries(productMap)
    .map(([name, data]) => ({ name, sales: data.sales, revenue: data.revenue }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 5);

  return {
    metrics: {
      revenue: { val: totalRevenue, delta: revenueDelta },
      expenses: { val: totalExpenses },
      netProfit: { val: netProfit },
      orders: { val: ordersCount, delta: countDelta },
      avgTicket: { val: avgTicket, delta: avgDelta },
      cancelled: { val: cancelledCount, comp: compCancelled }
    },
    recentOrders: orders.slice(0, 5),
    hourlySales: hourlySales.slice(8, 24), 
    peakHour: `${peakHour}:00 - ${peakHour + 1}:00`,
    maxSale,
    totalItems,
    pieData,
    popularProducts
  };
}
