import express from 'express';
import TradingSignalsService, { MarketData, PortfolioContext } from '../services/tradingSignals';
import logger from '../utils/logger.js';

const router = express.Router();
const tradingService = new TradingSignalsService();

// Tekil hisse için trading sinyali
router.post('/signal/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const marketData: MarketData = req.body.marketData;
    const portfolioContext: PortfolioContext | undefined = req.body.portfolioContext;

    // Validation
    if (!marketData || !marketData.currentPrice) {
      return res.status(400).json({
        error: 'Market data is required with currentPrice'
      });
    }

    const signal = await tradingService.generateTradingSignal(symbol, marketData, portfolioContext);
    
    // Pozisyon boyutu hesaplama (eğer portföy context varsa)
    let positionSizing = null;
    if (portfolioContext) {
      positionSizing = tradingService.calculatePositionSize(signal, portfolioContext);
    }

    res.json({
      success: true,
      data: {
        signal,
        positionSizing
      }
    });

    logger.info('Trading signal generated via API', { 
      symbol, 
      action: signal.action, 
      confidence: signal.confidence 
    });

  } catch (error) {
    logger.error('Error in trading signal API', error as Error, { symbol: req.params.symbol });
    res.status(500).json({
      error: 'Trading sinyali üretilemedi',
      message: (error as Error).message
    });
  }
});

// Çoklu hisse için trading sinyalleri
router.post('/signals/multiple', async (req, res) => {
  try {
    const { symbols, marketDataMap, portfolioContext } = req.body;

    // Validation
    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: 'Symbols array is required'
      });
    }

    if (!marketDataMap || typeof marketDataMap !== 'object') {
      return res.status(400).json({
        error: 'Market data map is required'
      });
    }

    // Map'i Map objesine çevir
    const dataMap = new Map<string, MarketData>();
    Object.entries(marketDataMap).forEach(([symbol, data]) => {
      dataMap.set(symbol, data as MarketData);
    });

    const signals = await tradingService.generateMultipleSignals(symbols, dataMap, portfolioContext);
    
    // Her sinyal için pozisyon boyutu hesaplama
    const signalsWithSizing = signals.map(signal => {
      let positionSizing = null;
      if (portfolioContext) {
        positionSizing = tradingService.calculatePositionSize(signal, portfolioContext);
      }
      return {
        signal,
        positionSizing
      };
    });

    res.json({
      success: true,
      data: {
        signals: signalsWithSizing,
        summary: {
          totalSignals: signals.length,
          buySignals: signals.filter(s => s.action === 'BUY').length,
          sellSignals: signals.filter(s => s.action === 'SELL').length,
          holdSignals: signals.filter(s => s.action === 'HOLD').length,
          averageConfidence: signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
        }
      }
    });

    logger.info('Multiple trading signals generated via API', { 
      symbolCount: symbols.length,
      signalCount: signals.length
    });

  } catch (error) {
    logger.error('Error in multiple trading signals API', error as Error);
    res.status(500).json({
      error: 'Toplu trading sinyalleri üretilemedi',
      message: (error as Error).message
    });
  }
});

// Portföy bazlı kapsamlı öneri
router.post('/portfolio/recommendation', async (req, res) => {
  try {
    const { portfolioContext, marketDataMap } = req.body;

    // Validation
    if (!portfolioContext || !portfolioContext.positions || !Array.isArray(portfolioContext.positions)) {
      return res.status(400).json({
        error: 'Portfolio context with positions array is required'
      });
    }

    if (!marketDataMap || typeof marketDataMap !== 'object') {
      return res.status(400).json({
        error: 'Market data map is required'
      });
    }

    // Map'i Map objesine çevir
    const dataMap = new Map<string, MarketData>();
    Object.entries(marketDataMap).forEach(([symbol, data]) => {
      dataMap.set(symbol, data as MarketData);
    });

    const recommendation = await tradingService.generatePortfolioRecommendation(portfolioContext, dataMap);
    
    // Portföy metrikleri hesaplama
    const portfolioMetrics = {
      totalValue: portfolioContext.totalValue,
      cashPercentage: (portfolioContext.availableCash / portfolioContext.totalValue) * 100,
      positionCount: portfolioContext.positions.length,
      largestPosition: Math.max(...portfolioContext.positions.map(p => p.currentValue)),
      smallestPosition: Math.min(...portfolioContext.positions.map(p => p.currentValue)),
      averagePositionSize: portfolioContext.positions.reduce((sum, p) => sum + p.currentValue, 0) / portfolioContext.positions.length
    };

    res.json({
      success: true,
      data: {
        recommendation,
        portfolioMetrics,
        riskAnalysis: {
          riskTolerance: portfolioContext.riskTolerance,
          diversificationScore: recommendation.portfolioAdvice.diversificationScore,
          recommendedActions: recommendation.portfolioAdvice.rebalancing.length
        }
      }
    });

    logger.info('Portfolio recommendation generated via API', { 
      portfolioValue: portfolioContext.totalValue,
      positionCount: portfolioContext.positions.length,
      sentiment: recommendation.marketOutlook.sentiment
    });

  } catch (error) {
    logger.error('Error in portfolio recommendation API', error as Error);
    res.status(500).json({
      error: 'Portföy önerisi üretilemedi',
      message: (error as Error).message
    });
  }
});

// Sinyal performans analizi
router.get('/performance/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { days = 30 } = req.query;

    const performance = await tradingService.getSignalPerformance(symbol, Number(days));

    res.json({
      success: true,
      data: {
        symbol,
        period: `${days} days`,
        performance
      }
    });

    logger.info('Signal performance retrieved via API', { symbol, days });

  } catch (error) {
    logger.error('Error in signal performance API', error as Error, { symbol: req.params.symbol });
    res.status(500).json({
      error: 'Sinyal performansı alınamadı',
      message: (error as Error).message
    });
  }
});

// Piyasa sentiment analizi
router.post('/market/sentiment', async (req, res) => {
  try {
    const { symbols, marketDataMap } = req.body;

    if (!symbols || !Array.isArray(symbols) || !marketDataMap) {
      return res.status(400).json({
        error: 'Symbols array and market data map are required'
      });
    }

    // Map'i Map objesine çevir
    const dataMap = new Map<string, MarketData>();
    Object.entries(marketDataMap).forEach(([symbol, data]) => {
      dataMap.set(symbol, data as MarketData);
    });

    // Tüm hisseler için sinyal üret
    const signals = await tradingService.generateMultipleSignals(symbols, dataMap);
    
    // Sentiment analizi
    const bullishCount = signals.filter(s => s.action === 'BUY').length;
    const bearishCount = signals.filter(s => s.action === 'SELL').length;
    const neutralCount = signals.filter(s => s.action === 'HOLD').length;
    
    const totalSignals = signals.length;
    const bullishPercentage = (bullishCount / totalSignals) * 100;
    const bearishPercentage = (bearishCount / totalSignals) * 100;
    
    let overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    if (bullishPercentage > 50) {
      overallSentiment = 'BULLISH';
    } else if (bearishPercentage > 40) {
      overallSentiment = 'BEARISH';
    } else {
      overallSentiment = 'NEUTRAL';
    }

    // Güven seviyesi ortalaması
    const averageConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / totalSignals;
    
    // En güçlü sinyaller
    const strongSignals = signals
      .filter(s => s.strength === 'STRONG' && s.confidence > 70)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        overallSentiment,
        confidence: Math.round(averageConfidence),
        distribution: {
          bullish: bullishCount,
          bearish: bearishCount,
          neutral: neutralCount,
          bullishPercentage: Math.round(bullishPercentage),
          bearishPercentage: Math.round(bearishPercentage)
        },
        strongSignals: strongSignals.map(s => ({
          symbol: s.symbol,
          action: s.action,
          confidence: s.confidence,
          reasoning: s.reasoning.substring(0, 100) + '...'
        })),
        marketFactors: {
          volatilityLevel: 'MEDIUM', // Bu gerçek volatilite hesaplaması ile değiştirilmeli
          trendDirection: overallSentiment,
          riskLevel: averageConfidence > 70 ? 'LOW' : averageConfidence > 50 ? 'MEDIUM' : 'HIGH'
        },
        generatedAt: new Date().toISOString()
      }
    });

    logger.info('Market sentiment analysis completed via API', { 
      symbolCount: symbols.length,
      sentiment: overallSentiment,
      confidence: averageConfidence
    });

  } catch (error) {
    logger.error('Error in market sentiment API', error as Error);
    res.status(500).json({
      error: 'Piyasa sentiment analizi yapılamadı',
      message: (error as Error).message
    });
  }
});

// Risk analizi endpoint'i
router.post('/risk/analysis', async (req, res) => {
  try {
    const { portfolioContext, marketDataMap } = req.body;

    if (!portfolioContext || !marketDataMap) {
      return res.status(400).json({
        error: 'Portfolio context and market data map are required'
      });
    }

    // Map'i Map objesine çevir
    const dataMap = new Map<string, MarketData>();
    Object.entries(marketDataMap).forEach(([symbol, data]) => {
      dataMap.set(symbol, data as MarketData);
    });

    // Portföy pozisyonları için risk analizi
    const positionRisks = portfolioContext.positions.map(position => {
      const marketData = dataMap.get(position.symbol);
      if (!marketData) return null;

      const currentValue = position.quantity * marketData.currentPrice;
      const portfolioWeight = (currentValue / portfolioContext.totalValue) * 100;
      
      // Volatilite tahmini (basit hesaplama)
      const volatility = Math.abs(marketData.changePercent) * 2; // Günlük değişimin 2 katı
      
      // Risk seviyesi belirleme
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      if (portfolioWeight > 20 || volatility > 5) {
        riskLevel = 'HIGH';
      } else if (portfolioWeight > 10 || volatility > 3) {
        riskLevel = 'MEDIUM';
      } else {
        riskLevel = 'LOW';
      }

      return {
        symbol: position.symbol,
        currentValue,
        portfolioWeight,
        volatility,
        riskLevel,
        recommendation: riskLevel === 'HIGH' ? 'Pozisyon boyutunu azalt' : 
                       riskLevel === 'MEDIUM' ? 'Yakından takip et' : 'Uygun seviyede'
      };
    }).filter(Boolean);

    // Genel portföy risk metrikleri
    const totalRisk = positionRisks.reduce((sum, pos) => sum + (pos!.volatility * pos!.portfolioWeight / 100), 0);
    const highRiskPositions = positionRisks.filter(pos => pos!.riskLevel === 'HIGH').length;
    const concentrationRisk = Math.max(...positionRisks.map(pos => pos!.portfolioWeight));
    
    let overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    if (totalRisk > 15 || highRiskPositions > 2 || concentrationRisk > 25) {
      overallRiskLevel = 'HIGH';
    } else if (totalRisk > 8 || highRiskPositions > 0 || concentrationRisk > 15) {
      overallRiskLevel = 'MEDIUM';
    } else {
      overallRiskLevel = 'LOW';
    }

    // Risk azaltma önerileri
    const recommendations = [];
    if (concentrationRisk > 20) {
      recommendations.push('En büyük pozisyonu küçültmeyi düşünün');
    }
    if (highRiskPositions > 1) {
      recommendations.push('Yüksek riskli pozisyonları gözden geçirin');
    }
    if (portfolioContext.availableCash / portfolioContext.totalValue < 0.1) {
      recommendations.push('Nakit rezervini artırın');
    }
    if (positionRisks.length < 5) {
      recommendations.push('Portföy çeşitlendirmesini artırın');
    }

    res.json({
      success: true,
      data: {
        overallRiskLevel,
        riskScore: Math.round(totalRisk * 10), // 0-100 arası skor
        positionRisks,
        portfolioMetrics: {
          totalPositions: positionRisks.length,
          highRiskPositions,
          concentrationRisk: Math.round(concentrationRisk),
          cashPercentage: Math.round((portfolioContext.availableCash / portfolioContext.totalValue) * 100)
        },
        recommendations,
        generatedAt: new Date().toISOString()
      }
    });

    logger.info('Risk analysis completed via API', { 
      portfolioValue: portfolioContext.totalValue,
      riskLevel: overallRiskLevel,
      positionCount: positionRisks.length
    });

  } catch (error) {
    logger.error('Error in risk analysis API', error as Error);
    res.status(500).json({
      error: 'Risk analizi yapılamadı',
      message: (error as Error).message
    });
  }
});

export default router;