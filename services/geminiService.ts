
import { GoogleGenAI, Type } from "@google/genai";
import { StockData, Recommendation, MarketIntelligence, BreakingNewsItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getDetailedAIInsight(stock: StockData, rec: Recommendation): Promise<string> {
  try {
    const prompt = `
      Act as an Elite Hedge Fund Strategist. 
      Analyze the decision state for ${stock.companyName} (${stock.symbol}).
      Price: ₹${stock.price}
      Signal: ${rec.status} (Conviction: ${rec.convictionScore}/100)
      Provide 2 punchy, data-backed sentences explaining the "Decision Alpha" that charts don't show.
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Scanning institutional nodes...";
  } catch (error) {
    return "Institutional data feed offline.";
  }
}

export async function getMarketIntelligence(): Promise<MarketIntelligence> {
  try {
    const prompt = `
      Search for Indian Stock Market (NSE/BSE) Pre-Market Intelligence.
      Focus on GIFT Nifty, global cues, and major earnings.
      Summarize into a punchy "War Room" briefing. 
      Include a "Battle Bias" (Bullish/Bearish).
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });
    const news = response.text || "Intelligence feed pending...";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.map((c: any) => ({
      title: c.web?.title || "Market Source",
      uri: c.web?.uri || "#"
    })).filter((s: any) => s.uri !== "#");
    const outlook = news.toLowerCase().includes('bull') ? "BULLISH" : news.toLowerCase().includes('bear') ? "BEARISH" : "NEUTRAL";
    return { news, outlook, ipoAlerts: [], sources };
  } catch (error) {
    return { news: "Error fetching live intelligence.", outlook: "CAUTION", ipoAlerts: [], sources: [] };
  }
}

export async function getLiveBreakingNews(): Promise<BreakingNewsItem[]> {
  try {
    const prompt = `
      Fetch the top 5 REAL-TIME breaking news items for the Indian Stock Market (NSE/BSE) occurring in the last 2 hours.
      Focus on: Corporate announcements, SEBI news, macro events, or heavy volume sector news.
      Format specifically as a JSON array:
      [
        {
          "id": "unique_string",
          "title": "Short punchy headline",
          "summary": "1 sentence detail",
          "time": "HH:MM",
          "impact": "HIGH|MEDIUM|LOW",
          "source": "Source Name",
          "url": "full_link"
        }
      ]
    `;
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      },
    });
    
    // Safety check for empty or malformed response
    const text = response.text.trim();
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Breaking news fetch error:", error);
    return [];
  }
}
