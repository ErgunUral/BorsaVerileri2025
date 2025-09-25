export interface FinancialData {
  stockCode: string;
  companyName: string;
  period: string;
  currentAssets: number;
  shortTermLiabilities: number;
  longTermLiabilities: number;
  cashAndEquivalents: number;
  financialInvestments: number;
  financialDebts: number;
  totalAssets: number;
  totalLiabilities: number;
  ebitda: number;
  netProfit: number;
  equity: number;
  paidCapital: number;
  lastUpdated: Date;
}

export interface StockPrice {
  stockCode: string;
  price: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  close: number;
  timestamp: string;
  source: string;
}

export interface MarketSummary {
  totalVolume: number;
  totalValue: number;
  gainers: number;
  losers: number;
  unchanged: number;
  timestamp: string;
  source: string;
}