import { StockData, PriceValidationResult, MarketRegime } from '../types';
import { MASTER_UNIVERSE } from '../constants';
import { syncStockWithWeb } from './geminiService';
import { PriceAuthority } from './priceAuthority';

export class UniverseService {
    private universe: StockData[] = MASTER_UNIVERSE;

    public async getActiveUniverse(regime: MarketRegime): Promise<StockData[]> {
        // 1. FILTER: Basic liquidity & regime compatibility
        const candidates = this.universe.filter(s => {
            if (!s.active) return false;
            const rvol = s.volume / s.avgVolume20d;
            if (rvol < 1.2) return false; // Minimum RVOL requirement

            if (regime === 'RISK_ON' && s.marketCapCategory === 'Small') return true;
            if (regime === 'RISK_OFF' && s.marketCapCategory !== 'Large') return false;

            return true;
        });

        // 2. ENRICH: Validate & update pricing via Web Grounding
        const validatedUniverse: StockData[] = [];

        // Process in batches to avoid rate limits (simplified here)
        for (const stock of candidates) {
            try {
                // Attempt to get live grounded data
                const liveData = await syncStockWithWeb(stock.symbol, stock.exchange);

                if (liveData && liveData.price) {
                    // Validate against last known (using initial loaded data as reference for demo)
                    const validation: PriceValidationResult = PriceAuthority.validateLTP(stock, liveData.price, stock.price);

                    if (validation.isValidated) {
                        validatedUniverse.push({
                            ...stock,
                            ...liveData,
                            dataStatus: 'VALIDATED_LIVE',
                            lastUpdatedTimestamp: validation.lastValidatedTimestamp
                        });
                    } else {
                        console.warn(`Price validation failed for ${stock.symbol}: ${validation.errorCode}`);
                        // Fallback to cached data, mark as stale
                        validatedUniverse.push({
                            ...stock,
                            dataStatus: 'STALE_CACHE',
                            lastUpdatedTimestamp: validation.lastValidatedTimestamp
                        });
                    }
                } else {
                    // Update failed, use cached
                    validatedUniverse.push({
                        ...stock,
                        dataStatus: 'STALE_CACHE',
                        lastUpdatedTimestamp: new Date().toISOString()
                    });
                }
            } catch (error) {
                console.error(`Failed to update ${stock.symbol}`, error);
                validatedUniverse.push({
                    ...stock,
                    dataStatus: 'STALE_CACHE',
                    lastUpdatedTimestamp: new Date().toISOString()
                });
            }
        }

        // 3. SORT: Prioritize by institutional criteria (RVOL * Strength)
        return validatedUniverse.sort((a, b) => {
            const scoreA = (a.volume / a.avgVolume20d) * Math.abs(a.relativeStrengthVsNifty);
            const scoreB = (b.volume / b.avgVolume20d) * Math.abs(b.relativeStrengthVsNifty);
            return scoreB - scoreA;
        });
    }
}

export const universeService = new UniverseService();
