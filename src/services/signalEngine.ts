import { StockData, Recommendation, SignalStatus, SignalReasoning, ExecutionPlan, InstitutionalIntent, MarketRegime } from '../types';

export const calculateRecommendation = (stock: StockData, marketRegime: MarketRegime = 'NEUTRAL'): Recommendation => {
    // 1. INTRADAY STRENGTH (35%)
    const priceVsVwap = stock.price > stock.vwap ? 20 : -10;
    const rsVsNifty = stock.relativeStrengthVsNifty > 1.2 ? 15 : stock.relativeStrengthVsNifty > 1 ? 5 : -5;
    const intradayStrength = Math.max(0, priceVsVwap + rsVsNifty);

    // 2. VOLUME ACCELERATION (30%)
    const volumeAccelerationScore = stock.volumeAcceleration >= 3 ? 30 : stock.volumeAcceleration >= 1.5 ? 15 : 0;

    // 3. SECTOR ALIGNMENT (20%)
    const sectorAlignmentScore = stock.sectorStrength > 5 ? 20 : stock.sectorStrength > 0 ? 10 : -10;

    // 4. MARKET CONDITION (15%)
    const marketConditionScore = marketRegime === 'RISK_ON' ? 15 : marketRegime === 'RISK_OFF' ? -15 : 5;

    let totalScore = intradayStrength + volumeAccelerationScore + sectorAlignmentScore + marketConditionScore;

    // DEFENSIVE CAPS (INSTITUTIONAL RULES)
    if (stock.sectorStrength < 0) totalScore = Math.min(totalScore, 50); // Hard cap if sector is weak
    if (marketRegime === 'RISK_OFF') totalScore = Math.min(totalScore, 40); // Hard cap if macro is crashing
    if (stock.price < stock.vwap) totalScore = Math.min(totalScore, 30); // Hard cap if below VWAP

    // INSTITUTIONAL INTENT CLASSIFICATION
    let intent: InstitutionalIntent = 'NO_FOOTPRINT';
    if (stock.price > stock.vwap && stock.volumeAcceleration > 2) intent = 'ACCUMULATION';
    else if (stock.price < stock.vwap && stock.volumeAcceleration > 2) intent = 'DISTRIBUTION';
    else if (Math.abs(stock.changePercent) < 0.2 && stock.volume > stock.avgVolume20d) intent = 'NEUTRAL';

    // SIGNAL DETERMINATION
    let status = SignalStatus.IGNORE;
    if (totalScore >= 75 && intent === 'ACCUMULATION') status = SignalStatus.BUY;
    else if (totalScore <= 30 || intent === 'DISTRIBUTION') status = SignalStatus.SELL;
    else if (totalScore >= 50) status = SignalStatus.HOLD;

    const execution: ExecutionPlan = {
        buyZone: { min: Number((stock.vwap * 0.998).toFixed(2)), max: Number((stock.vwap * 1.01).toFixed(2)) },
        idealEntry: Number((stock.vwap * 1.002).toFixed(2)),
        stopLoss: Number((stock.price * 0.975).toFixed(2)),
        targets: [Number((stock.price * 1.025).toFixed(2)), Number((stock.price * 1.05).toFixed(2))],
        invalidationLevel: Number((stock.vwap * 0.99).toFixed(2)),
        timeBasedExit: "3:15 PM IST"
    };

    const reasoning: SignalReasoning = {
        intradayStrength,
        volumeAcceleration: volumeAccelerationScore,
        sectorAlignment: sectorAlignmentScore,
        marketCondition: marketConditionScore,
        institutionalIntent: intent
    };

    const aiCommentary = status === SignalStatus.BUY
        ? `INSTITUTIONAL BUY: Absorption at VWAP confirmed. Sector tailwind strong.`
        : status === SignalStatus.SELL
            ? `DISTRIBUTION ALERT: Aggressive selling below VWAP. Institutional exit in progress.`
            : `NO TRADE: Sentiment conflict or range-bound noise. Waiting for truth.`;

    return {
        status,
        convictionScore: Math.max(0, totalScore),
        reasoning,
        execution,
        differentiation: `${stock.symbol} is reflecting ${intent} behavior vs ${stock.sector} sector strength of ${stock.sectorStrength}.`,
        aiCommentary,
        timestamp: new Date().toISOString()
    };
};
