import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Activity, Zap, Search, Bell, Target, BarChart2, Layers, Cpu, Radio, Globe,
    ShieldCheck, RefreshCcw, LayoutDashboard, Clock, AlertTriangle, CheckCircle2,
    Database, Server, ExternalLink, Bitcoin, Wallet
} from 'lucide-react';
import { INDICES, CRYPTO_UNIVERSE } from './constants';
import { StockData, StockWithRecommendation, SignalStatus, MarketIntelligence, BreakingNewsItem, MarketRegime, DataStatus, CryptoAssetWithRecommendation, CryptoMarketData, CryptoRegime } from './types';
import { calculateRecommendation } from './services/signalEngine';
import { calculateCryptoSignal, validateCryptoData } from './services/cryptoSignalEngine';
import { getDetailedAIInsight, getMarketIntelligence, getLiveBreakingNews, syncStockWithWeb, syncCryptoWithWeb, getCryptoMarketIntelligence, getCryptoAIInsight } from './services/geminiService';
import { universe } from './services/universeService';
import { PriceAuthority } from './services/priceAuthority';
import { ConvictionRadar, CombinedPriceVolumeChart, InstitutionalFlowChart, CryptoPriceChart } from './components/Charts';

const App: React.FC = () => {
    const [marketType, setMarketType] = useState<'EQUITY' | 'CRYPTO'>('EQUITY');

    // Equity State
    const [stocks, setStocks] = useState<StockWithRecommendation[]>([]);
    const [selectedStock, setSelectedStock] = useState<StockWithRecommendation | null>(null);
    const [marketIntel, setMarketIntel] = useState<MarketIntelligence | null>(null);

    // Crypto State
    const [cryptoAssets, setCryptoAssets] = useState<CryptoAssetWithRecommendation[]>([]);
    const [selectedCrypto, setSelectedCrypto] = useState<CryptoAssetWithRecommendation | null>(null);
    const [cryptoMarketIntel, setCryptoMarketIntel] = useState<CryptoMarketData | null>(null);

    const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([]);
    const [aiInsight, setAiInsight] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);

    const [selectedIndex, setSelectedIndex] = useState<string>("ALL");
    const [selectedExchange, setSelectedExchange] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");

    const [isMarketOpen, setIsMarketOpen] = useState(false);

    // AUTHENTIC TIME GATE CHECK (IST)
    const checkTimeGates = useCallback(() => {
        const now = new Date();
        const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const hours = istTime.getUTCHours();
        const minutes = istTime.getUTCMinutes();
        const day = istTime.getUTCDay();
        const timeInMins = hours * 60 + minutes;

        // Trading Hours: 09:15 to 15:30 IST
        const open = day >= 1 && day <= 5 && timeInMins >= 555 && timeInMins <= 930;
        setIsMarketOpen(open);
    }, []);

    /**
     * AUTHENTIC INGESTION LOOP (60-120s)
     * Fetches official data via AI Bridge. No synthetic prices allowed.
     */
    const performAuthorityIngestion = useCallback(async () => {
        setIsSyncing(true);

        // Prioritize selected stock for real-time validation
        if (selectedStock) {
            const liveData = await syncStockWithWeb(selectedStock.symbol, selectedStock.exchange);
            if (liveData) {
                const validation = PriceAuthority.validateLTP(selectedStock, liveData.price!, selectedStock.price);

                const update: Partial<StockData> = {
                    ...liveData,
                    dataStatus: validation.isValidated ? DataStatus.LIVE : DataStatus.REJECTED,
                    validation: validation
                };

                universe.updateStockPrice(selectedStock.symbol, selectedStock.exchange, update);
            } else {
                // If sync fails, check if data is stale
                const diff = Date.now() - new Date(selectedStock.lastUpdatedTimestamp).getTime();
                if (diff > 300000) { // 5 minutes = Stale
                    universe.updateStockPrice(selectedStock.symbol, selectedStock.exchange, { dataStatus: DataStatus.STALE });
                }
            }
        }

        refreshStocks();
        setIsSyncing(false);
    }, [selectedStock, isMarketOpen]);

    const refreshStocks = useCallback(() => {
        let baseList = universe.getAllStocks();
        if (selectedIndex !== "ALL") baseList = baseList.filter(s => s.indices.includes(selectedIndex));
        if (selectedExchange !== "ALL") baseList = baseList.filter(s => s.exchange === selectedExchange);

        const regime: MarketRegime = marketIntel?.globalCues.regime || 'NEUTRAL';

        const processed = baseList.map(s => {
            const rec = calculateRecommendation(s, regime);
            return { ...s, recommendation: rec };
        }).sort((a, b) => b.recommendation.convictionScore - a.recommendation.convictionScore);

        setStocks(processed);
        if (selectedStock) {
            const updated = processed.find(p => p.symbol === selectedStock.symbol && p.exchange === selectedStock.exchange);
            if (updated) setSelectedStock(updated);
        } else if (processed.length > 0) {
            setSelectedStock(processed[0]);
        }
    }, [selectedIndex, selectedExchange, marketIntel]);

    // Initial Data Fetch
    useEffect(() => {
        checkTimeGates();
        getMarketIntelligence().then(setMarketIntel);
        getLiveBreakingNews().then(setBreakingNews);

        // Init Crypto
        const initialCrypto = CRYPTO_UNIVERSE.map(c => ({
            ...c,
            recommendation: calculateCryptoSignal(c, {
                btcAtrPercentile: 50,
                cryptoVolatilityIndexPercentile: 50,
                btcDominanceChangePercent: 0,
                totalMarketCapChangePercent: 0
            })
        }));
        setCryptoAssets(initialCrypto);
        if (initialCrypto.length > 0) setSelectedCrypto(initialCrypto[0]);

        setLoading(false);
    }, []);

    // Fetch Crypto Market Intel
    useEffect(() => {
        if (marketType === 'CRYPTO') {
            getCryptoMarketIntelligence().then(setCryptoMarketIntel);
        }
    }, [marketType]);

    const refreshCryptoState = useCallback(() => {
        if (!cryptoMarketIntel) return;
        setCryptoAssets(prev => {
            const updated = prev.map(asset => {
                const rec = calculateCryptoSignal(asset, cryptoMarketIntel);
                return { ...asset, recommendation: rec };
            }).sort((a, b) => b.recommendation.convictionScore - a.recommendation.convictionScore);
            return updated;
        });
    }, [cryptoMarketIntel]);

    // Update selectedCrypto when assets change
    useEffect(() => {
        if (selectedCrypto && cryptoAssets.length > 0) {
            const found = cryptoAssets.find(c => c.symbol === selectedCrypto.symbol);
            if (found && found !== selectedCrypto) {
                setSelectedCrypto(found);
            }
        }
    }, [cryptoAssets]);

    const performCryptoIngestion = useCallback(async () => {
        if (marketType !== 'CRYPTO' || !selectedCrypto) return;
        setIsSyncing(true);

        const liveData = await syncCryptoWithWeb(selectedCrypto.symbol);
        if (liveData) {
            const updatedAsset = { ...selectedCrypto, ...liveData };
            const validation = validateCryptoData(updatedAsset);

            // Calculate Signal
            const recommendation = calculateCryptoSignal(
                updatedAsset,
                cryptoMarketIntel || {
                    cryptoVolatilityIndexPercentile: 50,
                    btcDominance: 50,
                    totalMarketCap: 2000000000000,
                    globalCues: { regime: 'NEUTRAL', score: 50 }
                }
            );

            setCryptoAssets(prev => prev.map(c => {
                if (c.symbol === selectedCrypto.symbol) {
                    return {
                        ...updatedAsset,
                        dataStatus: validation.isValidated ? DataStatus.LIVE : DataStatus.REJECTED,
                        validation,
                        recommendation
                    };
                }
                return c;
            }));
        }
        refreshCryptoState();
        setIsSyncing(false);
    }, [selectedCrypto, marketType, refreshCryptoState, cryptoMarketIntel]);

    // AI Insight for Crypto
    useEffect(() => {
        if (marketType === 'CRYPTO' && selectedCrypto && cryptoMarketIntel) {
            setAiInsight("ANALYZING CHAIN DATA...");
            getCryptoAIInsight(selectedCrypto, selectedCrypto.recommendation, cryptoMarketIntel).then(setAiInsight);
        }
    }, [selectedCrypto?.symbol, selectedCrypto?.ltp, marketType]);

    // Refresh stocks when filters or dependencies change
    useEffect(() => {
        if (marketType === 'EQUITY') refreshStocks();
    }, [refreshStocks, marketType]);

    // Time Gate Interval
    useEffect(() => {
        const timeInt = setInterval(checkTimeGates, 30000);
        return () => clearInterval(timeInt);
    }, [checkTimeGates]);

    // Ingestion Interval
    useEffect(() => {
        const ingestInt = setInterval(() => {
            if (marketType === 'EQUITY') performAuthorityIngestion();
            else performCryptoIngestion();
        }, 90000); // 90s Ingestion
        return () => clearInterval(ingestInt);
    }, [performAuthorityIngestion, performCryptoIngestion, marketType]);

    useEffect(() => {
        if (selectedStock) {
            setAiInsight("SCANNING AUTHENTIC FEED...");
            getDetailedAIInsight(selectedStock, selectedStock.recommendation).then(setAiInsight);
        }
    }, [selectedStock?.symbol, selectedStock?.price]);

    const filteredStocks = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        return stocks.filter(s => s.symbol.toLowerCase().includes(q) || s.companyName.toLowerCase().includes(q));
    }, [stocks, searchQuery]);

    if (loading) return (
        <div className="min-h-screen bg-[#060608] flex items-center justify-center">
            <div className="text-center space-y-4">
                <Server className="w-12 h-12 text-emerald-500 animate-pulse mx-auto" />
                <p className="text-[10px] font-black tracking-[0.5em] text-slate-500 uppercase">Verifying Exchange Connectivity</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen flex flex-col bg-[#060608] text-slate-300 antialiased font-sans">
            {/* TERMINAL HEADER */}
            <header className="sticky top-0 z-50 glass border-b border-slate-800/50 px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <Database className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tighter text-white">BREAKR <span className="text-emerald-500">INGEST</span></h1>
                            <p className="text-[8px] font-black text-slate-500 tracking-[0.4em] uppercase">OFFICIAL AUTHORITY</p>
                        </div>
                    </div>

                    {/* MARKET TOGGLE */}
                    <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-800">
                        <button
                            onClick={() => setMarketType('EQUITY')}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all ${marketType === 'EQUITY' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            NSE/BSE
                        </button>
                        <button
                            onClick={() => setMarketType('CRYPTO')}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider transition-all ${marketType === 'CRYPTO' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            CRYPTO
                        </button>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 px-4 py-1.5 bg-slate-900/80 rounded border border-slate-800">
                        <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-slate-500" />
                            <span className="text-[9px] font-black text-slate-400 uppercase">Regime:</span>
                            <span className={`text-[9px] font-black ${marketIntel?.globalCues.regime === 'RISK_ON' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {marketType === 'EQUITY' ? (marketIntel?.globalCues.regime || 'SYNCING') : (cryptoMarketIntel ? (cryptoMarketIntel.cryptoVolatilityIndexPercentile > 70 ? 'HIGH VOL' : 'NORMAL') : 'SYNCING')}
                            </span>
                        </div>
                        <div className="w-px h-3 bg-slate-700"></div>
                        <div className="flex items-center gap-2">
                            <RefreshCcw className={`w-3 h-3 text-slate-500 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
                            <span className="text-[9px] font-black text-slate-400 uppercase">INGESTION:</span>
                            <span className="text-[9px] font-black text-white">{isSyncing ? 'ACTIVE' : 'IDLE'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="SEARCH MASTER UNIVERSE..."
                            className="bg-slate-950 border border-slate-800 rounded px-10 py-2 text-[10px] font-black text-white focus:ring-1 focus:ring-emerald-500 outline-none w-72 transition-all placeholder:text-slate-700"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className={`px-3 py-1.5 rounded border ${isMarketOpen ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <span className={`text-[9px] font-black uppercase tracking-widest ${isMarketOpen ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isMarketOpen ? 'SESSION LIVE' : 'AFTER HOURS'}
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* SCANNER SIDEBAR */}
                <aside className="col-span-12 lg:col-span-3 border-r border-slate-800/60 bg-[#08080a] flex flex-col">
                    <div className="p-4 border-b border-slate-800/40 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <LayoutDashboard className="w-3 h-3" /> Market Watch
                            </h2>
                            <span className="text-[9px] font-black text-emerald-500 mono">{filteredStocks.length}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select value={selectedExchange} onChange={e => setSelectedExchange(e.target.value)} className="bg-slate-900 border border-slate-800 text-[9px] font-black p-2 rounded outline-none uppercase text-slate-400">
                                <option value="ALL">ALL EXCH</option>
                                <option value="NSE">NSE</option>
                                <option value="BSE">BSE</option>
                            </select>
                            <select value={selectedIndex} onChange={e => setSelectedIndex(e.target.value)} className="bg-slate-900 border border-slate-800 text-[9px] font-black p-2 rounded outline-none uppercase text-slate-400">
                                <option value="ALL">ALL INDICES</option>
                                {INDICES.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scroll">
                        {marketType === 'EQUITY' ? (
                            filteredStocks.map(stock => (
                                <button
                                    key={`${stock.exchange}:${stock.symbol}`}
                                    onClick={() => setSelectedStock(stock)}
                                    className={`w-full p-4 border-b border-slate-900/80 flex items-center justify-between hover:bg-slate-900/40 transition-all ${selectedStock?.symbol === stock.symbol ? 'bg-slate-900/60 border-l-2 border-l-emerald-500' : ''}`}
                                >
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-white">{stock.symbol}</span>
                                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${stock.dataStatus === DataStatus.LIVE ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                                {stock.dataStatus}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-600 truncate max-w-[120px] mt-0.5 uppercase tracking-tighter">{stock.companyName}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-white mono">{stock.price > 0 ? stock.price.toFixed(2) : '---'}</div>
                                        <div className={`text-[9px] font-black mono ${stock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {stock.price > 0 ? (stock.change >= 0 ? '+' : '') + stock.changePercent + '%' : ''}
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            cryptoAssets.map(asset => (
                                <button
                                    key={asset.symbol}
                                    onClick={() => setSelectedCrypto(asset)}
                                    className={`w-full p-4 border-b border-slate-900/80 flex items-center justify-between hover:bg-slate-900/40 transition-all ${selectedCrypto?.symbol === asset.symbol ? 'bg-slate-900/60 border-l-2 border-l-orange-500' : ''}`}
                                >
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-white">{asset.symbol}</span>
                                            <span className={`text-[7px] font-black px-1.5 py-0.5 rounded ${asset.dataStatus === DataStatus.LIVE ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                                                {asset.dataStatus}
                                            </span>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-600 truncate max-w-[120px] mt-0.5 uppercase tracking-tighter">{asset.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-white mono">${asset.ltp.toLocaleString()}</div>
                                        <div className={`text-[9px] font-black mono ${asset.recommendation.status === SignalStatus.BUY ? 'text-emerald-500' : asset.recommendation.status === SignalStatus.SELL ? 'text-red-500' : 'text-slate-500'}`}>
                                            {asset.recommendation.status}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                {/* WORKSTATION */}
                <section className="col-span-12 lg:col-span-6 p-8 overflow-y-auto custom-scroll bg-[#060608] border-r border-slate-800/60 relative">
                    {marketType === 'EQUITY' ? (
                        selectedStock ? (
                            <div className="space-y-8">
                                {/* HEADER BLOC */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tighter text-white mb-2">{selectedStock.companyName}</h2>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mono">
                                            <span className="flex items-center gap-1.5">
                                                <Server className="w-3 h-3" /> {selectedStock.exchange}:{selectedStock.symbol}
                                            </span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                                            <span>ISIN: {selectedStock.isin}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] font-black uppercase tracking-[0.4em] px-3 py-1 rounded shadow-lg ${selectedStock.recommendation.status === SignalStatus.BUY ? 'bg-emerald-500/10 text-emerald-500' :
                                                selectedStock.recommendation.status === SignalStatus.SELL ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                            {selectedStock.recommendation.status}
                                        </div>
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Authority Decision</p>
                                    </div>
                                </div>

                                {/* PRICE & DATA STATUS GRID */}
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-8 p-8 glass rounded-2xl border-slate-800/40 shadow-xl relative overflow-hidden bg-slate-950/40">
                                        <div className="absolute top-0 right-0 p-4 flex items-center gap-3">
                                            <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${selectedStock.dataStatus === DataStatus.LIVE ? 'text-emerald-500' : 'text-red-500'
                                                }`}>
                                                DATA STATUS: {selectedStock.dataStatus}
                                            </span>
                                            <div className={`w-2 h-2 rounded-full ${selectedStock.dataStatus === DataStatus.LIVE ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`}></div>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Official Last Traded Price (LTP)</p>
                                            <div className="text-7xl font-black text-white mono tracking-tighter">
                                                {selectedStock.price > 0 ? selectedStock.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : 'N/A'}
                                            </div>
                                            <div className={`text-xl font-black mt-2 flex items-center gap-2 ${selectedStock.change >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {selectedStock.price > 0 ? (
                                                    <>
                                                        {selectedStock.change >= 0 ? '▲' : '▼'} {Math.abs(selectedStock.change).toFixed(2)} ({Math.abs(selectedStock.changePercent)}%)
                                                    </>
                                                ) : 'WAITING FOR DATA'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-4 p-6 glass rounded-2xl border-slate-800/40 bg-slate-900/10 shadow-inner flex flex-col justify-center">
                                        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Ingestion Logs</h3>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                                <span className="text-[8px] font-black text-slate-500 uppercase">Source</span>
                                                <span className="text-[10px] font-black text-white uppercase">{selectedStock.lastUpdateSource}</span>
                                            </div>
                                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                                <span className="text-[8px] font-black text-slate-500 uppercase">Verified at</span>
                                                <span className="text-[10px] font-black text-slate-400 mono">
                                                    {selectedStock.lastUpdatedTimestamp !== 'NEVER' ? new Date(selectedStock.lastUpdatedTimestamp).toLocaleTimeString() : '---'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[8px] font-black text-slate-500 uppercase">Trust Level</span>
                                                <span className="text-[10px] font-black text-emerald-500 uppercase">HIGH</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CHARTS */}
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="glass p-6 rounded-2xl border-slate-800/40 bg-slate-900/20">
                                        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                            <BarChart2 className="w-3.5 h-3.5" /> Absorption vs Average
                                        </h3>
                                        {selectedStock.price > 0 && <CombinedPriceVolumeChart stock={selectedStock} recommendation={selectedStock.recommendation} />}
                                        <p className="text-[8px] text-center text-slate-600 mt-4 uppercase tracking-[0.4em]">Official Volume Metrics Grounded via AI Bridge</p>
                                    </div>
                                    <div className="glass p-6 rounded-2xl border-slate-800/40 bg-slate-900/20">
                                        <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                            <Target className="w-3.5 h-3.5" /> Intelligence Radar
                                        </h3>
                                        <ConvictionRadar stock={selectedStock} recommendation={selectedStock.recommendation} />
                                    </div>
                                </div>

                                {/* AI REASONER NODE */}
                                <div className="p-8 glass rounded-[32px] border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <Cpu className="w-24 h-24" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-4 flex items-center gap-3">
                                        <Zap className="w-4 h-4" /> AI TRADE PROSECUTOR
                                    </h3>
                                    <p className="text-xl font-medium text-slate-100 italic leading-relaxed whitespace-pre-line border-l-2 border-emerald-500/30 pl-6">
                                        "{aiInsight}"
                                    </p>
                                </div>

                                {/* Grounding Sources: MUST ALWAYS extract and list URLs when using Google Search */}
                                {marketIntel && marketIntel.sources.length > 0 && (
                                    <div className="p-6 glass rounded-2xl border-slate-800/40 bg-slate-900/10">
                                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                                            <ExternalLink className="w-3.5 h-3.5" /> RESEARCH GROUNDING
                                        </h3>
                                        <div className="flex flex-wrap gap-3">
                                            {marketIntel.sources.map((source, index) => (
                                                <a
                                                    key={index}
                                                    href={source.uri}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-bold text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all flex items-center gap-2"
                                                >
                                                    {source.title} <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-center p-4 border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-3">
                                        <AlertTriangle className="w-3 h-3" /> NO SYNTHETIC DATA | STRICT NSE/BSE WEB GROUNDING ACTIVE
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <ShieldCheck className="w-20 h-20 text-slate-800 mb-6" />
                                <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.5em]">Awaiting Data Sync</h2>
                            </div>
                        )
                    ) : (
                        selectedCrypto ? (
                            <div className="space-y-8">
                                {/* HEADER */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-3xl font-black tracking-tighter text-white mb-2 flex items-center gap-3">
                                            <Bitcoin className="w-8 h-8 text-orange-500" /> {selectedCrypto.name}
                                        </h2>
                                        <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mono">
                                            <span>{selectedCrypto.symbol}</span>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-800"></span>
                                            <span>VOL: ${(selectedCrypto.volume24h / 1000000000).toFixed(2)}B</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[10px] font-black uppercase tracking-[0.4em] px-3 py-1 rounded shadow-lg ${selectedCrypto.recommendation.status === SignalStatus.BUY ? 'bg-emerald-500/10 text-emerald-500' :
                                                selectedCrypto.recommendation.status === SignalStatus.SELL ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-400'
                                            }`}>
                                            {selectedCrypto.recommendation.status}
                                        </div>
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-2">Conviction: {selectedCrypto.recommendation.convictionScore}/100</p>
                                    </div>
                                </div>

                                {/* METRICS GRID */}
                                <div className="grid grid-cols-12 gap-6">
                                    <div className="col-span-8 p-8 glass rounded-2xl border-slate-800/40 shadow-xl relative overflow-hidden bg-slate-950/40">
                                        <div className="text-7xl font-black text-white mono tracking-tighter">
                                            ${selectedCrypto.ltp.toLocaleString()}
                                        </div>
                                        <div className="grid grid-cols-3 gap-4 mt-6">
                                            <div className="text-center p-2 bg-slate-900/40 rounded border border-slate-800">
                                                <p className="text-[8px] text-slate-500 uppercase">Binance</p>
                                                <p className="text-xs font-black text-white mono">${selectedCrypto.binancePrice.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center p-2 bg-slate-900/40 rounded border border-slate-800">
                                                <p className="text-[8px] text-slate-500 uppercase">Coinbase</p>
                                                <p className="text-xs font-black text-white mono">${selectedCrypto.coinbasePrice.toLocaleString()}</p>
                                            </div>
                                            <div className="text-center p-2 bg-slate-900/40 rounded border border-slate-800">
                                                <p className="text-[8px] text-slate-500 uppercase">Bybit</p>
                                                <p className="text-xs font-black text-white mono">${selectedCrypto.bybitPrice.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-4 p-6 glass rounded-2xl border-slate-800/40 bg-slate-900/10 flex flex-col justify-center space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-[8px] font-black text-slate-500 uppercase">Funding Rate</span>
                                            <span className={`text-[10px] font-black uppercase ${selectedCrypto.fundingRate > 0.01 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                {selectedCrypto.fundingRate.toFixed(4)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                            <span className="text-[8px] font-black text-slate-500 uppercase">OI Change (24h)</span>
                                            <span className={`text-[10px] font-black uppercase ${selectedCrypto.openInterestChangePercent > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {selectedCrypto.openInterestChangePercent > 0 ? '+' : ''}{selectedCrypto.openInterestChangePercent}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[8px] font-black text-slate-500 uppercase">Regime</span>
                                            <span className="text-[10px] font-black text-orange-500 uppercase">{selectedCrypto.recommendation.reasoning.regime}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* CRYPTO CHART */}
                                <div className="glass p-6 rounded-2xl border-slate-800/40 bg-slate-900/20">
                                    <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5" /> 24H Price Action (Simulated)
                                    </h3>
                                    <CryptoPriceChart asset={selectedCrypto} />
                                </div>

                                {/* AI INSIGHT */}
                                <div className="p-8 glass rounded-[32px] border-orange-500/20 bg-orange-500/5 relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <Cpu className="w-24 h-24" />
                                    </div>
                                    <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.5em] mb-4 flex items-center gap-3">
                                        <Zap className="w-4 h-4" /> CRYPTO INTELLIGENCE ENGINE
                                    </h3>
                                    <p className="text-xl font-medium text-slate-100 italic leading-relaxed whitespace-pre-line border-l-2 border-orange-500/30 pl-6">
                                        "{aiInsight}"
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <Bitcoin className="w-20 h-20 text-slate-800 mb-6" />
                                <h2 className="text-xs font-black text-slate-600 uppercase tracking-[0.5em]">Select Asset</h2>
                            </div>
                        )
                    )}
                </section>

                {/* NARRATIVE SIDEBAR */}
                <aside className="col-span-12 lg:col-span-3 bg-[#08080a] p-6 space-y-8 overflow-y-auto custom-scroll">
                    <div>
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                            <Radio className="w-3.5 h-3.5 text-orange-500" /> Corporate Pulse
                        </h2>
                        <div className="space-y-4">
                            {breakingNews.length > 0 ? (
                                breakingNews.map(news => (
                                    <div key={news.id} className="p-4 glass border-slate-800/50 rounded-xl bg-slate-900/20 hover:border-orange-500/40 transition-all cursor-pointer group">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${news.narrativeBias === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-500' :
                                                    news.narrativeBias === 'BEARISH' ? 'bg-red-500/20 text-red-500' : 'bg-slate-800 text-slate-500'
                                                }`}>
                                                {news.narrativeBias}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-600 mono">{news.time}</span>
                                        </div>
                                        <h4 className="text-xs font-black text-white leading-tight mb-2 group-hover:text-orange-400 transition-colors">{news.title}</h4>
                                        <p className="text-[10px] text-slate-500 leading-snug">{news.summary}</p>
                                        {news.url && (
                                            <a
                                                href={news.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 text-[8px] font-black text-emerald-500/60 hover:text-emerald-500 uppercase flex items-center gap-1"
                                            >
                                                STORY SOURCE <ExternalLink className="w-2 h-2" />
                                            </a>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 bg-slate-900/40 rounded border border-slate-800 border-dashed text-center">
                                    <Clock className="w-6 h-6 text-slate-800 mx-auto mb-2" />
                                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Awaiting News Ingestion</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800/60">
                        <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5" /> Big Money Footprint
                        </h2>
                        {selectedStock && selectedStock.price > 0 && <InstitutionalFlowChart stock={selectedStock} recommendation={selectedStock.recommendation} />}
                        <div className="mt-6 p-4 bg-slate-900/40 rounded border border-slate-800">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Footprint Verdict</p>
                            <p className="text-[10px] font-medium text-slate-400 italic">
                                {selectedStock?.recommendation.reasoning.institutionalIntent === 'ACCUMULATION'
                                    ? "Official delivery absorption confirmed. Floor established."
                                    : selectedStock?.recommendation.reasoning.institutionalIntent === 'DISTRIBUTION'
                                        ? "Volume spikes on weak price indicate heavy offloading."
                                        : "Footprint neutral. Institutional participants in standby mode."}
                            </p>
                        </div>
                    </div>
                </aside>
            </main>

            <footer className="glass border-t border-slate-800/50 px-8 py-3 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3 text-emerald-500" /> AUTHORITY VALIDATED
                    </span>
                    <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                    <span>DATA SOURCE: NSE / BSE WEB BRIDGE</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-slate-500">REL: 7.1.0-AUTH</span>
                    <span className="text-emerald-500 animate-pulse-soft">● SYSTEM ACTIVE</span>
                </div>
            </footer>
        </div>
    );
};

export default App;
