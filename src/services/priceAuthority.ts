import { StockData, PriceValidationResult } from '../types';

export class PriceAuthority {
    private static MAX_DRIFT_PERCENT = 3.0;
    private static CACHE_EXPIRY_MS = 1000;

    public static validateLTP(
        stock: StockData,
        newPrice: number,
        lastReferencePrice: number
    ): PriceValidationResult {
        const timestamp = new Date().toISOString();

        // STEP 1 & 2: Instrument Resolution & Metadata Check
        if (!stock.isin || !stock.exchange || !stock.symbol) {
            return {
                isValidated: false,
                errorCode: 'ISIN_MISMATCH',
                dataSource: 'OFFICIAL_EXCHANGE_FEED',
                lastValidatedTimestamp: timestamp
            };
        }

        // STEP 3: SANITY VALIDATION (±3% Drift Rule)
        const drift = Math.abs((newPrice - lastReferencePrice) / lastReferencePrice) * 100;
        if (drift > this.MAX_DRIFT_PERCENT) {
            return {
                isValidated: false,
                errorCode: 'PRICE_VALIDATION_FAILED',
                dataSource: 'OFFICIAL_EXCHANGE_FEED',
                lastValidatedTimestamp: timestamp
            };
        }

        return {
            isValidated: true,
            dataSource: 'OFFICIAL_EXCHANGE_FEED',
            lastValidatedTimestamp: timestamp
        };
    }

    public static getAuthorityString(stock: StockData): string {
        return `${stock.exchange}:${stock.symbol} | ISIN: ${stock.isin}`;
    }
}
