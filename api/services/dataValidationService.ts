import { StockData } from '../types/stock.js';
import { AdvancedLoggerService } from './advancedLoggerService.js';
import { RedisService } from './redisService.js';

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: string[];
  source: string;
  timestamp: string;
}

export interface CrossValidationResult {
  symbol: string;
  consensusData: StockData | null;
  validationResults: ValidationResult[];
  confidence: number;
  anomalies: string[];
}

export interface AnomalyDetectionResult {
  hasAnomaly: boolean;
  anomalyType: 'price_spike' | 'volume_spike' | 'data_inconsistency' | 'stale_data' | 'outlier';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedFields: string[];
}

export class DataValidationService {
  private logger: AdvancedLoggerService;
  private redis: RedisService;
  private validationRules: Map<string, (data: StockData) => ValidationResult>;
  private historicalData: Map<string, StockData[]> = new Map();
  private readonly HISTORICAL_WINDOW = 100; // Keep last 100 data points
  private readonly PRICE_CHANGE_THRESHOLD = 0.15; // 15% price change threshold
  private readonly VOLUME_SPIKE_THRESHOLD = 3; // 3x normal volume
  private readonly DATA_FRESHNESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  constructor(logger: AdvancedLoggerService, redis: RedisService) {
    this.logger = logger;
    this.redis = redis;
    this.validationRules = new Map();
    this.initializeValidationRules();
  }

  private initializeValidationRules(): void {
    // Basic data integrity validation
    this.validationRules.set('basic_integrity', (data: StockData): ValidationResult => {
      const issues: string[] = [];
      let confidence = 1.0;

      if (!data.symbol || data.symbol.trim() === '') {
        issues.push('Missing or empty symbol');
        confidence -= 0.3;
      }

      if (data.price <= 0) {
        issues.push('Invalid price (must be positive)');
        confidence -= 0.4;
      }

      if (data.volume < 0) {
        issues.push('Invalid volume (cannot be negative)');
        confidence -= 0.2;
      }

      if (data.high < data.low) {
        issues.push('High price is less than low price');
        confidence -= 0.3;
      }

      if (data.price > data.high || data.price < data.low) {
        issues.push('Current price is outside high-low range');
        confidence -= 0.2;
      }

      return {
        isValid: issues.length === 0,
        confidence: Math.max(0, confidence),
        issues,
        source: data.source,
        timestamp: new Date().toISOString()
      };
    });

    // Price reasonableness validation
    this.validationRules.set('price_reasonableness', (data: StockData): ValidationResult => {
      const issues: string[] = [];
      let confidence = 1.0;

      // Check for extreme price changes
      if (data.changePercent && Math.abs(data.changePercent) > this.PRICE_CHANGE_THRESHOLD * 100) {
        issues.push(`Extreme price change: ${data.changePercent.toFixed(2)}%`);
        confidence -= 0.3;
      }

      // Check for unrealistic prices (Turkish stocks typically range from 0.01 to 1000 TL)
      if (data.price > 1000) {
        issues.push('Price seems unusually high for Turkish market');
        confidence -= 0.2;
      }

      if (data.price < 0.01) {
        issues.push('Price seems unusually low');
        confidence -= 0.2;
      }

      return {
        isValid: issues.length === 0,
        confidence: Math.max(0, confidence),
        issues,
        source: data.source,
        timestamp: new Date().toISOString()
      };
    });

    // Data freshness validation
    this.validationRules.set('data_freshness', (data: StockData): ValidationResult => {
      const issues: string[] = [];
      let confidence = 1.0;

      const dataAge = Date.now() - new Date(data.timestamp).getTime();
      
      if (dataAge > this.DATA_FRESHNESS_THRESHOLD) {
        issues.push(`Data is stale (${Math.round(dataAge / 1000 / 60)} minutes old)`);
        confidence -= Math.min(0.5, dataAge / (10 * 60 * 1000)); // Reduce confidence based on age
      }

      return {
        isValid: issues.length === 0,
        confidence: Math.max(0, confidence),
        issues,
        source: data.source,
        timestamp: new Date().toISOString()
      };
    });
  }

  async validateStockData(data: StockData): Promise<ValidationResult> {
    try {
      const allIssues: string[] = [];
      let totalConfidence = 0;
      let validationCount = 0;

      // Run all validation rules
      for (const [ruleName, rule] of this.validationRules) {
        try {
          const result = rule(data);
          allIssues.push(...result.issues.map(issue => `[${ruleName}] ${issue}`));
          totalConfidence += result.confidence;
          validationCount++;
        } catch (error) {
          this.logger.logError(`Validation rule ${ruleName} failed`, error as Error, { symbol: data.symbol });
          allIssues.push(`[${ruleName}] Validation rule execution failed`);
        }
      }

      const averageConfidence = validationCount > 0 ? totalConfidence / validationCount : 0;

      const result: ValidationResult = {
        isValid: allIssues.length === 0,
        confidence: averageConfidence,
        issues: allIssues,
        source: data.source,
        timestamp: new Date().toISOString()
      };

      // Cache validation result
      await this.cacheValidationResult(data.symbol, result);

      return result;
    } catch (error) {
      this.logger.logError('Stock data validation failed', error as Error, { symbol: data.symbol });
      return {
        isValid: false,
        confidence: 0,
        issues: ['Validation process failed'],
        source: data.source,
        timestamp: new Date().toISOString()
      };
    }
  }

  async crossValidateStockData(stockDataArray: StockData[]): Promise<CrossValidationResult> {
    if (stockDataArray.length === 0) {
      return {
        symbol: '',
        consensusData: null,
        validationResults: [],
        confidence: 0,
        anomalies: ['No data provided for cross-validation']
      };
    }

    const symbol = stockDataArray[0].symbol;
    const validationResults: ValidationResult[] = [];
    const anomalies: string[] = [];

    // Validate each data source
    for (const data of stockDataArray) {
      const validation = await this.validateStockData(data);
      validationResults.push(validation);
    }

    // Calculate consensus data
    const consensusData = this.calculateConsensusData(stockDataArray);
    
    // Detect anomalies between sources
    const crossSourceAnomalies = this.detectCrossSourceAnomalies(stockDataArray);
    anomalies.push(...crossSourceAnomalies);

    // Calculate overall confidence
    const validSources = validationResults.filter(r => r.isValid).length;
    const totalSources = validationResults.length;
    const validationConfidence = validSources / totalSources;
    const averageConfidence = validationResults.reduce((sum, r) => sum + r.confidence, 0) / totalSources;
    const overallConfidence = (validationConfidence + averageConfidence) / 2;

    return {
      symbol,
      consensusData,
      validationResults,
      confidence: overallConfidence,
      anomalies
    };
  }

  private calculateConsensusData(stockDataArray: StockData[]): StockData | null {
    if (stockDataArray.length === 0) return null;

    const validData = stockDataArray.filter(data => data.price > 0);
    if (validData.length === 0) return null;

    // Use weighted average based on source reliability
    const sourceWeights: Record<string, number> = {
      'yahoo_finance': 0.3,
      'is_yatirim': 0.25,
      'alpha_vantage': 0.25,
      'investing_com': 0.2
    };

    let totalWeight = 0;
    let weightedPrice = 0;
    let weightedVolume = 0;
    let weightedHigh = 0;
    let weightedLow = 0;
    let weightedOpen = 0;
    let weightedClose = 0;

    for (const data of validData) {
      const weight = sourceWeights[data.source] || 0.1;
      totalWeight += weight;
      weightedPrice += data.price * weight;
      weightedVolume += data.volume * weight;
      weightedHigh += data.high * weight;
      weightedLow += data.low * weight;
      weightedOpen += data.open * weight;
      weightedClose += data.close * weight;
    }

    if (totalWeight === 0) return validData[0];

    const consensusPrice = weightedPrice / totalWeight;
    const consensusClose = weightedClose / totalWeight;

    return {
      symbol: validData[0].symbol,
      price: consensusPrice,
      change: consensusPrice - consensusClose,
      changePercent: consensusClose > 0 ? ((consensusPrice - consensusClose) / consensusClose) * 100 : 0,
      volume: Math.round(weightedVolume / totalWeight),
      high: weightedHigh / totalWeight,
      low: weightedLow / totalWeight,
      open: weightedOpen / totalWeight,
      close: consensusClose,
      timestamp: new Date().toISOString(),
      source: 'consensus'
    };
  }

  private detectCrossSourceAnomalies(stockDataArray: StockData[]): string[] {
    const anomalies: string[] = [];
    
    if (stockDataArray.length < 2) return anomalies;

    const prices = stockDataArray.map(d => d.price).filter(p => p > 0);
    const volumes = stockDataArray.map(d => d.volume).filter(v => v > 0);

    // Check price variance between sources
    if (prices.length > 1) {
      const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
      const maxDeviation = Math.max(...prices.map(p => Math.abs(p - avgPrice) / avgPrice));
      
      if (maxDeviation > 0.05) { // 5% deviation threshold
        anomalies.push(`High price variance between sources: ${(maxDeviation * 100).toFixed(2)}%`);
      }
    }

    // Check volume variance between sources
    if (volumes.length > 1) {
      const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
      const maxVolumeDeviation = Math.max(...volumes.map(v => Math.abs(v - avgVolume) / avgVolume));
      
      if (maxVolumeDeviation > 0.5) { // 50% volume deviation threshold
        anomalies.push(`High volume variance between sources: ${(maxVolumeDeviation * 100).toFixed(2)}%`);
      }
    }

    return anomalies;
  }

  async detectAnomalies(data: StockData): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    try {
      // Get historical data for comparison
      const historical = await this.getHistoricalData(data.symbol);
      
      // Price spike detection
      if (historical.length > 0) {
        const recentPrices = historical.slice(-10).map(d => d.price);
        const avgPrice = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
        const priceDeviation = Math.abs(data.price - avgPrice) / avgPrice;
        
        if (priceDeviation > this.PRICE_CHANGE_THRESHOLD) {
          anomalies.push({
            hasAnomaly: true,
            anomalyType: 'price_spike',
            severity: priceDeviation > 0.3 ? 'high' : 'medium',
            description: `Price spike detected: ${(priceDeviation * 100).toFixed(2)}% deviation from recent average`,
            affectedFields: ['price', 'change', 'changePercent']
          });
        }
      }

      // Volume spike detection
      if (historical.length > 0) {
        const recentVolumes = historical.slice(-10).map(d => d.volume).filter(v => v > 0);
        if (recentVolumes.length > 0) {
          const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
          const volumeRatio = data.volume / avgVolume;
          
          if (volumeRatio > this.VOLUME_SPIKE_THRESHOLD) {
            anomalies.push({
              hasAnomaly: true,
              anomalyType: 'volume_spike',
              severity: volumeRatio > 5 ? 'high' : 'medium',
              description: `Volume spike detected: ${volumeRatio.toFixed(2)}x normal volume`,
              affectedFields: ['volume']
            });
          }
        }
      }

      // Data freshness check
      const dataAge = Date.now() - new Date(data.timestamp).getTime();
      if (dataAge > this.DATA_FRESHNESS_THRESHOLD) {
        anomalies.push({
          hasAnomaly: true,
          anomalyType: 'stale_data',
          severity: dataAge > 10 * 60 * 1000 ? 'high' : 'medium',
          description: `Stale data detected: ${Math.round(dataAge / 1000 / 60)} minutes old`,
          affectedFields: ['timestamp']
        });
      }

      // Store current data for future analysis
      await this.storeHistoricalData(data);

    } catch (error) {
      this.logger.logError('Anomaly detection failed', error as Error, { symbol: data.symbol });
    }

    return anomalies;
  }

  private async getHistoricalData(symbol: string): Promise<StockData[]> {
    try {
      const cached = this.historicalData.get(symbol);
      if (cached) return cached;

      // Try to load from Redis
      const redisKey = `historical:${symbol}`;
      const redisData = await this.redis.get(redisKey);
      if (redisData) {
        const parsed = JSON.parse(redisData) as StockData[];
        this.historicalData.set(symbol, parsed);
        return parsed;
      }

      return [];
    } catch (error) {
      this.logger.logError('Failed to get historical data', error as Error, { symbol });
      return [];
    }
  }

  private async storeHistoricalData(data: StockData): Promise<void> {
    try {
      const historical = await this.getHistoricalData(data.symbol);
      historical.push(data);
      
      // Keep only recent data
      if (historical.length > this.HISTORICAL_WINDOW) {
        historical.splice(0, historical.length - this.HISTORICAL_WINDOW);
      }
      
      this.historicalData.set(data.symbol, historical);
      
      // Store in Redis with 24 hour expiration
      const redisKey = `historical:${data.symbol}`;
      await this.redis.set(redisKey, JSON.stringify(historical), 24 * 60 * 60);
    } catch (error) {
      this.logger.logError('Failed to store historical data', error as Error, { symbol: data.symbol });
    }
  }

  private async cacheValidationResult(symbol: string, result: ValidationResult): Promise<void> {
    try {
      const cacheKey = `validation:${symbol}:${result.source}`;
      await this.redis.set(cacheKey, JSON.stringify(result), 300); // 5 minute cache
    } catch (error) {
      this.logger.logError('Failed to cache validation result', error as Error, { symbol });
    }
  }

  async getValidationStats(): Promise<{
    totalValidations: number;
    successRate: number;
    averageConfidence: number;
    commonIssues: Record<string, number>;
  }> {
    try {
      // This would typically be stored in a database
      // For now, return mock stats
      return {
        totalValidations: 0,
        successRate: 0.95,
        averageConfidence: 0.87,
        commonIssues: {
          'stale_data': 15,
          'price_variance': 8,
          'volume_spike': 5
        }
      };
    } catch (error) {
      this.logger.logError('Failed to get validation stats', error as Error);
      return {
        totalValidations: 0,
        successRate: 0,
        averageConfidence: 0,
        commonIssues: {}
      };
    }
  }
}