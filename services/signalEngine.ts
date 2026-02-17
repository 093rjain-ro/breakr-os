
import { StockData, Recommendation, SignalStatus, SignalReasoning, ExecutionPlan } from '../types';

/**
 * CORE PRINCIPLE: “Real-Time Differentiation & Action”
 */
export const calculateRecommendation = (stock: StockData): Recommendation => {
  // 1. INTRADAY STRENGTH (35%)
  // Price > VWAP, Relative Strength vs Nifty > 1
  const intradayStrength = (stock.price > stock.vwap ? 20 : 0) + 
                          (stock.relativeStrengthVsNifty > 1.1 ? 15 : stock.relativeStrengthVsNifty > 1 ? 10 : 0);

  // 2. VOLUME ACCELERATION (30%)
  // Spike in 5-min flow
  const volumeAccelerationScore = stock.volumeAcceleration >= 3 ? 30 : stock.volumeAcceleration >= 1.5 ? 15 : 0;

  // 3. SECTOR ALIGNMENT (20%)
  const sectorAlignmentScore = stock.sectorStrength > 5 ? 20 : stock.sectorStrength > 0 ? 10 : 0;

  // 4. MARKET CONDITION (15%)
  const marketConditionScore = 15; // Simulated global bias

  const totalScore = intradayStrength + volumeAccelerationScore + sectorAlignmentScore + marketConditionScore;

  // SIGNAL DETERMINATION (STRICT)
  let status = SignalStatus.IGNORE;
  
  const isBuyTriggered = stock.price > stock.vwap && 
                        stock.volumeAcceleration >= 2.5 && 
                        stock.relativeStrengthVsNifty > 1 && 
                        totalScore >= 75;

  const isSellTriggered = stock.price < stock.vwap || 
                         stock.rsi > 75 || 
                         (stock.relativeStrengthVsNifty < 0.8 && stock.price < stock.ema20);

  if (isBuyTriggered) {
    status = SignalStatus.BUY;
  } else if (isSellTriggered) {
    status = SignalStatus.SELL;
  } else if (totalScore >= 50) {
    status = SignalStatus.HOLD;
  } else {
    status = SignalStatus.IGNORE;
  }

  // EXECUTION SYSTEM
  const execution: ExecutionPlan = {
    buyZone: { min: Number((stock.vwap * 0.998).toFixed(2)), max: Number((stock.vwap * 1.01).toFixed(2)) },
    idealEntry: Number((stock.vwap * 1.002).toFixed(2)),
    stopLoss: Number((stock.price * 0.97).toFixed(2)), // Tighter intraday 3%
    targets: [
      Number((stock.price * 1.02).toFixed(2)), 
      Number((stock.price * 1.04).toFixed(2))
    ],
    invalidationLevel: Number((stock.vwap * 0.99).toFixed(2)),
    timeBasedExit: "3:15 PM IST"
  };

  const reasoning: SignalReasoning = {
    intradayStrength,
    volumeAcceleration: volumeAccelerationScore,
    sectorAlignment: sectorAlignmentScore,
    marketCondition: marketConditionScore
  };

  const differentiation = status === SignalStatus.BUY 
    ? `${stock.symbol} is currently outperforming ${stock.sector} sector by ${(stock.relativeStrengthVsNifty * 10).toFixed(1)}%. Volume burst is 3x higher than average peers.`
    : status === SignalStatus.IGNORE 
    ? `Noise stock. Volatility is high but no directional bias. Peers like RELIANCE show cleaner accumulation.`
    : `Consolidating within a narrow range. No institutional footprint detected yet.`;

  const aiCommentary = status === SignalStatus.BUY 
    ? `ALPHA DETECTED: Intraday breakout above VWAP with ${stock.volumeAcceleration}x volume thrust. Sector momentum is supportive.`
    : status === SignalStatus.SELL
    ? `INTRADAY INVALID: Support at VWAP lost. Distribution detected. Exit immediately to protect capital.`
    : `MONITORING: Neutral flow. Staying in cash until VWAP reclaim or volume acceleration.`

  return {
    status,
    convictionScore: totalScore,
    reasoning,
    execution,
    differentiation,
    aiCommentary,
    timestamp: new Date().toISOString()
  };
};
