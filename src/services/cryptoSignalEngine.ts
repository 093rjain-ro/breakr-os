import {
    CryptoAsset,
    CryptoMarketData,
    CryptoRecommendation,
    CryptoRegime,
    SignalStatus,
    PriceValidationResult,
    ExecutionPlan,
    CryptoSignalReasoning
} from '../types';

// 1. PRICE AUTHORITY VALIDATION LAYER
export const validateCryptoData = (asset: CryptoAsset): PriceValidationResult => {
    const timestamp = new Date().toISOString();

    // A. Multi-Exchange Validation
    const prices = [asset.binancePrice, asset.coinbasePrice, asset.bybitPrice].filter(p => p > 0);

    if (prices.length < 2) {
        if (prices.length === 0) {
            return { isValidated: false, errorCode: 'FEED_LATENCY_HIGH', dataSource: 'OFFICIAL_EXCHANGE_FEED', lastValidatedTimestamp: timestamp };
        }
    }

    if (prices.length >= 2) {
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        const maxDev = Math.max(...prices.map(p => Math.abs((p - avgPrice) / avgPrice)));

        if (maxDev > 0.008) { // 0.8% reject
            return { isValidated: false, errorCode: 'PRICE_VALIDATION_FAILED', dataSource: 'OFFICIAL_EXCHANGE_FEED', lastValidatedTimestamp: timestamp };
        }
    }

    // B. Timestamp Freshness
    const dataTime = new Date(asset.timestampUtc).getTime();
    const now = Date.now();
    // Allow 60s drift
    if (Math.abs(now - dataTime) > 60000) {
        return { isValidated: false, errorCode: 'FEED_LATENCY_HIGH', dataSource: 'OFFICIAL_EXCHANGE_FEED', lastValidatedTimestamp: timestamp };
    }

    return { isValidated: true, dataSource: 'OFFICIAL_EXCHANGE_FEED', lastValidatedTimestamp: timestamp };
};

// 2. CRYPTO REGIME DETECTION
export const detectCryptoRegime = (market: CryptoMarketData): CryptoRegime => {
    if (market.btcAtrPercentile > 75 || market.cryptoVolatilityIndexPercentile > 70) {
        return 'HIGH_VOLATILITY';
    }
    if (market.btcAtrPercentile >= 50 && market.btcAtrPercentile <= 75) {
        return 'TRENDING';
    }
    if (market.btcAtrPercentile < 45) {
        return 'RANGE_BOUND';
    }
    return 'TRANSITIONAL';
};

// 3. ADAPTIVE SIGNAL WEIGHTS & 5. SIGNAL GENERATION
export const calculateCryptoSignal = (asset: CryptoAsset, market: CryptoMarketData): CryptoRecommendation => {
    const regime = detectCryptoRegime(market);

    // Metrics Calculation
    const rvol = asset.volume24h / asset.avg30dVolume;
    const priceVsVwapPercent = ((asset.ltp - asset.vwap) / asset.vwap) * 100;

    // Scores (0-100 normalized)

    // Momentum: Proxy using price vs VWAP and recent history if available (simplified here)
    const momentumScore = priceVsVwapPercent > 0.5 ? 80 : priceVsVwapPercent < -0.5 ? 20 : 50;

    // OI Shift: 
    let oiShiftScore = 50;
    if (asset.openInterestChangePercent > 3) {
        if (asset.ltp > asset.vwap) oiShiftScore = 85; // Long build up
        else oiShiftScore = 15; // Short build up
    } else if (asset.openInterestChangePercent < -3) {
        oiShiftScore = 40; // Unwinding
    }

    // Volume: RVOL > 3 is strong
    const volumeScore = rvol > 3 ? 100 : rvol > 1.5 ? 75 : rvol > 1 ? 60 : 30;

    // VWAP Position:
    const vwapScore = Math.abs(priceVsVwapPercent) < 1 ? 80 : 40; // Near VWAP is good for entry

    // Mean Reversion:
    const meanReversionScore = Math.abs(priceVsVwapPercent) > 5 ? 90 : 20; // Extreme deviation implies reversion

    let weightedScore = 0;

    if (regime === 'TRENDING') {
        weightedScore = (momentumScore * 0.30) + (oiShiftScore * 0.25) + (volumeScore * 0.20) + (vwapScore * 0.15) + (meanReversionScore * 0.10);
    } else if (regime === 'RANGE_BOUND') {
        weightedScore = (meanReversionScore * 0.30) + (vwapScore * 0.20) + (volumeScore * 0.20) + (momentumScore * 0.15) + (oiShiftScore * 0.15);
    } else if (regime === 'HIGH_VOLATILITY') {
        weightedScore = (volumeScore * 0.30) + (oiShiftScore * 0.25) + (momentumScore * 0.15) + (vwapScore * 0.15) + (meanReversionScore * 0.15);
        weightedScore *= 0.75; // Reduce conviction by 25%
    } else { // Transitional
        weightedScore = (momentumScore + oiShiftScore + volumeScore + vwapScore + meanReversionScore) / 5;
    }

    // Adjustments
    if (asset.fundingRate > 0.01 || asset.fundingRate < -0.01) weightedScore -= 10; // Crowded funding condition

    let status = SignalStatus.IGNORE;
    if (weightedScore >= 65) status = SignalStatus.BUY;
    else if (weightedScore <= 35) status = SignalStatus.SELL;
    else status = SignalStatus.HOLD;

    // 6. RISK ENGINE
    const atr = asset.atr;
    const stopLoss = status === SignalStatus.BUY ? asset.vwap - atr : asset.vwap + atr;
    const target1 = status === SignalStatus.BUY ? asset.ltp + (2 * atr) : asset.ltp - (2 * atr);

    const execution: ExecutionPlan = {
        buyZone: { min: asset.vwap * 0.99, max: asset.vwap * 1.01 },
        idealEntry: asset.vwap,
        stopLoss: Number(stopLoss.toFixed(2)),
        targets: [Number(target1.toFixed(2))],
        invalidationLevel: stopLoss,
        timeBasedExit: "24H"
    };

    const reasoning: CryptoSignalReasoning = {
        momentumScore,
        oiShiftScore,
        volumeScore,
        vwapScore,
        meanReversionScore,
        regime
    };

    const aiCommentary = `Regime: ${regime}. RVOL: ${rvol.toFixed(2)}. Funding: ${asset.fundingRate}.`;

    return {
        status,
        convictionScore: Math.round(Math.max(0, Math.min(100, weightedScore))),
        aiCommentary,
        execution,
        reasoning,
        timestamp: new Date().toISOString()
    };
};
