
import { StockData, PriceValidationResult } from '../types';

export class PriceAuthority {
  private static MAX_DRIFT_PERCENT = 3.0;
  private static CACHE_EXPIRY_MS = 1000;

  /**
   * STEP 3: PRICE SANITY VALIDATION
   */
  public static validateLTP(
    stock: StockData, 
    newPrice: number, 
    lastReferencePrice: number
  ): PriceValidationResult {
    const timestamp = new Date().toISOString();
    
    // Rule: Reject if missing ISIN or Exchange
    if (!stock.isin || !stock.exchange || !stock.symbol) {
      return {
        isValidated: false,
        errorCode: 'ISIN_MISMATCH',
        dataSource: 'OFFICIAL_EXCHANGE_FEED',
        lastValidatedTimestamp: timestamp
      };
    }

    // Sanity: Drift Check (±3%)
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

  /**
   * STEP 1: Instrument Resolution
   */
  public static resolveInstrument(exchange: string, symbol: string, isin: string): string {
    return `${exchange}:${symbol} | ISIN: ${isin}`;
  }
}
