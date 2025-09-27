import OpenAI from 'openai';
import logger from '../utils/logger.js';

// Trading signal interfaces
interface TradingSignal {
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  confidence: number; // 0-100
  price: number;
  targetPrice?: number;
  stopLoss?: number;
  timeframe: '1D' | '1W' | '1M' | '3M';
  reasoning: string;
  technicalFactors: string[];
  fundamentalFactors: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
}

interface MarketData {
  symbol: string;
  currentPrice: number;
  volume: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  pe?: number;
  technicalIndicators: {
    rsi?: number;
    macd?: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
    };
    sma20?: number;
    sma50?: number;
    sma200?: number;
  };
  patterns?: string[];
}

interface PortfolioContext {
  totalValue: number;
  availableCash: number;
  positions: {
    symbol: string;
    quantity: number;
    avgPrice: number;
    currentValue: number;
  }[];
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  investmentGoal: 'INCOME' | 'GROWTH' | 'BALANCED';
}

interface TradingRecommendation {
  signals: TradingSignal[];
  portfolioAdvice: {
    rebalancing: string[];
    riskAssessment: string;
    diversificationScore: number;
  };
  marketOutlook: {
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    keyFactors: string[];
    timeHorizon: string;
  };
  generatedAt: string;
}

class TradingSignalsService {
  private openai: OpenAI | null;
  private readonly MODEL = 'gpt-4';
  private readonly MAX_TOKENS = 2000;
  private readonly isApiKeyConfigured: boolean;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.isApiKeyConfigured = !!(apiKey && apiKey !== 'your-openai-api-key-here');
    
    if (this.isApiKeyConfigured) {
      this.openai = new OpenAI({
        apiKey: apiKey
      });
    } else {
      this.openai = null;
      console.warn('OpenAI API key not configured. Trading signals will use fallback logic.');
    }
  }

  // Ana trading sinyali üretme fonksiyonu
  async generateTradingSignal(symbol: string, marketData: MarketData, portfolioContext?: PortfolioContext): Promise<TradingSignal> {
    try {
      logger.info('Generating trading signal', { symbol, marketData: { price: marketData.currentPrice, volume: marketData.volume } });

      // OpenAI kullanılamıyorsa fallback logic kullan
      if (!this.isApiKeyConfigured || !this.openai) {
        return this.generateFallbackSignal(symbol, marketData, portfolioContext);
      }

      const prompt = this.buildTradingPrompt(symbol, marketData, portfolioContext);
      
      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'Sen uzman bir finansal analist ve trading uzmanısın. Verilen piyasa verilerini analiz ederek objektif ve güvenilir trading sinyalleri üretiyorsun. Yanıtların JSON formatında olmalı.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: this.MAX_TOKENS,
        temperature: 0.3
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('AI response is empty');
      }

      const signal = this.parseAIResponse(aiResponse, symbol, marketData);
      
      logger.info('Trading signal generated successfully', { 
        symbol, 
        action: signal.action, 
        confidence: signal.confidence 
      });

      return signal;
    } catch (error) {
      logger.error('Error generating trading signal', error as Error, { symbol });
      // OpenAI hatası durumunda fallback kullan
      return this.generateFallbackSignal(symbol, marketData, portfolioContext);
    }
  }

  // Çoklu hisse için toplu sinyal üretme
  async generateMultipleSignals(symbols: string[], marketDataMap: Map<string, MarketData>, portfolioContext?: PortfolioContext): Promise<TradingSignal[]> {
    try {
      const signals: TradingSignal[] = [];
      
      // Paralel işleme için Promise.all kullan
      const signalPromises = symbols.map(async (symbol) => {
        const marketData = marketDataMap.get(symbol);
        if (marketData) {
          return this.generateTradingSignal(symbol, marketData, portfolioContext);
        }
        return null;
      });

      const results = await Promise.allSettled(signalPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          signals.push(result.value);
        } else {
          logger.warn('Failed to generate signal for symbol', { symbol: symbols[index], error: result.status === 'rejected' ? result.reason : 'No market data' });
        }
      });

      return signals;
    } catch (error) {
      logger.error('Error generating multiple signals', error as Error, { symbolCount: symbols.length });
      throw new Error('Toplu sinyal üretimi başarısız');
    }
  }

  // Portföy bazlı kapsamlı öneri
  async generatePortfolioRecommendation(portfolioContext: PortfolioContext, marketDataMap: Map<string, MarketData>): Promise<TradingRecommendation> {
    let signals: TradingSignal[] = [];
    
    try {
      logger.info('Generating portfolio recommendation', { portfolioValue: portfolioContext.totalValue });

      // Mevcut pozisyonlar için sinyaller
      const positionSymbols = portfolioContext.positions.map(p => p.symbol);
      signals = await this.generateMultipleSignals(positionSymbols, marketDataMap, portfolioContext);

      // OpenAI kullanılamıyorsa fallback kullan
      if (!this.openai) {
        logger.warn('OpenAI not available, using fallback portfolio recommendation');
        return this.generateFallbackPortfolioRecommendation(portfolioContext, signals, marketDataMap);
      }

      // Portföy analizi için AI prompt
      const portfolioPrompt = this.buildPortfolioPrompt(portfolioContext, signals, marketDataMap);
      
      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: 'system',
            content: 'Sen uzman bir portföy yöneticisisin. Mevcut portföyü analiz ederek rebalancing, risk yönetimi ve yatırım önerileri sunuyorsun.'
          },
          {
            role: 'user',
            content: portfolioPrompt
          }
        ],
        max_tokens: this.MAX_TOKENS,
        temperature: 0.4
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('AI portfolio response is empty');
      }

      const recommendation = this.parsePortfolioResponse(aiResponse, signals);
      
      logger.info('Portfolio recommendation generated successfully', { 
        signalCount: signals.length,
        sentiment: recommendation.marketOutlook.sentiment
      });

      return recommendation;
    } catch (error) {
      logger.error('Error generating portfolio recommendation', error as Error);
      // OpenAI hatası durumunda fallback kullan
      return this.generateFallbackPortfolioRecommendation(portfolioContext, signals, marketDataMap);
    }
  }

  // Risk bazlı pozisyon boyutu hesaplama
  calculatePositionSize(signal: TradingSignal, portfolioContext: PortfolioContext): {
    recommendedAmount: number;
    maxRiskAmount: number;
    positionPercentage: number;
  } {
    const { availableCash, totalValue, riskTolerance } = portfolioContext;
    
    // Risk toleransına göre maksimum pozisyon yüzdesi
    const maxPositionPercent = {
      'CONSERVATIVE': 0.05, // %5
      'MODERATE': 0.10,     // %10
      'AGGRESSIVE': 0.15    // %15
    }[riskTolerance];

    // Sinyal gücüne göre ayarlama
    const strengthMultiplier = {
      'WEAK': 0.5,
      'MODERATE': 0.75,
      'STRONG': 1.0
    }[signal.strength];

    // Güven seviyesine göre ayarlama (0-100 -> 0.5-1.0)
    const confidenceMultiplier = 0.5 + (signal.confidence / 200);

    const baseAmount = totalValue * maxPositionPercent;
    const adjustedAmount = baseAmount * strengthMultiplier * confidenceMultiplier;
    const recommendedAmount = Math.min(adjustedAmount, availableCash * 0.8); // Nakit'in %80'i max

    // Stop loss bazlı risk hesaplama
    const riskPerShare = signal.stopLoss ? Math.abs(signal.price - signal.stopLoss) : signal.price * 0.05;
    const maxRiskAmount = totalValue * 0.02; // Portföyün %2'si max risk
    const maxSharesByRisk = maxRiskAmount / riskPerShare;
    const maxAmountByRisk = maxSharesByRisk * signal.price;

    const finalAmount = Math.min(recommendedAmount, maxAmountByRisk);

    return {
      recommendedAmount: Math.round(finalAmount),
      maxRiskAmount: Math.round(maxRiskAmount),
      positionPercentage: (finalAmount / totalValue) * 100
    };
  }

  // Trading prompt oluşturma
  private buildTradingPrompt(symbol: string, marketData: MarketData, portfolioContext?: PortfolioContext): string {
    const { currentPrice, volume, change, changePercent, technicalIndicators, patterns } = marketData;
    
    let prompt = `
Hisse Senedi: ${symbol}
Güncel Fiyat: ${currentPrice} TL
Günlük Değişim: ${change} TL (${changePercent}%)
Hacim: ${volume}

Teknik İndikatörler:
`;

    if (technicalIndicators.rsi) {
      prompt += `- RSI: ${technicalIndicators.rsi}\n`;
    }
    if (technicalIndicators.macd) {
      prompt += `- MACD: ${technicalIndicators.macd.macd}, Signal: ${technicalIndicators.macd.signal}\n`;
    }
    if (technicalIndicators.bollinger) {
      prompt += `- Bollinger Bands: Üst: ${technicalIndicators.bollinger.upper}, Alt: ${technicalIndicators.bollinger.lower}\n`;
    }
    if (technicalIndicators.sma20) {
      prompt += `- SMA20: ${technicalIndicators.sma20}\n`;
    }
    if (technicalIndicators.sma50) {
      prompt += `- SMA50: ${technicalIndicators.sma50}\n`;
    }

    if (patterns && patterns.length > 0) {
      prompt += `\nTespit Edilen Formasyonlar: ${patterns.join(', ')}\n`;
    }

    if (portfolioContext) {
      prompt += `\nPortföy Bağlamı:
- Risk Toleransı: ${portfolioContext.riskTolerance}
- Yatırım Hedefi: ${portfolioContext.investmentGoal}
- Mevcut Nakit: ${portfolioContext.availableCash} TL\n`;
    }

    prompt += `
Lütfen bu verileri analiz ederek aşağıdaki JSON formatında bir trading sinyali üret:
{
  "action": "BUY/SELL/HOLD",
  "strength": "WEAK/MODERATE/STRONG",
  "confidence": 85,
  "targetPrice": 150.50,
  "stopLoss": 140.00,
  "timeframe": "1W",
  "reasoning": "Detaylı analiz açıklaması",
  "technicalFactors": ["RSI oversold", "MACD bullish crossover"],
  "fundamentalFactors": ["Güçlü Q3 sonuçları"],
  "riskLevel": "MEDIUM"
}`;

    return prompt;
  }

  // Portföy prompt oluşturma
  private buildPortfolioPrompt(portfolioContext: PortfolioContext, signals: TradingSignal[], marketDataMap: Map<string, MarketData>): string {
    let prompt = `Portföy Analizi:\n\nToplam Değer: ${portfolioContext.totalValue} TL\nMevcut Nakit: ${portfolioContext.availableCash} TL\nRisk Toleransı: ${portfolioContext.riskTolerance}\nYatırım Hedefi: ${portfolioContext.investmentGoal}\n\nMevcut Pozisyonlar:\n`;

    portfolioContext.positions.forEach(position => {
      const marketData = marketDataMap.get(position.symbol);
      const currentPrice = marketData?.currentPrice || 0;
      const pnl = (currentPrice - position.avgPrice) * position.quantity;
      const pnlPercent = ((currentPrice - position.avgPrice) / position.avgPrice) * 100;
      
      prompt += `- ${position.symbol}: ${position.quantity} adet, Ort. ${position.avgPrice} TL, Güncel: ${currentPrice} TL, P&L: ${pnl.toFixed(2)} TL (${pnlPercent.toFixed(2)}%)\n`;
    });

    prompt += `\nÜretilen Trading Sinyalleri:\n`;
    signals.forEach(signal => {
      prompt += `- ${signal.symbol}: ${signal.action} (${signal.strength}, %${signal.confidence} güven)\n`;
    });

    prompt += `\nLütfen aşağıdaki JSON formatında portföy önerisi üret:\n{
  "portfolioAdvice": {
    "rebalancing": ["Öneri 1", "Öneri 2"],
    "riskAssessment": "Risk değerlendirmesi",
    "diversificationScore": 75
  },
  "marketOutlook": {
    "sentiment": "BULLISH/BEARISH/NEUTRAL",
    "keyFactors": ["Faktör 1", "Faktör 2"],
    "timeHorizon": "Zaman ufku açıklaması"
  }
}`;

    return prompt;
  }

  // AI yanıtını parse etme
  private parseAIResponse(aiResponse: string, symbol: string, marketData: MarketData): TradingSignal {
    try {
      // JSON'u extract et
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('JSON format bulunamadı');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        symbol,
        action: parsed.action || 'HOLD',
        strength: parsed.strength || 'MODERATE',
        confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
        price: marketData.currentPrice,
        targetPrice: parsed.targetPrice,
        stopLoss: parsed.stopLoss,
        timeframe: parsed.timeframe || '1W',
        reasoning: parsed.reasoning || 'Analiz tamamlandı',
        technicalFactors: parsed.technicalFactors || [],
        fundamentalFactors: parsed.fundamentalFactors || [],
        riskLevel: parsed.riskLevel || 'MEDIUM',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('AI response parsing failed, using fallback', { symbol, error });
      
      // Fallback sinyal
      return {
        symbol,
        action: 'HOLD',
        strength: 'WEAK',
        confidence: 30,
        price: marketData.currentPrice,
        timeframe: '1W',
        reasoning: 'AI analizi parse edilemedi, güvenli HOLD önerisi',
        technicalFactors: [],
        fundamentalFactors: [],
        riskLevel: 'HIGH',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Portföy yanıtını parse etme
  private parsePortfolioResponse(aiResponse: string, signals: TradingSignal[]): TradingRecommendation {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Portfolio JSON format bulunamadı');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        signals,
        portfolioAdvice: {
          rebalancing: parsed.portfolioAdvice?.rebalancing || [],
          riskAssessment: parsed.portfolioAdvice?.riskAssessment || 'Risk değerlendirmesi yapılamadı',
          diversificationScore: parsed.portfolioAdvice?.diversificationScore || 50
        },
        marketOutlook: {
          sentiment: parsed.marketOutlook?.sentiment || 'NEUTRAL',
          keyFactors: parsed.marketOutlook?.keyFactors || [],
          timeHorizon: parsed.marketOutlook?.timeHorizon || 'Belirsiz'
        },
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.warn('Portfolio response parsing failed, using fallback', { error });
      
      return {
        signals,
        portfolioAdvice: {
          rebalancing: ['Portföy analizi tamamlanamadı'],
          riskAssessment: 'Risk değerlendirmesi yapılamadı',
          diversificationScore: 50
        },
        marketOutlook: {
          sentiment: 'NEUTRAL',
          keyFactors: ['Analiz tamamlanamadı'],
          timeHorizon: 'Belirsiz'
        },
        generatedAt: new Date().toISOString()
      };
    }
  }

  // Fallback sinyal üretme (OpenAI olmadan)
  private generateFallbackSignal(symbol: string, marketData: MarketData, portfolioContext?: PortfolioContext): TradingSignal {
    const { currentPrice, changePercent, technicalIndicators } = marketData;
    
    let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' = 'WEAK';
    let confidence = 40;
    const reasoning = 'Basit teknik analiz (OpenAI kullanılamıyor)';
    const technicalFactors: string[] = [];
    
    // Basit RSI analizi
    if (technicalIndicators.rsi) {
      if (technicalIndicators.rsi < 30) {
        action = 'BUY';
        confidence += 15;
        technicalFactors.push('RSI oversold');
      } else if (technicalIndicators.rsi > 70) {
        action = 'SELL';
        confidence += 15;
        technicalFactors.push('RSI overbought');
      }
    }
    
    // Günlük değişim analizi
    if (Math.abs(changePercent) > 5) {
      if (changePercent > 5) {
        if (action !== 'SELL') action = 'HOLD'; // Aşırı yükseliş, dikkatli ol
        technicalFactors.push('Güçlü yükseliş');
      } else {
        if (action !== 'BUY') action = 'HOLD'; // Aşırı düşüş, dikkatli ol
        technicalFactors.push('Güçlü düşüş');
      }
    }
    
    // SMA analizi
    if (technicalIndicators.sma20 && technicalIndicators.sma50) {
      if (currentPrice > technicalIndicators.sma20 && technicalIndicators.sma20 > technicalIndicators.sma50) {
        if (action === 'HOLD') action = 'BUY';
        confidence += 10;
        technicalFactors.push('Fiyat SMA üzerinde');
      } else if (currentPrice < technicalIndicators.sma20 && technicalIndicators.sma20 < technicalIndicators.sma50) {
        if (action === 'HOLD') action = 'SELL';
        confidence += 10;
        technicalFactors.push('Fiyat SMA altında');
      }
    }
    
    // Güven seviyesini ayarla
    confidence = Math.min(confidence, 60); // Fallback max %60 güven
    
    if (action !== 'HOLD') {
      strength = confidence > 50 ? 'MODERATE' : 'WEAK';
    }
    
    return {
      symbol,
      action,
      strength,
      confidence,
      price: currentPrice,
      targetPrice: action === 'BUY' ? currentPrice * 1.05 : action === 'SELL' ? currentPrice * 0.95 : undefined,
      stopLoss: action === 'BUY' ? currentPrice * 0.95 : action === 'SELL' ? currentPrice * 1.05 : undefined,
      timeframe: '1W',
      reasoning,
      technicalFactors,
      fundamentalFactors: [],
      riskLevel: 'MEDIUM',
      timestamp: new Date().toISOString()
    };
  }

  // Fallback portföy önerisi (OpenAI olmadan)
  private generateFallbackPortfolioRecommendation(portfolioContext: PortfolioContext, signals: TradingSignal[], marketDataMap: Map<string, MarketData>): TradingRecommendation {
    const { totalValue, availableCash, positions, riskTolerance } = portfolioContext;
    
    // Basit portföy analizi
    let totalPnL = 0;
    let winningPositions = 0;
    let losingPositions = 0;
    
    positions.forEach(position => {
      const marketData = marketDataMap.get(position.symbol);
      if (marketData) {
        const pnl = (marketData.currentPrice - position.avgPrice) * position.quantity;
        totalPnL += pnl;
        if (pnl > 0) winningPositions++;
        else if (pnl < 0) losingPositions++;
      }
    });
    
    const totalPnLPercent = (totalPnL / totalValue) * 100;
    
    // Basit piyasa duyarlılığı
    let bullishSignals = 0;
    let bearishSignals = 0;
    signals.forEach(signal => {
      if (signal.action === 'BUY') bullishSignals++;
      else if (signal.action === 'SELL') bearishSignals++;
    });
    
    const sentiment = bullishSignals > bearishSignals ? 'BULLISH' : bearishSignals > bullishSignals ? 'BEARISH' : 'NEUTRAL';
    
    // Basit öneriler
    const recommendations: string[] = [];
    
    if (totalPnLPercent < -10) {
      recommendations.push('Portföyünüzde %10\'dan fazla kayıp var, risk yönetimini gözden geçirin');
    }
    
    if (availableCash / totalValue > 0.3) {
      recommendations.push('Yüksek nakit oranınız var, değerlendirme fırsatlarını araştırın');
    }
    
    if (positions.length < 5 && riskTolerance !== 'CONSERVATIVE') {
      recommendations.push('Portföy çeşitlendirmesi için daha fazla hisse ekleyebilirsiniz');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Mevcut portföy dengesi makul görünüyor');
    }
    
    return {
      signals,
      marketOutlook: {
        sentiment: sentiment as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
        confidence: 45, // Fallback düşük güven
        keyFactors: ['Basit teknik analiz', 'Portföy performansı'],
        timeframe: '1W'
      },
      riskAssessment: {
        overallRisk: totalPnLPercent < -15 ? 'HIGH' : totalPnLPercent > 10 ? 'LOW' : 'MEDIUM',
        diversificationScore: Math.min(positions.length * 20, 100),
        recommendations
      },
      rebalancing: {
        suggestedActions: signals.filter(s => s.action !== 'HOLD').map(s => ({
          symbol: s.symbol,
          action: s.action,
          percentage: 5, // Basit %5 önerisi
          reasoning: s.reasoning
        })),
        cashAllocation: Math.max(10, Math.min(30, availableCash / totalValue * 100))
      },
      timestamp: new Date().toISOString()
    };
  }

  // Sinyal geçmişi ve performans takibi
  async getSignalPerformance(symbol: string, days: number = 30): Promise<{
    totalSignals: number;
    successfulSignals: number;
    successRate: number;
    averageReturn: number;
    bestSignal: { date: string; return: number };
    worstSignal: { date: string; return: number };
  }> {
    // Bu fonksiyon veritabanı entegrasyonu gerektirir
    // Şimdilik mock data döndürüyoruz
    return {
      totalSignals: 15,
      successfulSignals: 11,
      successRate: 73.3,
      averageReturn: 4.2,
      bestSignal: { date: '2024-01-15', return: 12.5 },
      worstSignal: { date: '2024-01-08', return: -3.2 }
    };
  }
}

export default TradingSignalsService;
export { TradingSignal, MarketData, PortfolioContext, TradingRecommendation };