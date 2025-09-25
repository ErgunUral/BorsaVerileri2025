import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield, 
  Brain, 
  Activity,
  BarChart3,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Star
} from 'lucide-react';
import { useAIPatterns } from '../hooks/useAIPatterns';

interface AIPatternAnalysisProps {
  symbol: string;
  timeframe?: string;
}

const AIPatternAnalysis: React.FC<AIPatternAnalysisProps> = ({ 
  symbol, 
  timeframe = '1D' 
}) => {
  const {
    patterns,
    formations,
    signals,
    comprehensiveAnalysis,
    isLoading,
    isLoadingFormations,
    isLoadingSignals,
    isLoadingComprehensive,
    error,
    analyzePatterns,
    trackFormations,
    getSignals,
    getComprehensiveAnalysis,
    clearError,
    highConfidencePatterns,
    currentFormations
  } = useAIPatterns();

  const [activeTab, setActiveTab] = useState('comprehensive');

  useEffect(() => {
    if (symbol) {
      getComprehensiveAnalysis(symbol, timeframe);
    }
  }, [symbol, timeframe, getComprehensiveAnalysis]);

  const handleRefresh = () => {
    if (activeTab === 'comprehensive') {
      getComprehensiveAnalysis(symbol, timeframe);
    } else if (activeTab === 'patterns') {
      analyzePatterns(symbol, timeframe, true);
    } else if (activeTab === 'formations') {
      trackFormations(symbol, true);
    } else if (activeTab === 'signals') {
      getSignals(symbol);
    }
  };

  const getPatternIcon = (type: string) => {
    switch (type) {
      case 'BULLISH_FLAG':
      case 'INVERSE_HEAD_SHOULDERS':
      case 'DOUBLE_BOTTOM':
      case 'CUP_HANDLE':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'BEARISH_FLAG':
      case 'HEAD_SHOULDERS':
      case 'DOUBLE_TOP':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50';
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'BUY': return 'text-green-600 bg-green-50';
      case 'SELL': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'HIGH': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          {error}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearError}
            className="ml-2"
          >
            Dismiss
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            AI Pattern Analysis
          </h2>
          <Badge variant="outline" className="bg-purple-50 text-purple-700">
            {symbol}
          </Badge>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isLoadingComprehensive}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingComprehensive ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="comprehensive">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="formations">Formations</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
        </TabsList>

        <TabsContent value="comprehensive" className="space-y-4">
          {isLoadingComprehensive ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Analyzing patterns...</span>
            </div>
          ) : comprehensiveAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Overall Score */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Star className="h-4 w-4 mr-2 text-yellow-500" />
                    Overall Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(comprehensiveAnalysis.comprehensiveScore.overallRating)}%
                  </div>
                  <Progress 
                    value={comprehensiveAnalysis.comprehensiveScore.overallRating} 
                    className="mt-2" 
                  />
                </CardContent>
              </Card>

              {/* Trading Recommendation */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Target className="h-4 w-4 mr-2 text-blue-500" />
                    Recommendation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getSignalColor(comprehensiveAnalysis.analysis.recommendation)}>
                    {comprehensiveAnalysis.analysis.recommendation}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-2">
                    Confidence: {comprehensiveAnalysis.analysis.confidence}%
                  </div>
                </CardContent>
              </Card>

              {/* Risk Level */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-orange-500" />
                    Risk Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={getRiskColor(comprehensiveAnalysis.analysis.riskLevel)}>
                    {comprehensiveAnalysis.analysis.riskLevel}
                  </Badge>
                  <div className="text-sm text-gray-600 mt-2">
                    Time Horizon: {comprehensiveAnalysis.analysis.timeHorizon}
                  </div>
                </CardContent>
              </Card>

              {/* Key Factors */}
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-green-500" />
                    Key Analysis Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {comprehensiveAnalysis.analysis.keyFactors.map((factor, index) => (
                      <div key={`factor-${index}`} className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{factor}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No comprehensive analysis available
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Detecting patterns...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Detected Patterns</h3>
                <div className="flex space-x-2">
                  <Badge variant="outline">
                    {patterns.length} Total
                  </Badge>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {highConfidencePatterns.length} High Confidence
                  </Badge>
                </div>
              </div>
              
              {patterns.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patterns.map((pattern) => (
                    <Card key={pattern.id || `pattern-${pattern.type}-${Math.random()}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center justify-between">
                          <div className="flex items-center">
                            {getPatternIcon(pattern.type)}
                            <span className="ml-2">{pattern.type ? pattern.type.replace('_', ' ') : 'Unknown Pattern'}</span>
                          </div>
                          <Badge className={getConfidenceColor(pattern.confidence || 0)}>
                            {pattern.confidence || 0}%
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-2">{pattern.description || 'No description available'}</p>
                        <div className="space-y-1 text-xs text-gray-500">
                          <div>Period: {pattern.startDate || 'N/A'} - {pattern.endDate || 'N/A'}</div>
                          {pattern.targetPrice && (
                            <div>Target: ${(pattern.targetPrice || 0).toFixed(2)}</div>
                          )}
                          {pattern.stopLoss && (
                            <div>Stop Loss: ${(pattern.stopLoss || 0).toFixed(2)}</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No patterns detected
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="formations" className="space-y-4">
          {isLoadingFormations ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Tracking formations...</span>
            </div>
          ) : formations ? (
            <div className="space-y-4">
              {/* Current Formations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-blue-500" />
                    Active Formations ({currentFormations.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentFormations.length > 0 ? (
                    <div className="space-y-3">
                      {currentFormations.map((formation) => (
                        <div key={formation.id || `formation-${formation.type}-${Math.random()}`} className="border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{formation.type || 'Unknown Formation'}</span>
                            <Badge 
                              variant={(formation.stage || '') === 'CONFIRMED' ? 'default' : 'outline'}
                            >
                              {formation.stage || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span>Progress</span>
                              <span>{formation.progress || 0}%</span>
                            </div>
                            <Progress value={formation.progress || 0} className="h-2" />
                            <div className="text-xs text-gray-500">
                              Est. Completion: {formation.estimatedCompletion || 'N/A'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No active formations
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Formation Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <BarChart3 className="h-4 w-4 mr-2 text-green-500" />
                    Formation Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {formations.statistics?.totalFormations || 0}
                      </div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formations.statistics?.successRate || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formations.statistics?.averageAccuracy || 0}%
                      </div>
                      <div className="text-xs text-gray-500">Avg Accuracy</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {formations.statistics?.bestPerformingPattern || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">Best Pattern</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No formation data available
            </div>
          )}
        </TabsContent>

        <TabsContent value="signals" className="space-y-4">
          {isLoadingSignals ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
              <span className="ml-2 text-gray-600">Generating signals...</span>
            </div>
          ) : signals ? (
            <div className="space-y-4">
              {/* Main Signal */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center">
                    <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                    AI Trading Signal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`${getSignalColor(signals.signal || 'HOLD')} text-lg px-4 py-2`}>
                      {signals.signal || 'HOLD'}
                    </Badge>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Strength</div>
                      <div className="text-xl font-bold">{signals.strength || 0}%</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Price Targets</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Conservative:</span>
                          <span className="font-medium">${signals.priceTargets?.conservative || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Moderate:</span>
                          <span className="font-medium">${signals.priceTargets?.moderate || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Aggressive:</span>
                          <span className="font-medium">${signals.priceTargets?.aggressive || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Risk Management</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Entry Price:</span>
                          <span className="font-medium">${signals.entryPrice || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Stop Loss:</span>
                          <span className="font-medium text-red-600">${signals.stopLoss || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Risk Level:</span>
                          <Badge className={getRiskColor(signals.riskLevel || 'MEDIUM')}>
                            {signals.riskLevel || 'MEDIUM'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Signal Reasoning */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Analysis Reasoning</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(signals.reasoning || []).map((reason, index) => (
                      <div key={`reason-${index}`} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{reason}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No signal data available
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIPatternAnalysis;