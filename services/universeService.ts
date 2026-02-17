
import { MASTER_UNIVERSE } from '../constants';
import { StockData, UniverseStats, Exchange } from '../types';

export class UniverseManager {
  private static instance: UniverseManager;
  private universe: StockData[] = MASTER_UNIVERSE;

  private constructor() {}

  public static getInstance(): UniverseManager {
    if (!UniverseManager.instance) {
      UniverseManager.instance = new UniverseManager();
    }
    return UniverseManager.instance;
  }

  public getAllStocks(): StockData[] {
    return this.universe.filter(s => s.active);
  }

  public getByExchange(exchange: Exchange): StockData[] {
    return this.universe.filter(s => s.exchange === exchange && s.active);
  }

  public getByIndex(indexName: string): StockData[] {
    return this.universe.filter(s => s.indices.includes(indexName) && s.active);
  }

  public getBySector(sector: string): StockData[] {
    return this.universe.filter(s => s.sector === sector && s.active);
  }

  public getStats(): UniverseStats {
    const stats: UniverseStats = {
      totalNSE: this.getByExchange('NSE').length,
      totalBSE: this.getByExchange('BSE').length,
      indexCounts: {}
    };

    this.universe.forEach(stock => {
      stock.indices.forEach(index => {
        stats.indexCounts[index] = (stats.indexCounts[index] || 0) + 1;
      });
    });

    return stats;
  }

  public search(query: string): StockData[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllStocks();
    
    return this.universe.filter(s => 
      s.active && (
        s.symbol.toLowerCase().includes(q) || 
        s.companyName.toLowerCase().includes(q) ||
        s.isin.toLowerCase().includes(q)
      )
    );
  }

  public validateUniverse(): boolean {
    const isins = new Set<string>();
    for (const stock of this.universe) {
      if (!stock.isin || !stock.symbol || !stock.exchange) {
        console.error(`Validation Failed: Missing required fields for ${stock.symbol}`);
        return false;
      }
      // ISINs can be shared across exchanges for the same company, but symbol/exchange pairs must be unique
    }
    return true;
  }
}

export const universe = UniverseManager.getInstance();
