import { PriceData } from './patternRecognition.js';
import logger from '../utils/logger.js';

export interface PatternPoint {
  index: number;
  price: number;
  date: string;
  type: 'peak' | 'trough' | 'support' | 'resistance';
}

export interface FormationPattern {
  type: 'HEAD_AND_SHOULDERS' | 'INVERSE_HEAD_AND_SHOULDERS' | 'TRIANGLE' | 'FLAG' | 'PENNANT' | 
        'DOUBLE_TOP' | 'DOUBLE_BOTTOM' | 'CUP_AND_HANDLE' | 'WEDGE' | 'CHANNEL';
  name: string;
  confidence: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  keyPoints: PatternPoint[];
  entryPoint?: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  volume_confirmation: boolean;
  breakout_confirmed: boolean;
  formation_complete: boolean;
}

export interface TechnicalLevels {
  support: number[];
  resistance: number[];
  pivotPoints: PatternPoint[];
  trendLines: {
    support: { slope: number; intercept: number; strength: number }[];
    resistance: { slope: number; intercept: number; strength: number }[];
  };
}

export class AdvancedPatternDetection {
  private readonly MIN_PATTERN_POINTS = 5;
  private readonly NOISE_THRESHOLD = 0.02; // %2 gürültü eşiği
  private readonly VOLUME_CONFIRMATION_THRESHOLD = 1.2; // Hacim onayı için eşik

  /**
   * Ana pattern detection fonksiyonu
   */
  public detectFormations(priceData: PriceData[]): FormationPattern[] {
    if (priceData.length < this.MIN_PATTERN_POINTS) {
      return [];
    }

    logger.info(`Pattern detection başlatılıyor: ${priceData.length} veri noktası`);

    // Pivot noktalarını tespit et
    const pivotPoints = this.findPivotPoints(priceData);
    
    // Teknik seviyeleri hesapla
    const technicalLevels = this.calculateTechnicalLevels(priceData, pivotPoints);
    
    const patterns: FormationPattern[] = [];
    
    // Farklı pattern türlerini tespit et
    patterns.push(...this.detectHeadAndShoulders(priceData, pivotPoints));
    patterns.push(...this.detectDoubleTopBottom(priceData, pivotPoints));
    patterns.push(...this.detectTriangles(priceData, pivotPoints, technicalLevels));
    patterns.push(...this.detectFlags(priceData, pivotPoints));
    patterns.push(...this.detectCupAndHandle(priceData, pivotPoints));
    patterns.push(...this.detectWedges(priceData, pivotPoints, technicalLevels));
    
    // Pattern'ları güven seviyesine göre sırala
    patterns.sort((a, b) => b.confidence - a.confidence);
    
    logger.info(`Pattern detection tamamlandı: ${patterns.length} pattern tespit edildi`);
    
    return patterns;
  }

  /**
   * Pivot noktalarını (tepe ve dip noktaları) tespit et
   */
  private findPivotPoints(priceData: PriceData[]): PatternPoint[] {
    const pivots: PatternPoint[] = [];
    const lookback = 3; // Her iki yönde bakılacak nokta sayısı
    
    for (let i = lookback; i < priceData.length - lookback; i++) {
      const current = priceData[i];
      let isPeak = true;
      let isTrough = true;
      
      // Çevresindeki noktalarla karşılaştır
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j === i) continue;
        
        if (priceData[j].high >= current.high) isPeak = false;
        if (priceData[j].low <= current.low) isTrough = false;
      }
      
      if (isPeak) {
        pivots.push({
          index: i,
          price: current.high,
          date: current.date,
          type: 'peak'
        });
      }
      
      if (isTrough) {
        pivots.push({
          index: i,
          price: current.low,
          date: current.date,
          type: 'trough'
        });
      }
    }
    
    return pivots;
  }

  /**
   * Teknik seviyeleri hesapla
   */
  private calculateTechnicalLevels(priceData: PriceData[], pivotPoints: PatternPoint[]): TechnicalLevels {
    const support: number[] = [];
    const resistance: number[] = [];
    
    // Pivot noktalarından destek ve direnç seviyelerini çıkar
    const peaks = pivotPoints.filter(p => p.type === 'peak').map(p => p.price);
    const troughs = pivotPoints.filter(p => p.type === 'trough').map(p => p.price);
    
    // Benzer seviyeleri grupla
    resistance.push(...this.groupSimilarLevels(peaks));
    support.push(...this.groupSimilarLevels(troughs));
    
    // Trend çizgilerini hesapla
    const trendLines = this.calculateTrendLines(pivotPoints);
    
    return {
      support: support.sort((a, b) => b - a), // Yüksekten düşüğe
      resistance: resistance.sort((a, b) => a - b), // Düşükten yükseğe
      pivotPoints,
      trendLines
    };
  }

  /**
   * Benzer seviyeleri grupla
   */
  private groupSimilarLevels(levels: number[]): number[] {
    if (levels.length === 0) return [];
    
    const grouped: number[] = [];
    const sorted = [...levels].sort((a, b) => a - b);
    
    let currentGroup = [sorted[0]];
    
    for (let i = 1; i < sorted.length; i++) {
      const diff = Math.abs(sorted[i] - currentGroup[0]) / currentGroup[0];
      
      if (diff <= this.NOISE_THRESHOLD) {
        currentGroup.push(sorted[i]);
      } else {
        if (currentGroup.length >= 2) {
          grouped.push(currentGroup.reduce((a, b) => a + b) / currentGroup.length);
        }
        currentGroup = [sorted[i]];
      }
    }
    
    if (currentGroup.length >= 2) {
      grouped.push(currentGroup.reduce((a, b) => a + b) / currentGroup.length);
    }
    
    return grouped;
  }

  /**
   * Trend çizgilerini hesapla
   */
  private calculateTrendLines(pivotPoints: PatternPoint[]) {
    const supportLines: { slope: number; intercept: number; strength: number }[] = [];
    const resistanceLines: { slope: number; intercept: number; strength: number }[] = [];
    
    const peaks = pivotPoints.filter(p => p.type === 'peak');
    const troughs = pivotPoints.filter(p => p.type === 'trough');
    
    // Direnç çizgileri (tepe noktaları)
    for (let i = 0; i < peaks.length - 1; i++) {
      for (let j = i + 1; j < peaks.length; j++) {
        const line = this.calculateLineEquation(peaks[i], peaks[j]);
        const strength = this.calculateLineStrength(line, peaks);
        
        if (strength >= 0.6) {
          resistanceLines.push({ ...line, strength });
        }
      }
    }
    
    // Destek çizgileri (dip noktaları)
    for (let i = 0; i < troughs.length - 1; i++) {
      for (let j = i + 1; j < troughs.length; j++) {
        const line = this.calculateLineEquation(troughs[i], troughs[j]);
        const strength = this.calculateLineStrength(line, troughs);
        
        if (strength >= 0.6) {
          supportLines.push({ ...line, strength });
        }
      }
    }
    
    return {
      support: supportLines.sort((a, b) => b.strength - a.strength).slice(0, 3),
      resistance: resistanceLines.sort((a, b) => b.strength - a.strength).slice(0, 3)
    };
  }

  /**
   * İki nokta arasında çizgi denklemi hesapla
   */
  private calculateLineEquation(point1: PatternPoint, point2: PatternPoint) {
    const slope = (point2.price - point1.price) / (point2.index - point1.index);
    const intercept = point1.price - slope * point1.index;
    
    return { slope, intercept };
  }

  /**
   * Çizginin gücünü hesapla (kaç noktaya yakın geçtiği)
   */
  private calculateLineStrength(
    line: { slope: number; intercept: number }, 
    points: PatternPoint[]
  ): number {
    let touchCount = 0;
    
    for (const point of points) {
      const expectedPrice = line.slope * point.index + line.intercept;
      const diff = Math.abs(expectedPrice - point.price) / point.price;
      
      if (diff <= this.NOISE_THRESHOLD) {
        touchCount++;
      }
    }
    
    return touchCount / points.length;
  }

  /**
   * Baş ve Omuzlar pattern'ını tespit et
   */
  private detectHeadAndShoulders(priceData: PriceData[], pivotPoints: PatternPoint[]): FormationPattern[] {
    const patterns: FormationPattern[] = [];
    const peaks = pivotPoints.filter(p => p.type === 'peak');
    
    if (peaks.length < 3) return patterns;
    
    for (let i = 0; i < peaks.length - 2; i++) {
      const leftShoulder = peaks[i];
      const head = peaks[i + 1];
      const rightShoulder = peaks[i + 2];
      
      // Baş, omuzlardan yüksek olmalı
      if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
        // Omuzlar yaklaşık aynı seviyede olmalı
        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;
        
        if (shoulderDiff <= 0.05) { // %5 tolerans
          const neckline = (leftShoulder.price + rightShoulder.price) / 2;
          const confidence = this.calculateHeadAndShouldersConfidence(
            leftShoulder, head, rightShoulder, neckline, priceData
          );
          
          if (confidence >= 0.6) {
            patterns.push({
              type: 'HEAD_AND_SHOULDERS',
              name: 'Baş ve Omuzlar',
              confidence,
              direction: 'BEARISH',
              keyPoints: [leftShoulder, head, rightShoulder],
              entryPoint: neckline,
              targetPrice: neckline - (head.price - neckline),
              stopLoss: head.price,
              timeframe: this.calculateTimeframe(leftShoulder.index, rightShoulder.index),
              volume_confirmation: this.checkVolumeConfirmation(priceData, [leftShoulder, head, rightShoulder]),
              breakout_confirmed: false,
              formation_complete: true
            });
          }
        }
      }
      
      // Ters Baş ve Omuzlar (dip noktalarında)
      const troughs = pivotPoints.filter(p => p.type === 'trough');
      if (troughs.length >= 3) {
        for (let j = 0; j < troughs.length - 2; j++) {
          const leftShoulder = troughs[j];
          const head = troughs[j + 1];
          const rightShoulder = troughs[j + 2];
          
          if (head.price < leftShoulder.price && head.price < rightShoulder.price) {
            const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / leftShoulder.price;
            
            if (shoulderDiff <= 0.05) {
              const neckline = (leftShoulder.price + rightShoulder.price) / 2;
              const confidence = this.calculateHeadAndShouldersConfidence(
                leftShoulder, head, rightShoulder, neckline, priceData
              );
              
              if (confidence >= 0.6) {
                patterns.push({
                  type: 'INVERSE_HEAD_AND_SHOULDERS',
                  name: 'Ters Baş ve Omuzlar',
                  confidence,
                  direction: 'BULLISH',
                  keyPoints: [leftShoulder, head, rightShoulder],
                  entryPoint: neckline,
                  targetPrice: neckline + (neckline - head.price),
                  stopLoss: head.price,
                  timeframe: this.calculateTimeframe(leftShoulder.index, rightShoulder.index),
                  volume_confirmation: this.checkVolumeConfirmation(priceData, [leftShoulder, head, rightShoulder]),
                  breakout_confirmed: false,
                  formation_complete: true
                });
              }
            }
          }
        }
      }
    }
    
    return patterns;
  }

  /**
   * Çift Tepe/Dip pattern'ını tespit et
   */
  private detectDoubleTopBottom(priceData: PriceData[], pivotPoints: PatternPoint[]): FormationPattern[] {
    const patterns: FormationPattern[] = [];
    
    // Çift Tepe
    const peaks = pivotPoints.filter(p => p.type === 'peak');
    for (let i = 0; i < peaks.length - 1; i++) {
      const peak1 = peaks[i];
      const peak2 = peaks[i + 1];
      
      const priceDiff = Math.abs(peak1.price - peak2.price) / peak1.price;
      if (priceDiff <= 0.03) { // %3 tolerans
        const valley = this.findValleyBetween(priceData, peak1.index, peak2.index);
        if (valley && valley.price < peak1.price * 0.95) {
          patterns.push({
            type: 'DOUBLE_TOP',
            name: 'Çift Tepe',
            confidence: 0.8 - priceDiff * 10,
            direction: 'BEARISH',
            keyPoints: [peak1, valley, peak2],
            entryPoint: valley.price,
            targetPrice: valley.price - (peak1.price - valley.price),
            stopLoss: Math.max(peak1.price, peak2.price),
            timeframe: this.calculateTimeframe(peak1.index, peak2.index),
            volume_confirmation: this.checkVolumeConfirmation(priceData, [peak1, peak2]),
            breakout_confirmed: false,
            formation_complete: true
          });
        }
      }
    }
    
    // Çift Dip
    const troughs = pivotPoints.filter(p => p.type === 'trough');
    for (let i = 0; i < troughs.length - 1; i++) {
      const trough1 = troughs[i];
      const trough2 = troughs[i + 1];
      
      const priceDiff = Math.abs(trough1.price - trough2.price) / trough1.price;
      if (priceDiff <= 0.03) {
        const peak = this.findPeakBetween(priceData, trough1.index, trough2.index);
        if (peak && peak.price > trough1.price * 1.05) {
          patterns.push({
            type: 'DOUBLE_BOTTOM',
            name: 'Çift Dip',
            confidence: 0.8 - priceDiff * 10,
            direction: 'BULLISH',
            keyPoints: [trough1, peak, trough2],
            entryPoint: peak.price,
            targetPrice: peak.price + (peak.price - trough1.price),
            stopLoss: Math.min(trough1.price, trough2.price),
            timeframe: this.calculateTimeframe(trough1.index, trough2.index),
            volume_confirmation: this.checkVolumeConfirmation(priceData, [trough1, trough2]),
            breakout_confirmed: false,
            formation_complete: true
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Üçgen pattern'larını tespit et
   */
  private detectTriangles(priceData: PriceData[], pivotPoints: PatternPoint[], levels: TechnicalLevels): FormationPattern[] {
    const patterns: FormationPattern[] = [];
    
    // Yükselen üçgen, alçalan üçgen, simetrik üçgen tespiti
    // Bu karmaşık bir algoritma olduğu için basitleştirilmiş versiyon
    
    const recentPivots = pivotPoints.slice(-10); // Son 10 pivot
    if (recentPivots.length >= 4) {
      const peaks = recentPivots.filter(p => p.type === 'peak');
      const troughs = recentPivots.filter(p => p.type === 'trough');
      
      if (peaks.length >= 2 && troughs.length >= 2) {
        // Basit üçgen tespiti
        const peakTrend = this.calculateTrend(peaks);
        const troughTrend = this.calculateTrend(troughs);
        
        if (Math.abs(peakTrend) > 0.1 || Math.abs(troughTrend) > 0.1) {
          let triangleType: 'ASCENDING' | 'DESCENDING' | 'SYMMETRIC' = 'SYMMETRIC';
          let direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
          
          if (peakTrend > 0.1 && Math.abs(troughTrend) < 0.1) {
            triangleType = 'ASCENDING';
            direction = 'BULLISH';
          } else if (peakTrend < -0.1 && Math.abs(troughTrend) < 0.1) {
            triangleType = 'DESCENDING';
            direction = 'BEARISH';
          }
          
          patterns.push({
            type: 'TRIANGLE',
            name: `${triangleType === 'ASCENDING' ? 'Yükselen' : triangleType === 'DESCENDING' ? 'Alçalan' : 'Simetrik'} Üçgen`,
            confidence: 0.7,
            direction,
            keyPoints: [...peaks.slice(-2), ...troughs.slice(-2)],
            timeframe: this.calculateTimeframe(recentPivots[0].index, recentPivots[recentPivots.length - 1].index),
            volume_confirmation: false,
            breakout_confirmed: false,
            formation_complete: false
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Bayrak pattern'ını tespit et
   */
  private detectFlags(priceData: PriceData[], pivotPoints: PatternPoint[]): FormationPattern[] {
    const patterns: FormationPattern[] = [];
    
    // Bayrak pattern'ı: güçlü trend sonrası kısa konsolidasyon
    if (priceData.length >= 20) {
      const recent = priceData.slice(-20);
      const earlier = priceData.slice(-40, -20);
      
      // Önceki trend gücünü hesapla
      const trendStrength = (recent[0].close - earlier[0].close) / earlier[0].close;
      
      if (Math.abs(trendStrength) > 0.1) { // %10'dan fazla hareket
        // Son 10 günde konsolidasyon var mı?
        const consolidation = recent.slice(-10);
        const volatility = this.calculateVolatility(consolidation);
        
        if (volatility < 0.02) { // Düşük volatilite
          patterns.push({
            type: 'FLAG',
            name: 'Bayrak',
            confidence: 0.6,
            direction: trendStrength > 0 ? 'BULLISH' : 'BEARISH',
            keyPoints: [],
            timeframe: '10-20 gün',
            volume_confirmation: false,
            breakout_confirmed: false,
            formation_complete: false
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Fincan ve Kulp pattern'ını tespit et
   */
  private detectCupAndHandle(priceData: PriceData[], pivotPoints: PatternPoint[]): FormationPattern[] {
    const patterns: FormationPattern[] = [];
    
    // Fincan ve kulp pattern'ı karmaşık olduğu için basitleştirilmiş versiyon
    if (priceData.length >= 50) {
      const data = priceData.slice(-50);
      const firstQuarter = data.slice(0, 12);
      const middle = data.slice(12, 38);
      const lastQuarter = data.slice(38);
      
      const startPrice = firstQuarter[0].close;
      const endPrice = lastQuarter[lastQuarter.length - 1].close;
      const minPrice = Math.min(...middle.map(d => d.low));
      
      // Fincan şekli kontrolü
      if (minPrice < startPrice * 0.85 && endPrice > startPrice * 0.95) {
        patterns.push({
          type: 'CUP_AND_HANDLE',
          name: 'Fincan ve Kulp',
          confidence: 0.65,
          direction: 'BULLISH',
          keyPoints: [],
          entryPoint: startPrice,
          targetPrice: startPrice + (startPrice - minPrice),
          timeframe: '40-60 gün',
          volume_confirmation: false,
          breakout_confirmed: false,
          formation_complete: false
        });
      }
    }
    
    return patterns;
  }

  /**
   * Kama pattern'ını tespit et
   */
  private detectWedges(priceData: PriceData[], pivotPoints: PatternPoint[], levels: TechnicalLevels): FormationPattern[] {
    const patterns: FormationPattern[] = [];
    
    // Kama pattern'ı: daralan fiyat aralığı
    const recentPivots = pivotPoints.slice(-8);
    if (recentPivots.length >= 4) {
      const peaks = recentPivots.filter(p => p.type === 'peak');
      const troughs = recentPivots.filter(p => p.type === 'trough');
      
      if (peaks.length >= 2 && troughs.length >= 2) {
        const peakRange = Math.max(...peaks.map(p => p.price)) - Math.min(...peaks.map(p => p.price));
        const troughRange = Math.max(...troughs.map(p => p.price)) - Math.min(...troughs.map(p => p.price));
        
        // Daralan aralık kontrolü
        if (peakRange > 0 && troughRange > 0) {
          const convergence = 1 - Math.min(peakRange, troughRange) / Math.max(peakRange, troughRange);
          
          if (convergence > 0.3) {
            patterns.push({
              type: 'WEDGE',
              name: 'Kama',
              confidence: convergence,
              direction: 'NEUTRAL',
              keyPoints: [...peaks.slice(-2), ...troughs.slice(-2)],
              timeframe: this.calculateTimeframe(recentPivots[0].index, recentPivots[recentPivots.length - 1].index),
              volume_confirmation: false,
              breakout_confirmed: false,
              formation_complete: false
            });
          }
        }
      }
    }
    
    return patterns;
  }

  // Yardımcı fonksiyonlar
  private calculateHeadAndShouldersConfidence(
    leftShoulder: PatternPoint,
    head: PatternPoint,
    rightShoulder: PatternPoint,
    neckline: number,
    priceData: PriceData[]
  ): number {
    let confidence = 0.5;
    
    // Simetri kontrolü
    const symmetry = 1 - Math.abs(leftShoulder.price - rightShoulder.price) / Math.max(leftShoulder.price, rightShoulder.price);
    confidence += symmetry * 0.3;
    
    // Hacim kontrolü
    const volumeConfirmation = this.checkVolumeConfirmation(priceData, [leftShoulder, head, rightShoulder]);
    if (volumeConfirmation) confidence += 0.2;
    
    return Math.min(confidence, 0.95);
  }

  private checkVolumeConfirmation(priceData: PriceData[], keyPoints: PatternPoint[]): boolean {
    // Hacim onayı kontrolü - basitleştirilmiş
    for (const point of keyPoints) {
      if (point.index < priceData.length) {
        const volume = priceData[point.index].volume || 0;
        const avgVolume = this.calculateAverageVolume(priceData, point.index);
        
        if (volume > avgVolume * this.VOLUME_CONFIRMATION_THRESHOLD) {
          return true;
        }
      }
    }
    return false;
  }

  private calculateAverageVolume(priceData: PriceData[], index: number): number {
    const start = Math.max(0, index - 10);
    const end = Math.min(priceData.length, index + 10);
    const volumes = priceData.slice(start, end).map(d => d.volume || 0);
    
    return volumes.reduce((a, b) => a + b, 0) / volumes.length;
  }

  private findValleyBetween(priceData: PriceData[], start: number, end: number): PatternPoint | null {
    let minPrice = Infinity;
    let minIndex = -1;
    
    for (let i = start; i <= end; i++) {
      if (i < priceData.length && priceData[i].low < minPrice) {
        minPrice = priceData[i].low;
        minIndex = i;
      }
    }
    
    return minIndex >= 0 ? {
      index: minIndex,
      price: minPrice,
      date: priceData[minIndex].date,
      type: 'trough'
    } : null;
  }

  private findPeakBetween(priceData: PriceData[], start: number, end: number): PatternPoint | null {
    let maxPrice = -Infinity;
    let maxIndex = -1;
    
    for (let i = start; i <= end; i++) {
      if (i < priceData.length && priceData[i].high > maxPrice) {
        maxPrice = priceData[i].high;
        maxIndex = i;
      }
    }
    
    return maxIndex >= 0 ? {
      index: maxIndex,
      price: maxPrice,
      date: priceData[maxIndex].date,
      type: 'peak'
    } : null;
  }

  private calculateTimeframe(startIndex: number, endIndex: number): string {
    const days = endIndex - startIndex;
    if (days <= 7) return 'Kısa vadeli (1 hafta)';
    if (days <= 30) return 'Orta vadeli (1 ay)';
    if (days <= 90) return 'Uzun vadeli (3 ay)';
    return 'Çok uzun vadeli (3+ ay)';
  }

  private calculateTrend(points: PatternPoint[]): number {
    if (points.length < 2) return 0;
    
    const first = points[0];
    const last = points[points.length - 1];
    
    return (last.price - first.price) / first.price;
  }

  private calculateVolatility(priceData: PriceData[]): number {
    if (priceData.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < priceData.length; i++) {
      returns.push((priceData[i].close - priceData[i - 1].close) / priceData[i - 1].close);
    }
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }
}

export const advancedPatternDetection = new AdvancedPatternDetection();