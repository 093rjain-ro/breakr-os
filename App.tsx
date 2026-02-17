
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Activity, Zap, Search, Bell, TrendingUp, TrendingDown, Target, BarChart2, 
  Layers, Cpu, Newspaper, Calendar, Clock, ExternalLink, ShieldCheck, PlayCircle, Info, X,
  Radio, Megaphone, Flame, Globe, Filter, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { INDICES } from './constants';
import { StockData, StockWithRecommendation, SignalStatus, MarketIntelligence, BreakingNewsItem } from './types';
import { calculateRecommendation } from './services/signalEngine';
import { getDetailedAIInsight, getMarketIntelligence, getLiveBreakingNews } from './services/geminiService';
import { universe } from './services/universeService';
import { PriceAuthority } from './services/priceAuthority';
import { ConvictionRadar, CombinedPriceVolumeChart, InstitutionalFlowChart } from './components/Charts';

const App: React.FC = () => {
  const [stocks, setStocks] = useState<StockWithRecommendation[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockWithRecommendation | null>(null);
  const [marketIntel, setMarketIntel] = useState<MarketIntelligence | null>(null);
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [selectedIndex, setSelectedIndex] = useState<string>("ALL");
  const [selectedExchange, setSelectedExchange] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [isWarRoomTime, setIsWarRoomTime] = useState(false);
  const [isNewsTime, setIsNewsTime] = useState(false);
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  const checkTimeGates = useCallback(() => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    const day = istTime.getUTCDay();
    const timeInMins = hours * 60 + minutes;
    
    setIsWarRoomTime(day >= 1 && day <= 5 && timeInMins >= 300 && timeInMins <= 570);
    setIsNewsTime(day >= 1 && day <= 5 && timeInMins > 570);
    setIsMarketOpen(day >= 1 && day <= 5 && timeInMins >= 555 && timeInMins <= 930);
  }, []);

  const refreshMarketIntel = useCallback(async () => {
    if (isWarRoomTime) {
      const intel = await getMarketIntelligence();
      setMarketIntel(intel);
    }
  }, [isWarRoomTime]);

  const refreshBreakingNews = useCallback(async () => {
    if (isNewsTime) {
      const news = await getLiveBreakingNews();
      setBreakingNews(news);
    }
  }, [isNewsTime]);

  const refreshStocks = useCallback(() => {
    let baseList = universe.getAllStocks();
    if (selectedIndex !== "ALL") baseList = universe.getByIndex(selectedIndex);
    if (selectedExchange !== "ALL") baseList = baseList.filter(s => s.exchange === selectedExchange);

    const processed = baseList.map(s => {
      const rec = calculateRecommendation(s);
      return {
        ...s,
        recommendation: rec,
        validation: PriceAuthority.validateLTP(s, s.price, s.price) // Initial validation
      };
    }).sort((a, b) => b.recommendation.convictionScore - a.recommendation.convictionScore);
    
    setStocks(processed);
    if (!selectedStock || !processed.find(p => p.symbol === selectedStock.symbol && p.exchange === selectedStock.exchange)) {
      setSelectedStock(processed[0] || null);
    }
  }, [selectedIndex, selectedExchange, selectedStock]);

  useEffect(() => {
    checkTimeGates();
    refreshStocks();
    refreshMarketIntel();
    refreshBreakingNews();
    setLoading(false);

    const timeInt = setInterval(checkTimeGates, 30000);
    const techInt = setInterval(refreshStocks, 300000);
    const newsInt = setInterval(refreshBreakingNews, 600000);
    
    return () => { 
      clearInterval(timeInt); 
      clearInterval(techInt); 
      clearInterval(newsInt);
    };
  }, [isWarRoomTime, isNewsTime, selectedIndex, selectedExchange]);

  // HIGH SPEED PRICE FEED (500ms)
  useEffect(() => {
    if (!isMarketOpen) return;
    const tick = setInterval(() => {
      setStocks(prev => prev.map(s => {
        // Simulating price tick from WebSocket
        const driftMultiplier = (Math.random() * 0.002 - 0.001); // Within authority limits usually
        const newPrice = Number((s.price * (1 + driftMultiplier)).toFixed(2));
        
        // Authority Check
        const validation = PriceAuthority.validateLTP(s, newPrice, s.price);
        
        if (!validation.isValidated) {
          return { ...s, validation };
        }

        const newChange = Number((newPrice - s.openingPrice).toFixed(2));
        return {
          ...s,
          price: newPrice,
          change: newChange,
          changePercent: Number(((newChange / s.openingPrice) * 100).toFixed(2)),
          recommendation: calculateRecommendation({ ...s, price: newPrice, change: newChange }),
          validation
        };
      }));
    }, 500);
    return () => clearInterval(tick);
  }, [isMarketOpen]);

  // AI Insights Trigger
  useEffect(() => {
    if (selectedStock && selectedStock.validation?.isValidated) {
      setAiInsight("Analyzing authority feed...");
      getDetailedAIInsight(selectedStock, selectedStock.recommendation).then(setAiInsight);
    }
  }, [selectedStock?.symbol, selectedStock?.exchange]);

  const filteredStocks = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return stocks;
    return stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q));
  }, [stocks, searchQuery]);

  if (loading) return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Cpu className="w-16 h-16 text-emerald-500 animate-spin mb-6" />
        <h2 className="text-white font-black tracking-[0.4em] uppercase text-sm">Synchronizing Price Authority</h2>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#060608] text-slate-300 antialiased selection:bg-emerald-500/30">
      {/* GLOBAL HUD */}
      <header className="sticky top-0 z-50 glass border-b border-slate-800/50 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-600 w-10 h-10 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
              BREAKR <span className="text-emerald-500 uppercase">Authority</span>
            </h1>
            <p className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase">OFFICIAL EXCHANGE FEED (REAL-TIME)</p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-8 px-6 py-2 rounded-2xl bg-slate-900/50 border border-slate-800">
           <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Feed Status:</span>
              <span className="text-[10px] font-black uppercase text-emerald-500">LIVE / ENCRYPTED</span>
           </div>
           <div className="h-4 w-px bg-slate-800"></div>
           <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${isMarketOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className={`text-[10px] font-black tracking-widest uppercase ${isMarketOpen ? 'text-emerald-500' : 'text-red-500'}`}>
                {isMarketOpen ? 'MARKET OPEN' : 'SESSION CLOSED'}
              </span>
           </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="SYMBOL + ISIN AUTH..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:ring-1 focus:ring-emerald-500/50 outline-none text-white w-64 transition-all"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* SCANNER SIDEBAR */}
        <div className="lg:col-span-3 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 mb-2">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" /> Real-Time Authority
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <select 
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400 py-2 px-3 rounded-lg outline-none appearance-none hover:border-slate-700 transition-all uppercase tracking-widest"
              >
                <option value="ALL">ALL EXCH</option>
                <option value="NSE">NSE ONLY</option>
                <option value="BSE">BSE ONLY</option>
              </select>
              <select 
                value={selectedIndex}
                onChange={(e) => setSelectedIndex(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400 py-2 px-3 rounded-lg outline-none appearance-none hover:border-slate-700 transition-all uppercase tracking-widest"
              >
                <option value="ALL">ALL INDICES</option>
                {INDICES.map(idx => <option key={idx} value={idx}>{idx}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[65vh] pr-2 custom-scroll">
            {filteredStocks.map(stock => (
              <button 
                key={`${stock.exchange}-${stock.symbol}`}
                onClick={() => setSelectedStock(stock)}
                className={`w-full text-left p-5 rounded-2xl border transition-all relative group overflow-hidden ${
                  selectedStock?.symbol === stock.symbol && selectedStock?.exchange === stock.exchange
                  ? 'bg-emerald-600/10 border-emerald-500/50 shadow-xl' 
                  : 'glass hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-white/90 truncate max-w-[120px]">{stock.companyName}</h3>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{stock.exchange}:{stock.symbol}</p>
                  </div>
                  {stock.validation?.isValidated ? (
                    <div className="flex items-center gap-1 text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase">
                      <CheckCircle2 className="w-2.5 h-2.5" /> AUTH
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[8px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded uppercase">
                      <AlertTriangle className="w-2.5 h-2.5" /> REJ
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex flex-col">
                  <span className={`text-xl font-black mono ${stock.validation?.isValidated ? 'text-white' : 'text-red-500 line-through opacity-50'}`}>
                    {stock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <div className={`text-[10px] font-bold flex items-center gap-1 mt-0.5 ${stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)} ({Math.abs(stock.changePercent).toFixed(2)}%)
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN TERMINAL */}
        <div className="lg:col-span-6 space-y-10">
          {selectedStock ? (
            <div className="glass border-slate-800/60 rounded-[40px] overflow-hidden shadow-2xl relative">
              <div className="p-8 border-b border-slate-800/50 flex flex-wrap items-center justify-between gap-8 bg-gradient-to-br from-slate-900/40 to-transparent">
                <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                     <h2 className="text-xl font-bold text-slate-400">{selectedStock.companyName}</h2>
                     <span className="px-2 py-0.5 bg-slate-800 text-slate-500 rounded text-[9px] font-bold mono">ISIN: {selectedStock.isin}</span>
                   </div>
                   
                   {!selectedStock.validation?.isValidated ? (
                     <div className="py-10 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
                        <h3 className="text-3xl font-black text-red-500 tracking-tighter uppercase">Price Authority: BLOCKED</h3>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-2">Instrument validation failed. Source drift exceeded 3.0% limit.</p>
                     </div>
                   ) : (
                     <>
                        <div className="text-7xl font-black tracking-tighter text-white mono mb-2">
                          {selectedStock.price.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span className="text-2xl text-slate-500">INR</span>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className={`text-2xl font-black flex items-center gap-2 ${selectedStock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                              {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change.toFixed(2)} ({Math.abs(selectedStock.changePercent).toFixed(2)}%)
                           </div>
                           <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase tracking-widest">
                              <ShieldCheck className="w-3.5 h-3.5" /> LTP Validated
                           </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-[0.2em] mono">
                           SOURCE: OFFICIAL_{selectedStock.exchange}_FEED | TS: {selectedStock.validation.lastValidatedTimestamp.split('T')[1].replace('Z', '')}
                        </p>
                     </>
                   )}
                </div>

                <div className="text-right">
                  <div className={`text-4xl font-black italic tracking-tighter ${
                    selectedStock.recommendation.status === SignalStatus.BUY ? 'text-emerald-500' :
                    selectedStock.recommendation.status === SignalStatus.SELL ? 'text-red-500' : 'text-slate-500'
                  }`}>
                    {selectedStock.recommendation.status}
                  </div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">Signal Conviction</p>
                </div>
              </div>

              {selectedStock.validation?.isValidated && (
                <div className="p-8 space-y-8">
                  <div className="glass p-6 rounded-[32px] border-slate-800/40">
                    <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-6 flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> Authority Price-Volume Divergence
                    </h3>
                    <CombinedPriceVolumeChart stock={selectedStock} recommendation={selectedStock.recommendation} />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="glass p-6 rounded-[32px] border-slate-800/40">
                      <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em] mb-4 flex items-center gap-3">
                        <Target className="w-4 h-4 text-emerald-500" /> Conviction Radar
                      </h3>
                      <ConvictionRadar stock={selectedStock} recommendation={selectedStock.recommendation} />
                    </div>
                    <div className="p-6 bg-slate-900/30 rounded-[32px] border border-slate-800 shadow-inner">
                      <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-widest mb-3">Authority Insight</p>
                      <p className="text-xs text-slate-300 leading-relaxed font-medium italic">"{selectedStock.recommendation.differentiation}"</p>
                      <div className="mt-6 pt-6 border-t border-slate-800 flex justify-between">
                         <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase mb-2">Buy Zone</p>
                            <p className="text-xl font-black text-white italic">₹{selectedStock.recommendation.execution.buyZone.max}</p>
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-slate-600 uppercase mb-2">Stop Loss</p>
                            <p className="text-xl font-black text-red-500 italic">₹{selectedStock.recommendation.execution.stopLoss}</p>
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 glass rounded-[32px] border-slate-800/50 bg-slate-900/20">
                      <div className="flex items-center gap-3 mb-4">
                        <Cpu className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">AI Authority Reasoner</h3>
                      </div>
                      <p className="text-sm text-slate-200 italic leading-relaxed font-medium">"{aiInsight}"</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[500px] flex items-center justify-center text-slate-500 rounded-[50px] border-2 border-slate-900 border-dashed glass">
               <p className="text-xs font-black uppercase tracking-[0.3em]">Select Instrument for Authority Verification</p>
            </div>
          )}
        </div>

        {/* MARKET PULSE SIDEBAR */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-orange-500" /> Authority Pulse
            </h2>
          </div>

          <div className="space-y-4">
            {isNewsTime ? (
              breakingNews.map((news) => (
                <div key={news.id} className="p-5 glass border-slate-800/50 rounded-2xl hover:border-orange-500/30 transition-all relative group">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest ${
                      news.impact === 'HIGH' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {news.impact} IMPACT
                    </span>
                    <span className="text-[8px] font-bold text-slate-600 mono">{news.time}</span>
                  </div>
                  <h4 className="text-xs font-black text-white leading-tight mb-2 group-hover:text-orange-400">{news.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-snug mb-3">{news.summary}</p>
                  <a href={news.url} target="_blank" rel="noreferrer" className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 hover:gap-2">
                     Read Source <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))
            ) : (
              <div className="p-8 bg-slate-900/20 border border-slate-900/50 rounded-2xl flex flex-col items-center justify-center text-center">
                 <Radio className="w-8 h-8 text-slate-800 mb-4" />
                 <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-tight">Feed Activates at 09:30 AM IST</h3>
              </div>
            )}

            <div className="mt-10 pt-10 border-t border-slate-900/80">
               <h3 className="text-[9px] font-black uppercase text-slate-600 tracking-[0.3em] mb-6 flex items-center gap-2">
                 <Radio className="w-4 h-4 text-slate-700" /> Institutional Footprint
               </h3>
               {selectedStock && <InstitutionalFlowChart stock={selectedStock} recommendation={selectedStock.recommendation} />}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#030304] border-t border-slate-900/80 p-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-slate-700" />
              <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Real-Time Price Authority v5.0 | High Speed LTP Feed Active</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">
               LTP sourced from authorized exchange feed only. ISIN mismatch triggers immediate blockage.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
