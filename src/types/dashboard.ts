export interface KpiMetricItem {
  title: string;
  value: number;
  comparisonValue?: number;
  percentageChange?: number;
  target?: number;
  periodLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  colorTheme?: 'green' | 'magenta' | 'cyan' | 'amber';
}

export interface KpiRibbonData {
  todayRevenue?: KpiMetricItem;
  last7DaysRevenue?: KpiMetricItem;
  last30DaysRevenue?: KpiMetricItem;
  yearToDateRevenue?: KpiMetricItem;
}

export interface HourlySalesPoint {
  hourLabel: string;
  rawHour: number;
  totalSales: number;
  itemCount: number;
}

export interface DailySalesPoint {
  dayLabel: string;
  dateStr: string;
  totalSales: number;
  orderCount: number;
}

export interface CashFlowPoint {
  periodLabel: string;
  income: number;
  expenses: number;
  netProfit: number;
}

export interface AnalyticalChartsData {
  hourlySales?: HourlySalesPoint[];
  weeklySales?: DailySalesPoint[];
  cashFlow?: CashFlowPoint[];
}

export interface TopProductItem {
  id?: string;
  name: string;
  quantitySold: number;
  revenue: number;
  relativePercentage: number;
  color?: string;
}

export type OrderStatusType = 'completed' | 'pending' | 'preparing' | 'cancelled' | 'paid';

export interface RecentOrderSummary {
  id: string;
  shortId?: string;
  created_at: string;
  timeFormatted: string;
  total: number;
  status: OrderStatusType;
  paymentMethod?: string;
  itemsCount?: number;
}

export interface SellerPerformance {
  id?: string;
  name: string;
  totalSales: number;
  ordersCount: number;
  trendSparkline?: number[];
  avatarUrl?: string;
}

export interface OperationsData {
  topProducts?: TopProductItem[];
  recentOrders?: RecentOrderSummary[];
  topSellers?: SellerPerformance[];
}

export interface V2DashboardFullData {
  kpis: KpiRibbonData;
  charts: AnalyticalChartsData;
  operations: OperationsData;
  lastUpdated?: string;
}
