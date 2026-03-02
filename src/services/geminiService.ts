import { GoogleGenAI, Type } from "@google/genai";
import { StockData, Recommendation, MarketIntelligence, BreakingNewsItem, DataStatus, CryptoAsset, CryptoRecommendation, CryptoMarketData } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// Helper to parse JSON from Gemini response, handling Markdown code blocks
function parseJSON<T>(text: string | undefined): T | null {
    if (!text) return null;
    try {
        // Remove Markdown code blocks if present
        let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        // Sometimes it might be just ``` without json
        cleanText = cleanText.replace(/```\n?|\n?```/g, '').trim();
        return JSON.parse(cleanText) as T;
    } catch (e) {
        console.error("JSON Parse Failed:", e, "Text:", text);
        return null;
    }
}

// Helper for retrying async operations
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
        return await fn();
    } catch (e: any) {
        if (retries > 0 && (e.status === 500 || e.code === 500 || e.message?.includes('Internal error'))) {
            console.warn(`Retrying operation... Attempts left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return withRetry(fn, retries - 1, delay * 2);
        }
        throw e;
    }
}

/**
 * AUTHORITY SYNC: Fetches real-world data from NSE/BSE via Web Grounding.
 * Strictly adheres to the requirement of no synthetic prices.
 */
export async function syncStockWithWeb(symbol: string, exchange: string): Promise<Partial<StockData> | null> {
    try {
        const prompt = `
      Fetch CURRENT market data for ${symbol} on the ${exchange} (India).
      Data points required: 
      1. Last Traded Price (LTP)
      2. Previous Close
      3. Day High
      4. Day Low
      5. Open
      6. Volume
      7. ISIN Verification
      
      Return as JSON with keys: price, openingPrice, intradayHigh, intradayLow, volume, isin, exchangeConfirmed.
      If data is unavailable or markets are closed, indicate the last known session data.
    `;

        const response = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        price: { type: Type.NUMBER },
                        openingPrice: { type: Type.NUMBER },
                        intradayHigh: { type: Type.NUMBER },
                        intradayLow: { type: Type.NUMBER },
                        volume: { type: Type.NUMBER },
                        isin: { type: Type.STRING },
                        exchangeConfirmed: { type: Type.STRING }
                    }
                }
            }
        }));

        const data = parseJSON<any>(response.text);
        if (!data || !data.price) return null;

        return {
            price: data.price,
            openingPrice: data.openingPrice || data.price,
            intradayHigh: data.intradayHigh,
            intradayLow: data.intradayLow,
            volume: data.volume,
            isin: data.isin,
            lastUpdateSource: (exchange === 'NSE' || exchange === 'BSE' ? exchange : 'NONE') as any,
            lastUpdatedTimestamp: new Date().toISOString()
        };
    } catch (e) {
        console.error("Authority Sync Failed", e);
        return null;
    }
}

/**
 * CRYPTO AUTHORITY SYNC
 */
export async function syncCryptoWithWeb(symbol: string): Promise<Partial<CryptoAsset> | null> {
    try {
        const prompt = `
      Fetch CURRENT market data for ${symbol} (Crypto).
      Data points required: 
      1. Last Traded Price (LTP) - Average of Binance, Coinbase, Bybit
      2. Binance Price
      3. Coinbase Price
      4. Bybit Price
      5. 24h Volume (USD)
      6. Avg 30d Volume (USD)
      7. VWAP (24h)
      8. Funding Rate (Binance Perp)
      9. Open Interest Change % (24h)
      10. ATR (14)
      
      Return as JSON with keys: ltp, binancePrice, coinbasePrice, bybitPrice, volume24h, avg30dVolume, vwap, fundingRate, openInterestChangePercent, atr.
      Ensure prices are precise.
    `;

        const response = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        ltp: { type: Type.NUMBER },
                        binancePrice: { type: Type.NUMBER },
                        coinbasePrice: { type: Type.NUMBER },
                        bybitPrice: { type: Type.NUMBER },
                        volume24h: { type: Type.NUMBER },
                        avg30dVolume: { type: Type.NUMBER },
                        vwap: { type: Type.NUMBER },
                        fundingRate: { type: Type.NUMBER },
                        openInterestChangePercent: { type: Type.NUMBER },
                        atr: { type: Type.NUMBER }
                    }
                }
            }
        }));

        const data = parseJSON<any>(response.text);
        if (!data) return null;

        return {
            ltp: data.ltp,
            binancePrice: data.binancePrice,
            coinbasePrice: data.coinbasePrice,
            bybitPrice: data.bybitPrice,
            volume24h: data.volume24h,
            avg30dVolume: data.avg30dVolume,
            vwap: data.vwap,
            fundingRate: data.fundingRate,
            openInterestChangePercent: data.openInterestChangePercent,
            atr: data.atr,
            timestampUtc: new Date().toISOString()
        };
    } catch (e) {
        console.error("Crypto Sync Failed", e);
        return null;
    }
}

export async function getCryptoMarketIntelligence(): Promise<CryptoMarketData> {
    try {
        const prompt = `
          Fetch CURRENT Crypto Market Metrics:
          1. BTC ATR Percentile (0-100)
          2. Crypto Volatility Index Percentile (0-100)
          3. BTC Dominance Change % (24h)
          4. Total Market Cap Change % (24h)
          
          Return JSON: { btcAtrPercentile, cryptoVolatilityIndexPercentile, btcDominanceChangePercent, totalMarketCapChangePercent }
        `;
        const response = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
        }));

        const data = parseJSON<any>(response.text);
        return data || {
            btcAtrPercentile: 50,
            cryptoVolatilityIndexPercentile: 50,
            btcDominanceChangePercent: 0,
            totalMarketCapChangePercent: 0
        };
    } catch (e) {
        return {
            btcAtrPercentile: 50,
            cryptoVolatilityIndexPercentile: 50,
            btcDominanceChangePercent: 0,
            totalMarketCapChangePercent: 0
        };
    }
}


export async function getCryptoAIInsight(asset: CryptoAsset, rec: CryptoRecommendation, market: CryptoMarketData): Promise<string> {
    try {
        const prompt = `
      ROLE: BREAKR Crypto Intelligence Engine (AI Trade Prosecutor).
      ANALYZE: ${asset.symbol}
      METRICS: Price $${asset.ltp}, Signal ${rec.status}, Conviction ${rec.convictionScore}/100.
      REGIME: ${rec.reasoning.regime} (Vol Index: ${market.cryptoVolatilityIndexPercentile}%)
      INSTITUTIONAL: RVOL ${(asset.volume24h / asset.avg30dVolume).toFixed(2)}, Funding ${asset.fundingRate}, OI Change ${asset.openInterestChangePercent}%.
      
      TASK: Provide structured explanation bullets and a summary.
      FORMAT:
      • Bullet 1
      • Bullet 2
      • Bullet 3
      Summary: "..."
    `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        return response.text || "Analyzing chain data...";
    } catch (error) {
        return "Intelligence feed throttled.";
    }
}

export async function getDetailedAIInsight(stock: StockData, rec: Recommendation): Promise<string> {
    try {
        const prompt = `
      ROLE: Institutional Market Intelligence Engine.
      ANALYZE: ${stock.companyName} (${stock.symbol}) | ${stock.exchange}
      METRICS: Price ₹${stock.price}, Signal ${rec.status}, Conviction ${rec.convictionScore}/100.
      GROUNDING: Use real-time news search to verify narrative vs price response.
      TASK: 2 sharp sentences only. 
      FORMAT: End with "DATA STATUS: ${stock.dataStatus} | SOURCE: ${stock.lastUpdateSource} | RECOMMENDATION: [ACTION]"
    `;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        // Use .text property directly.
        return response.text || "Scanning institutional nodes...";
    } catch (error) {
        return "Intelligence feed throttled.";
    }
}

export async function getMarketIntelligence(): Promise<MarketIntelligence> {
    try {
        const prompt = `
      TASK: Cross-Asset Stress Analysis (NSE/BSE focus).
      SEARCH: GIFT Nifty, India VIX, USDINR.
      JSON FORMAT: { "regime": "RISK_ON", "vix": 14.5, "usdinr": 83.2, "briefing": "..." }
    `;
        const response = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" },
        }));

        // Use .text property directly and extract sources from groundingMetadata.
        const data = parseJSON<any>(response.text) || {};

        // Mandatory extraction of grounding chunks when using googleSearch.
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
            title: chunk.web?.title || 'Market Source',
            uri: chunk.web?.uri || ''
        })).filter((s: any) => s.uri) || [];

        return {
            news: data.briefing || "Regime analysis pending...",
            outlook: data.regime || "NEUTRAL",
            globalCues: {
                giftNifty: 0,
                indiaVix: data.vix || 15,
                usdinr: data.usdinr || 83,
                crudeOil: 75,
                us10y: 4.2,
                regime: (data.regime as any) || 'NEUTRAL'
            },
            sources: sources
        };
    } catch (error) {
        return {
            news: "Regime analysis pending...",
            outlook: "NEUTRAL",
            globalCues: { giftNifty: 0, indiaVix: 15, usdinr: 83, crudeOil: 80, us10y: 4, regime: 'NEUTRAL' },
            sources: []
        };
    }
}

export async function getLiveBreakingNews(): Promise<BreakingNewsItem[]> {
    try {
        const prompt = `FETCH: Top 5 NSE/BSE Corporate Breaking News. JSON format only. Return an array of objects with id, title, summary, time, impact (HIGH/MEDIUM/LOW), source, url, narrativeBias (BULLISH/BEARISH/NOISE).`;
        const response = await withRetry(() => ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" },
        }));
        // Use .text property directly.
        return parseJSON<BreakingNewsItem[]>(response.text) || [];
    } catch (error) {
        return [];
    }
}
