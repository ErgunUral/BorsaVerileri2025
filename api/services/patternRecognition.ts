import OpenAI from 'openai';
import logger from '../utils/logger.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export interface ChartPattern {
  type: 'HEAD_AND_SHOULDERS' | 'INVERSE_HEAD_AND_SHOULDERS' | 'TRIANGLE' | 'FLAG' | 'PENNANT' | 'DOUBLE_TOP' | 'DOUBLE_BOTTOM' | 'CUP_AND_HANDLE' | 'WEDGE' | 'CHANNEL';
  confidence: number;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  timeframe: string;
  description: string;
  targetPrice?: number;
  stopLoss?: number;
  entryPoint?: number;
}

export interface PatternAnalysisResult {
  patterns: ChartPattern[];
  overallTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  recommendation: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  analysis: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

class PatternRecognitionService {
  private formatPriceDataForAI(priceData: PriceData[]): string {
    const recentData = priceData.slice(-50); // Son 50 günlük veri
    
    let formattedData = "Fiyat Verileri (Son 50 Gün):\n";
    formattedData += "Tarih,Açılış,Yüksek,Düşük,Kapanış,Hacim\n";
    
    recentData.forEach(data => {
      formattedData += `${data.date},${data.open},${data.high},${data.low},${data.close},${data.volume}\n`;
    });
    
    return formattedData;
  }

  private calculateTechnicalLevels(priceData: PriceData[]): {
    support: number[];
    resistance: number[];
    pivotPoints: number[];
  } {
    const recentData = priceData.slice(-20);
    const highs = recentData.map(d => d.high);
    const lows = recentData.map(d => d.low);
    
    // Basit destek ve direnç seviyeleri
    const support = [Math.min(...lows), ...lows.filter((low, i) => 
      i > 0 && i < lows.length - 1 && 
      low < lows[i-1] && low < lows[i+1]
    )].slice(0, 3);
    
    const resistance = [Math.max(...highs), ...highs.filter((high, i) => 
      i > 0 && i < highs.length - 1 && 
      high > highs[i-1] && high > highs[i+1]
    )].slice(0, 3);
    
    const pivotPoints = recentData.map(d => (d.high + d.low + d.close) / 3);
    
    return { support, resistance, pivotPoints };
  }

  async analyzePatterns(symbol: string, priceData: PriceData[]): Promise<PatternAnalysisResult> {
    try {
      if (!priceData || priceData.length < 20) {
        throw new Error('Yeterli fiyat verisi bulunamadı (minimum 20 gün gerekli)');
      }

      const formattedData = this.formatPriceDataForAI(priceData);
      const technicalLevels = this.calculateTechnicalLevels(priceData);
      const currentPrice = priceData[priceData.length - 1].close;
      
      const prompt = `
Sen bir uzman teknik analist ve chart pattern recognition uzmanısın. Aşağıdaki ${symbol} hisse senedinin fiyat verilerini analiz et ve grafik formasyonlarını tespit et.

${formattedData}

Teknik Seviyeler:
Destek Seviyeleri: ${technicalLevels.support.join(', ')}
Direnç Seviyeleri: ${technicalLevels.resistance.join(', ')}
Mevcut Fiyat: ${currentPrice}

Lütfen aşağıdaki formatta analiz yap:

1. TESPİT EDİLEN FORMASYONLAR:
   - Formasyon türü (Head and Shoulders, Triangle, Flag, vb.)
   - Güven seviyesi (0-100)
   - Yön (Bullish/Bearish/Neutral)
   - Açıklama
   - Hedef fiyat (varsa)
   - Stop loss seviyesi (varsa)

2. GENEL TREND ANALİZİ:
   - Ana trend yönü
   - Güven seviyesi
   - Risk seviyesi

3. YATIRIM ÖNERİSİ:
   - Öneri (Strong Buy/Buy/Hold/Sell/Strong Sell)
   - Gerekçe
   - Giriş noktası önerisi

4. RİSK DEĞERLENDİRMESİ:
   - Risk seviyesi (Low/Medium/High)
   - Potansiyel riskler

Analizi Türkçe yap ve teknik analiz terminolojisini kullan.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "Sen uzman bir teknik analist ve chart pattern recognition uzmanısın. Finansal verileri analiz ederek grafik formasyonlarını tespit ediyorsun."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const aiAnalysis = completion.choices[0]?.message?.content || '';
      
      // AI yanıtını parse et ve yapılandır
      const patterns = this.parseAIResponse(aiAnalysis, currentPrice);
      
      const result: PatternAnalysisResult = {
        patterns,
        overallTrend: this.determineOverallTrend(patterns, priceData),
        confidence: this.calculateOverallConfidence(patterns),
        recommendation: this.generateRecommendation(patterns),
        analysis: aiAnalysis,
        riskLevel: this.assessRiskLevel(patterns, priceData)
      };

      logger.info(`Pattern analysis completed for ${symbol}:`, {
        patternsFound: patterns.length,
        overallTrend: result.overallTrend,
        recommendation: result.recommendation
      });

      return result;

    } catch (error) {
      logger.error('Pattern recognition error:', error);
      throw new Error(`Pattern analizi sırasında hata: ${error.message}`);
    }
  }

  private parseAIResponse(aiResponse: string, currentPrice: number): ChartPattern[] {
    const patterns: ChartPattern[] = [];
    
    // Basit parsing - gerçek uygulamada daha sofistike olmalı
    const lines = aiResponse.split('\n');
    let currentPattern: Partial<ChartPattern> = {};
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (lowerLine.includes('head and shoulders')) {
        currentPattern.type = lowerLine.includes('inverse') ? 'INVERSE_HEAD_AND_SHOULDERS' : 'HEAD_AND_SHOULDERS';
      } else if (lowerLine.includes('triangle')) {
        currentPattern.type = 'TRIANGLE';
      } else if (lowerLine.includes('flag')) {
        currentPattern.type = 'FLAG';
      } else if (lowerLine.includes('double top')) {
        currentPattern.type = 'DOUBLE_TOP';
      } else if (lowerLine.includes('double bottom')) {
        currentPattern.type = 'DOUBLE_BOTTOM';
      } else if (lowerLine.includes('cup and handle')) {
        currentPattern.type = 'CUP_AND_HANDLE';
      }
      
      if (lowerLine.includes('bullish') || lowerLine.includes('yükseliş')) {
        currentPattern.direction = 'BULLISH';
      } else if (lowerLine.includes('bearish') || lowerLine.includes('düşüş')) {
        currentPattern.direction = 'BEARISH';
      }
      
      // Güven seviyesi parse et
      const confidenceMatch = line.match(/(\d+)%/);
      if (confidenceMatch) {
        currentPattern.confidence = parseInt(confidenceMatch[1]) / 100;
      }
      
      // Pattern tamamlandıysa ekle
      if (currentPattern.type && currentPattern.direction && currentPattern.confidence) {
        patterns.push({
          type: currentPattern.type,
          confidence: currentPattern.confidence,
          direction: currentPattern.direction,
          timeframe: 'daily',
          description: line.trim(),
          entryPoint: currentPrice
        });
        currentPattern = {};
      }
    }
    
    // Eğer hiç pattern bulunamadıysa, genel trend analizi yap
    if (patterns.length === 0) {
      const generalPattern: ChartPattern = {
        type: 'CHANNEL',
        confidence: 0.5,
        direction: 'NEUTRAL',
        timeframe: 'daily',
        description: 'Genel trend analizi',
        entryPoint: currentPrice
      };
      patterns.push(generalPattern);
    }
    
    return patterns;
  }

  private determineOverallTrend(patterns: ChartPattern[], priceData: PriceData[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    const bullishCount = patterns.filter(p => p.direction === 'BULLISH').length;
    const bearishCount = patterns.filter(p => p.direction === 'BEARISH').length;
    
    // Fiyat momentum kontrolü
    const recentPrices = priceData.slice(-10).map(d => d.close);
    const priceChange = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0];
    
    if (bullishCount > bearishCount && priceChange > 0.02) {
      return 'BULLISH';
    } else if (bearishCount > bullishCount && priceChange < -0.02) {
      return 'BEARISH';
    }
    
    return 'NEUTRAL';
  }

  private calculateOverallConfidence(patterns: ChartPattern[]): number {
    if (patterns.length === 0) return 0;
    
    const avgConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private generateRecommendation(patterns: ChartPattern[]): 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL' {
    const bullishPatterns = patterns.filter(p => p.direction === 'BULLISH');
    const bearishPatterns = patterns.filter(p => p.direction === 'BEARISH');
    
    const bullishScore = bullishPatterns.reduce((sum, p) => sum + p.confidence, 0);
    const bearishScore = bearishPatterns.reduce((sum, p) => sum + p.confidence, 0);
    
    const netScore = bullishScore - bearishScore;
    
    if (netScore > 1.5) return 'STRONG_BUY';
    if (netScore > 0.5) return 'BUY';
    if (netScore < -1.5) return 'STRONG_SELL';
    if (netScore < -0.5) return 'SELL';
    
    return 'HOLD';
  }

  private assessRiskLevel(patterns: ChartPattern[], priceData: PriceData[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    // Volatilite hesapla
    const recentPrices = priceData.slice(-20).map(d => d.close);
    const returns = recentPrices.slice(1).map((price, i) => 
      (price - recentPrices[i]) / recentPrices[i]
    );
    
    const volatility = Math.sqrt(
      returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length
    );
    
    // Pattern güvenilirliği
    const avgConfidence = this.calculateOverallConfidence(patterns);
    
    if (volatility > 0.05 || avgConfidence < 0.4) return 'HIGH';
    if (volatility > 0.03 || avgConfidence < 0.6) return 'MEDIUM';
    
    return 'LOW';
  }

  async getPatternHistory(symbol: string, days: number = 30): Promise<any[]> {
    // Bu method pattern geçmişini takip etmek için kullanılabilir
    // Şimdilik basit bir implementasyon
    return [];
  }
}

export const patternRecognitionService = new PatternRecognitionService();
export default PatternRecognitionService;