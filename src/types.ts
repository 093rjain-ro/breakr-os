// --- CORE DOMAIN TYPES ---
export type MarketRegime = 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
export type SectorStrength = number; // -10 to +10

export enum DataStatus {
    UNAVAILABLE = 'UNAVAILABLE',       // No data feed available
    STALE_CACHE = 'STALE_CACHE',       // Using cached data (sync failed)
    VALIDATED_LIVE = 'VALIDATED_LIVE', // Successful authority sync
}

export interface StockData {
    symbol: string;
    companyName: string;
    isin: string; // Crucial for unique identification across exchanges
    exchange: 'NSE' | 'BSE';
    series: 'EQ' | 'BE' | string;
    sector: string;
    industry: string;
    marketCapCategory: 'Large' | 'Mid' | 'Small' | 'Micro';
    indices: string[]; // e.g., NIFTY 50, NIFTY BANK
    active: boolean;

    // Pricing (Authoritative intent)
    price: number;
    openingPrice: number;
    change: number;
    changePercent: number;

    // Volume & Institutional Footprint
    volume: number;
    avgVolume20d: number;
    deliveryPercent: number; // Important NSE metric

    // Technicals
    rsi: number;
    ema20: number;
    ema50: number;
    ema200: number;
    vwap: number;
    intradayHigh: number;
    intradayLow: number;

    // Custom BREAKR Proprietary Metrics (Institutional Engine)
    relativeStrengthVsNifty: number; // RS compared to benchmark
    volumeAcceleration: number;      // Current Vol vs Time-of-Day Avg Vol
    sectorStrength: SectorStrength;

    // Fundamentals (Lightweight for context)
    debtToEquity: number;
    roe: number;

    // Institutional Flows
    fiiFlow: number; // Net FII action in this stock (approximated/simulated if live block unavailable)
    diiFlow: number; // Net DII action

    marketCap: number; // In Crores INR

    // Traceability & Metadata required for "No Fake Data" prompt requirement
    lastUpdateSource: 'NSE_WEB' | 'BSE_WEB' | 'CACHE' | 'NONE';
    dataStatus: DataStatus;
    lastUpdatedTimestamp: string;
}

export enum SignalStatus {
    BUY = 'BUY',
    SELL = 'SELL',
    HOLD = 'HOLD',
    IGNORE = 'IGNORE' // Noise filtering active
}

export type InstitutionalIntent = 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' | 'NO_FOOTPRINT';

export interface SignalReasoning {
    intradayStrength: number;
    volumeAcceleration: number;
    sectorAlignment: number;
    marketCondition: number;
    institutionalIntent: InstitutionalIntent;
}

export interface ExecutionPlan {
    buyZone: { min: number; max: number };
    idealEntry: number;
    stopLoss: number;
    targets: number[];
    invalidationLevel: number;
    timeBasedExit: string; // e.g. "3:15 PM IST"
}

export interface Recommendation {
    status: SignalStatus;
    convictionScore: number; // 0-100
    reasoning: SignalReasoning;
    execution: ExecutionPlan;
    differentiation: string; // Explains 'Why' this trade matters
    aiCommentary: string; // LLM generated short sentence
    timestamp: string;
}

export interface StockWithRecommendation {
    stock: StockData;
    recommendation: Recommendation;
}

export interface PriceValidationResult {
    isValidated: boolean;
    errorCode?: 'FEED_LATENCY_HIGH' | 'PRICE_VALIDATION_FAILED' | 'ISIN_MISMATCH';
    dataSource: 'OFFICIAL_EXCHANGE_FEED' | 'THIRD_PARTY_STALE' | 'MOCK';
    lastValidatedTimestamp: string;
}

export interface MarketIntelligence {
    news: string;
    outlook: 'RISK_ON' | 'NEUTRAL' | 'RISK_OFF';
    globalCues: {
        giftNifty: number;
        indiaVix: number;
        usdinr: number;
        crudeOil: number;
        us10y: number;
        regime: MarketRegime;
    };
    sources: { title: string; uri: string }[];
}


export interface BreakingNewsItem {
    id: string;
    title: string;
    summary: string;
    time: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    source: string;
    url: string;
    narrativeBias: 'BULLISH' | 'BEARISH' | 'NOISE';
}

// --- CRYPTO TYPES ---
export type CryptoRegime = 'TRENDING' | 'RANGE_BOUND' | 'HIGH_VOLATILITY' | 'TRANSITIONAL';

export interface CryptoMarketData {
    btcAtrPercentile: number; // 0-100, measures current volatility vs history
    cryptoVolatilityIndexPercentile: number;
    btcDominanceChangePercent: number;
    totalMarketCapChangePercent: number;
}

export interface CryptoAsset {
    symbol: string;
    name: string;
    // Multi-exchange pricing for authority validation
    ltp: number;
    binancePrice: number;
    coinbasePrice: number;
    bybitPrice: number;

    // Market dynamics
    volume24h: number; // in USD
    avg30dVolume: number;
    vwap: number;

    // Derivatives setup (Institutional focus)
    fundingRate: number; // Binance perpetual funding rate
    openInterestChangePercent: number; // 24h change

    // Risk metrics
    atr: number; // Average True Range (14 period)

    timestampUtc: string;
    active: boolean;
    dataStatus: DataStatus;
}

export interface CryptoSignalReasoning {
    momentumScore: number;
    oiShiftScore: number;
    volumeScore: number;
    vwapScore: number;
    meanReversionScore: number;
    regime: CryptoRegime;
}

export interface CryptoRecommendation {
    status: SignalStatus;
    convictionScore: number; // 0-100
    aiCommentary: string;
    execution: ExecutionPlan;
    reasoning: CryptoSignalReasoning;
    timestamp: string;
}

export interface CryptoAssetWithRecommendation {
    asset: CryptoAsset;
    recommendation: CryptoRecommendation;
}
