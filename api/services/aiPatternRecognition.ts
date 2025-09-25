import logger from '../utils/logger';

export interface AIPatternResult {
  patternType: string;
  confidence: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  entryPoint: number;
  targetPrice: number;
  stopLoss: number;
  timeframe: string;
  description: string;
  riskReward: number;
}

export interface ChartPattern {
  id: string;
  name: string;
  type: 'HEAD_SHOULDERS' | 'TRIANGLE' | 'FLAG' | 'WEDGE' | 'CHANNEL' | 'DOUBLE_TOP' | 'DOUBLE_BOTTOM';
  subtype: string;
  points: { x: number; y: number }[];
  confidence: number;
  status: 'FORMING' | 'CONFIRMED' | 'BROKEN';
  detectedAt: string;
  validUntil: string;
}

export interface FormationTracking {
  currentFormations: ChartPattern[];
  completedFormations: ChartPattern[];
  potentialFormations: ChartPattern[];
  aiPredictions: {
    nextFormation: string;
    probability: number;
    expectedCompletion: string;
  }[];
}

class AIPatternRecognitionService {
  private patterns: Map<string, AIPatternResult[]> = new Map();
  private formations: Map<string, FormationTracking> = new Map();

  /**
   * Analyze chart patterns using AI algorithms
   */
  async analyzePatterns(symbol: string, priceData: any[], timeframe: string = '1D'): Promise<AIPatternResult[]> {
    try {
      logger.info(`Analyzing AI patterns for ${symbol} on ${timeframe}`);

      // Simulate AI pattern recognition
      const patterns = await this.detectPatterns(priceData, timeframe);
      
      // Cache results
      this.patterns.set(`${symbol}_${timeframe}`, patterns);
      
      return patterns;
    } catch (error) {
      logger.error('AI Pattern analysis error:', error as Error);
      throw new Error('AI pattern analysis failed');
    }
  }

  /**
   * Track chart formations in real-time
   */
  async trackFormations(symbol: string, priceData: any[]): Promise<FormationTracking> {
    try {
      logger.info(`Tracking formations for ${symbol}`);

      const formations = await this.detectFormations(priceData);
      
      // Cache formations
      this.formations.set(symbol, formations);
      
      return formations;
    } catch (error) {
      logger.error('Formation tracking error:', error as Error);
      throw new Error('Formation tracking failed');
    }
  }

  /**
   * Get AI-powered trading signals
   */
  async getAISignals(symbol: string, priceData: any[]): Promise<{
    signal: 'BUY' | 'SELL' | 'HOLD';
    strength: number;
    reasoning: string[];
    patterns: AIPatternResult[];
  }> {
    try {
      const patterns = await this.analyzePatterns(symbol, priceData);
      const formations = await this.trackFormations(symbol, priceData);

      // Calculate overall signal strength
      const bullishPatterns = patterns.filter(p => p.direction === 'BULLISH');
      const bearishPatterns = patterns.filter(p => p.direction === 'BEARISH');
      
      const bullishScore = bullishPatterns.reduce((sum, p) => sum + p.confidence, 0);
      const bearishScore = bearishPatterns.reduce((sum, p) => sum + p.confidence, 0);
      
      let signal: 'BUY' | 'SELL' | 'HOLD';
      let strength: number;
      const reasoning: string[] = [];

      if (bullishScore > bearishScore && bullishScore > 60) {
        signal = 'BUY';
        strength = Math.min(bullishScore, 100);
        reasoning.push(`${bullishPatterns.length} bullish patterns detected`);
        reasoning.push(`Average confidence: ${(bullishScore / bullishPatterns.length).toFixed(1)}%`);
      } else if (bearishScore > bullishScore && bearishScore > 60) {
        signal = 'SELL';
        strength = Math.min(bearishScore, 100);
        reasoning.push(`${bearishPatterns.length} bearish patterns detected`);
        reasoning.push(`Average confidence: ${(bearishScore / bearishPatterns.length).toFixed(1)}%`);
      } else {
        signal = 'HOLD';
        strength = 50;
        reasoning.push('Mixed or weak signals detected');
        reasoning.push('Waiting for clearer pattern confirmation');
      }

      // Add formation insights
      if (formations.currentFormations.length > 0) {
        reasoning.push(`${formations.currentFormations.length} active formations`);
      }

      return {
        signal,
        strength,
        reasoning,
        patterns
      };
    } catch (error) {
      logger.error('AI signals generation error:', error as Error);
      throw new Error('AI signals generation failed');
    }
  }

  /**
   * Detect chart patterns using AI algorithms
   */
  private async detectPatterns(priceData: any[], _timeframe: string): Promise<AIPatternResult[]> {
    // Simulate AI pattern detection
    const patterns: AIPatternResult[] = [];

    // Head and Shoulders detection
    const headShouldersPattern = this.detectHeadAndShoulders(priceData);
    if (headShouldersPattern) {
      patterns.push(headShouldersPattern);
    }

    // Triangle pattern detection
    const trianglePattern = this.detectTriangle(priceData);
    if (trianglePattern) {
      patterns.push(trianglePattern);
    }

    // Flag pattern detection
    const flagPattern = this.detectFlag(priceData);
    if (flagPattern) {
      patterns.push(flagPattern);
    }

    // Double top/bottom detection
    const doublePattern = this.detectDoubleTopBottom(priceData);
    if (doublePattern) {
      patterns.push(doublePattern);
    }

    return patterns;
  }

  /**
   * Detect chart formations
   */
  private async detectFormations(priceData: any[]): Promise<FormationTracking> {
    const currentFormations: ChartPattern[] = [];
    const completedFormations: ChartPattern[] = [];
    const potentialFormations: ChartPattern[] = [];

    // Simulate formation detection
    if (priceData.length > 20) {
      // Ascending triangle formation
      const ascendingTriangle: ChartPattern = {
        id: 'triangle_1',
        name: 'Ascending Triangle',
        type: 'TRIANGLE',
        subtype: 'ASCENDING',
        points: [
          { x: 0, y: priceData[0].close },
          { x: 10, y: priceData[10].close },
          { x: 20, y: priceData[20].close }
        ],
        confidence: 75,
        status: 'FORMING',
        detectedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      currentFormations.push(ascendingTriangle);
    }

    return {
      currentFormations,
      completedFormations,
      potentialFormations,
      aiPredictions: [
        {
          nextFormation: 'Breakout from Triangle',
          probability: 78,
          expectedCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
  }

  /**
   * Detect Head and Shoulders pattern
   */
  private detectHeadAndShoulders(priceData: any[]): AIPatternResult | null {
    if (priceData.length < 20) return null;

    // Simplified head and shoulders detection
    const recentData = priceData.slice(-20);
    const highs = recentData.map(d => d.high);
    const maxHigh = Math.max(...highs);
    const maxIndex = highs.indexOf(maxHigh);

    // Check for shoulder formation
    if (maxIndex > 5 && maxIndex < 15) {
      const leftShoulder = Math.max(...highs.slice(0, maxIndex - 2));
      const rightShoulder = Math.max(...highs.slice(maxIndex + 2));
      
      if (leftShoulder < maxHigh * 0.98 && rightShoulder < maxHigh * 0.98) {
        const neckline = Math.min(...recentData.map(d => d.low));
        
        return {
          patternType: 'Head and Shoulders',
          confidence: 72,
          direction: 'BEARISH',
          entryPoint: neckline * 0.99,
          targetPrice: neckline - (maxHigh - neckline),
          stopLoss: maxHigh * 1.02,
          timeframe: '1D',
          description: 'Bearish head and shoulders pattern forming',
          riskReward: 2.1
        };
      }
    }

    return null;
  }

  /**
   * Detect Triangle pattern
   */
  private detectTriangle(priceData: any[]): AIPatternResult | null {
    if (priceData.length < 15) return null;

    const recentData = priceData.slice(-15);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);
    
    // Check for converging trend lines
    const highTrend = this.calculateTrendSlope(highs);
    const lowTrend = this.calculateTrendSlope(lows);
    
    if (Math.abs(highTrend) < 0.1 && lowTrend > 0.1) {
      // Ascending triangle
      const resistance = Math.max(...highs);
      
      return {
        patternType: 'Ascending Triangle',
        confidence: 68,
        direction: 'BULLISH',
        entryPoint: resistance * 1.01,
        targetPrice: resistance + (resistance - Math.min(...lows)),
        stopLoss: Math.min(...lows) * 0.98,
        timeframe: '1D',
        description: 'Bullish ascending triangle pattern',
        riskReward: 2.5
      };
    }

    return null;
  }

  /**
   * Detect Flag pattern
   */
  private detectFlag(priceData: any[]): AIPatternResult | null {
    if (priceData.length < 10) return null;

    const recentData = priceData.slice(-10);
    const prices = recentData.map(d => d.close);
    
    // Check for consolidation after strong move
    const volatility = this.calculateVolatility(prices);
    const trend = this.calculateTrendSlope(prices);
    
    if (volatility < 0.02 && Math.abs(trend) < 0.05) {
      const flagHigh = Math.max(...prices);
      const flagLow = Math.min(...prices);
      
      return {
        patternType: 'Bull Flag',
        confidence: 65,
        direction: 'BULLISH',
        entryPoint: flagHigh * 1.005,
        targetPrice: flagHigh + (flagHigh - flagLow) * 2,
        stopLoss: flagLow * 0.995,
        timeframe: '1D',
        description: 'Bullish flag pattern consolidation',
        riskReward: 3.0
      };
    }

    return null;
  }

  /**
   * Detect Double Top/Bottom pattern
   */
  private detectDoubleTopBottom(priceData: any[]): AIPatternResult | null {
    if (priceData.length < 20) return null;

    const recentData = priceData.slice(-20);
    const highs = recentData.map(d => d.high);
    
    // Find two similar peaks
    const peaks = this.findPeaks(highs);
    if (peaks.length >= 2) {
      const lastTwoPeaks = peaks.slice(-2);
      const [peak1, peak2] = lastTwoPeaks;
      
      if (Math.abs(peak1.value - peak2.value) / peak1.value < 0.03) {
        const valley = Math.min(...highs.slice(peak1.index, peak2.index));
        
        return {
          patternType: 'Double Top',
          confidence: 70,
          direction: 'BEARISH',
          entryPoint: valley * 0.99,
          targetPrice: valley - (peak1.value - valley),
          stopLoss: Math.max(peak1.value, peak2.value) * 1.02,
          timeframe: '1D',
          description: 'Bearish double top pattern',
          riskReward: 2.2
        };
      }
    }

    return null;
  }

  /**
   * Calculate trend slope
   */
  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + i * val, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  /**
   * Calculate volatility
   */
  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance) / mean;
  }

  /**
   * Find peaks in data
   */
  private findPeaks(values: number[]): { index: number; value: number }[] {
    const peaks: { index: number; value: number }[] = [];
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
        peaks.push({ index: i, value: values[i] });
      }
    }
    
    return peaks;
  }

  /**
   * Get cached patterns
   */
  getCachedPatterns(symbol: string, timeframe: string): AIPatternResult[] | null {
    return this.patterns.get(`${symbol}_${timeframe}`) || null;
  }

  /**
   * Get cached formations
   */
  getCachedFormations(symbol: string): FormationTracking | null {
    return this.formations.get(symbol) || null;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.patterns.clear();
    this.formations.clear();
  }
}

export { AIPatternRecognitionService };
export const aiPatternRecognitionService = new AIPatternRecognitionService();
export default aiPatternRecognitionService;