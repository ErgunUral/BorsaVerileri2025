import { StockPrice } from './stockScraper.js';

export interface TechnicalIndicatorResult {
  value: number;
  signal: 'BUY' | 'SELL' | 'HOLD';
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  timestamp: Date;
}

export interface RSIResult extends TechnicalIndicatorResult {
  period: number;
  overbought: boolean;
  oversold: boolean;
}

export interface MACDResult {
  macd: number;
  signal: number;
  histogram: number;
  crossover: 'BULLISH' | 'BEARISH' | 'NONE';
  trend: 'BUY' | 'SELL' | 'HOLD';
  timestamp: Date;
}

export interface BollingerBandsResult {
  upperBand: number;
  middleBand: number;
  lowerBand: number;
  position: 'ABOVE_UPPER' | 'BETWEEN' | 'BELOW_LOWER';
  squeeze: boolean;
  signal: 'BUY' | 'SELL' | 'HOLD';
  timestamp: Date;
}

export interface PriceData {
  close: number;
  high: number;
  low: number;
  volume: number;
  timestamp: Date;
}

export class TechnicalIndicators {
  /**
   * RSI (Relative Strength Index) hesaplar
   * @param prices Fiyat verileri dizisi
   * @param period RSI periyodu (varsayılan: 14)
   * @returns RSI sonucu
   */
  static calculateRSI(prices: number[], period: number = 14): RSIResult | null {
    if (prices.length < period + 1) {
      return null;
    }

    const gains: number[] = [];
    const losses: number[] = [];

    // Günlük değişimleri hesapla
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    // İlk ortalama kazanç ve kayıp
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Smoothed averages hesapla
    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    const overbought = rsi > 70;
    const oversold = rsi < 30;

    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK';

    if (oversold) {
      signal = 'BUY';
      strength = rsi < 20 ? 'STRONG' : 'MODERATE';
    } else if (overbought) {
      signal = 'SELL';
      strength = rsi > 80 ? 'STRONG' : 'MODERATE';
    }

    return {
      value: rsi,
      signal,
      strength,
      period,
      overbought,
      oversold,
      timestamp: new Date()
    };
  }

  /**
   * MACD (Moving Average Convergence Divergence) hesaplar
   * @param prices Fiyat verileri dizisi
   * @param fastPeriod Hızlı EMA periyodu (varsayılan: 12)
   * @param slowPeriod Yavaş EMA periyodu (varsayılan: 26)
   * @param signalPeriod Sinyal EMA periyodu (varsayılan: 9)
   * @returns MACD sonucu
   */
  static calculateMACD(
    prices: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): MACDResult | null {
    if (prices.length < slowPeriod + signalPeriod) {
      return null;
    }

    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);

    if (!fastEMA || !slowEMA) {
      return null;
    }

    // MACD line = Fast EMA - Slow EMA
    const macdLine: number[] = [];
    const startIndex = slowPeriod - 1;
    
    for (let i = startIndex; i < fastEMA.length; i++) {
      macdLine.push(fastEMA[i] - slowEMA[i - startIndex]);
    }

    // Signal line = EMA of MACD line
    const signalEMA = this.calculateEMA(macdLine, signalPeriod);
    if (!signalEMA) {
      return null;
    }

    const macd = macdLine[macdLine.length - 1];
    const signal = signalEMA[signalEMA.length - 1];
    const histogram = macd - signal;

    // Crossover detection
    let crossover: 'BULLISH' | 'BEARISH' | 'NONE' = 'NONE';
    if (macdLine.length > 1 && signalEMA.length > 1) {
      const prevMACD = macdLine[macdLine.length - 2];
      const prevSignal = signalEMA[signalEMA.length - 2];
      
      if (prevMACD <= prevSignal && macd > signal) {
        crossover = 'BULLISH';
      } else if (prevMACD >= prevSignal && macd < signal) {
        crossover = 'BEARISH';
      }
    }

    let trend: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (crossover === 'BULLISH' || (macd > signal && histogram > 0)) {
      trend = 'BUY';
    } else if (crossover === 'BEARISH' || (macd < signal && histogram < 0)) {
      trend = 'SELL';
    }

    return {
      macd,
      signal,
      histogram,
      crossover,
      trend,
      timestamp: new Date()
    };
  }

  /**
   * Bollinger Bands hesaplar
   * @param prices Fiyat verileri dizisi
   * @param period Periyot (varsayılan: 20)
   * @param stdDev Standart sapma çarpanı (varsayılan: 2)
   * @returns Bollinger Bands sonucu
   */
  static calculateBollingerBands(
    prices: number[],
    period: number = 20,
    stdDev: number = 2
  ): BollingerBandsResult | null {
    if (prices.length < period) {
      return null;
    }

    // Son period kadar fiyatı al
    const recentPrices = prices.slice(-period);
    
    // Simple Moving Average (Middle Band)
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;
    
    // Standard Deviation hesapla
    const variance = recentPrices.reduce((sum, price) => {
      return sum + Math.pow(price - sma, 2);
    }, 0) / period;
    
    const standardDeviation = Math.sqrt(variance);
    
    // Bands hesapla
    const upperBand = sma + (stdDev * standardDeviation);
    const lowerBand = sma - (stdDev * standardDeviation);
    const currentPrice = prices[prices.length - 1];
    
    // Position belirleme
    let position: 'ABOVE_UPPER' | 'BETWEEN' | 'BELOW_LOWER';
    if (currentPrice > upperBand) {
      position = 'ABOVE_UPPER';
    } else if (currentPrice < lowerBand) {
      position = 'BELOW_LOWER';
    } else {
      position = 'BETWEEN';
    }
    
    // Squeeze detection (bands daraldığında)
    const bandWidth = (upperBand - lowerBand) / sma;
    const squeeze = bandWidth < 0.1; // %10'dan az genişlik
    
    // Signal belirleme
    let signal: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    if (position === 'BELOW_LOWER') {
      signal = 'BUY'; // Oversold
    } else if (position === 'ABOVE_UPPER') {
      signal = 'SELL'; // Overbought
    }
    
    return {
      upperBand,
      middleBand: sma,
      lowerBand,
      position,
      squeeze,
      signal,
      timestamp: new Date()
    };
  }

  /**
   * Exponential Moving Average hesaplar
   * @param prices Fiyat verileri dizisi
   * @param period Periyot
   * @returns EMA dizisi
   */
  private static calculateEMA(prices: number[], period: number): number[] | null {
    if (prices.length < period) {
      return null;
    }

    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // İlk EMA = SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema.push(sum / period);
    
    // Sonraki EMA'lar
    for (let i = period; i < prices.length; i++) {
      const currentEMA = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(currentEMA);
    }
    
    return ema;
  }

  /**
   * Birden fazla teknik indikatörü birleştirerek genel sinyal üretir
   * @param prices Fiyat verileri dizisi
   * @returns Birleşik analiz sonucu
   */
  static getCombinedSignal(prices: number[]): {
    rsi: RSIResult | null;
    macd: MACDResult | null;
    bollinger: BollingerBandsResult | null;
    overallSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
    confidence: number;
  } {
    const rsi = this.calculateRSI(prices);
    const macd = this.calculateMACD(prices);
    const bollinger = this.calculateBollingerBands(prices);
    
    let buySignals = 0;
    let sellSignals = 0;
    let totalSignals = 0;
    
    if (rsi) {
      totalSignals++;
      if (rsi.signal === 'BUY') buySignals++;
      else if (rsi.signal === 'SELL') sellSignals++;
    }
    
    if (macd) {
      totalSignals++;
      if (macd.trend === 'BUY') buySignals++;
      else if (macd.trend === 'SELL') sellSignals++;
    }
    
    if (bollinger) {
      totalSignals++;
      if (bollinger.signal === 'BUY') buySignals++;
      else if (bollinger.signal === 'SELL') sellSignals++;
    }
    
    let overallSignal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' = 'HOLD';
    const confidence = totalSignals > 0 ? Math.max(buySignals, sellSignals) / totalSignals : 0;
    
    if (buySignals >= 2 && buySignals > sellSignals) {
      overallSignal = confidence >= 0.8 ? 'STRONG_BUY' : 'BUY';
    } else if (sellSignals >= 2 && sellSignals > buySignals) {
      overallSignal = confidence >= 0.8 ? 'STRONG_SELL' : 'SELL';
    }
    
    return {
      rsi,
      macd,
      bollinger,
      overallSignal,
      confidence
    };
  }
}

export default TechnicalIndicators;