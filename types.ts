
export enum SignalStatus {
  BUY = 'BUY NOW',
  SELL = 'EXIT NOW',
  HOLD = 'WAIT/HOLD',
  IGNORE = 'IGNORE'
}

export type MarketCapCategory = 'Large' | 'Mid' | 'Small';
export type Exchange = 'NSE' | 'BSE';
export type Series = 'EQ' | 'BE' | 'SME';

export interface PriceValidationResult {
  isValidated: boolean;
  errorCode?: 'PRICE_VALIDATION_FAILED' | 'ISIN_MISMATCH' | 'EXCHANGE_MISMATCH';
  dataSource: 'OFFICIAL_EXCHANGE_FEED';
  lastValidatedTimestamp: string;
}

export interface StockData {
  symbol: string;
  companyName: string; // Official Exchange Name
  isin: string;
  exchange: Exchange;
  series: Series;
  sector: string;
  industry: string;
  marketCapCategory: MarketCapCategory;
  indices: string[];
  active: boolean;
  
  // Real-time metrics (LTP Standard)
  price: number; // LTP
  openingPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume20d: number;
  deliveryPercent: number;
  rsi: number;
  ema20: number;
  ema50: number;
  ema200: number;
  vwap: number;
  intradayHigh: number;
  intradayLow: number;
  relativeStrengthVsNifty: number;
  volumeAcceleration: number;
  sectorStrength: number;
  debtToEquity: number;
  roe: number;
  fiiFlow: number; 
  diiFlow: number; 
  marketCap: number; // In Crores
  validation?: PriceValidationResult;
}

export interface ExecutionPlan {
  buyZone: { min: number; max: number };
  idealEntry: number;
  stopLoss: number;
  targets: number[];
  invalidationLevel: number;
  timeBasedExit: string;
}

export interface SignalReasoning {
  intradayStrength: number;
  volumeAcceleration: number;
  sectorAlignment: number;
  marketCondition: number;
}

export interface Recommendation {
  status: SignalStatus;
  convictionScore: number;
  differentiation: string; 
  aiCommentary: string;
  execution: ExecutionPlan;
  reasoning: SignalReasoning;
  timestamp?: string;
}

export interface StockWithRecommendation extends StockData {
  recommendation: Recommendation;
}

export interface BreakingNewsItem {
  id: string;
  title: string;
  summary: string;
  time: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  source: string;
  url: string;
}

export interface MarketIntelligence {
  news: string;
  outlook: string;
  ipoAlerts: string[];
  sources: { title: string, uri: string }[];
}

export interface UniverseStats {
  totalNSE: number;
  totalBSE: number;
  indexCounts: Record<string, number>;
}
