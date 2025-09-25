#!/usr/bin/env node

// Comprehensive test script for BorsaVerileri2025 application
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

class ComprehensiveTest {
  constructor() {
    this.results = {
      apiTests: [],
      frontendTests: [],
      integrationTests: [],
      errors: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    console.log(logMessage);
  }

  async testApiEndpoint(endpoint, method = 'GET', body = null) {
    try {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (body) {
        options.body = JSON.stringify(body);
      }
      
      const response = await fetch(`http://localhost:3001${endpoint}`, options);
      const isHealthy = response.status === 200;
      
      console.log(`${isHealthy ? '✅' : '❌'} API ${method} ${endpoint}: ${response.status}`);
      
      if (!isHealthy) {
        const text = await response.text();
        console.log(`   Error: ${text}`);
      }
      
      return isHealthy;
    } catch (error) {
      console.log(`❌ API ${method} ${endpoint}: ${error.message}`);
      return false;
    }
  }

  async testFrontendAccess() {
    try {
      const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
      this.results.frontendTests.push({
        test: 'Frontend Access',
        success: true,
        status: response.status
      });
      this.results.summary.passed++;
      this.log('✅ Frontend accessible');
    } catch (error) {
      this.results.frontendTests.push({
        test: 'Frontend Access',
        success: false,
        error: error.message
      });
      this.results.summary.failed++;
      this.log(`❌ Frontend access failed: ${error.message}`, 'error');
    }
  }

  async testFileStructure() {
    const criticalFiles = [
      'src/components/StockAnalysis.tsx',
      'src/components/TradingSignals.tsx',
      'src/components/RiskAnalysisCard.tsx',
      'src/components/StockChart.tsx',
      'src/components/StockDataCard.tsx',
      'src/components/StockSearch.tsx',
      'src/components/Calculator.tsx',
      'src/hooks/useMarketSentiment.ts',
      'src/hooks/useRiskAnalysis.ts',
      'src/hooks/useTradingSignals.ts',
      'src/hooks/useAIPatterns.ts',
      'src/hooks/useAdvancedPatterns.ts',
      'src/hooks/usePatternRecognition.ts',
      'src/hooks/useTheme.ts',
      'src/utils/financialCalculations.ts',
      'src/utils/dataMapping.ts',
      'api/routes/stocks.ts',
      'api/services/financialCalculator.ts'
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        this.results.integrationTests.push({
          test: `File Structure - ${file}`,
          success: true
        });
        this.results.summary.passed++;
        this.log(`✅ File exists: ${file}`);
      } else {
        this.results.integrationTests.push({
          test: `File Structure - ${file}`,
          success: false,
          error: 'File not found'
        });
        this.results.summary.failed++;
        this.log(`❌ File missing: ${file}`, 'error');
      }
    }
  }

  async runApiTests() {
    this.log('🚀 Starting API Tests...');
    
    // Test stock endpoints
    await this.testApiEndpoint('/api/stocks/popular');
    await this.testApiEndpoint('/api/stocks/validate/THYAO');
    await this.testApiEndpoint('/api/stocks/price/THYAO');
    await this.testApiEndpoint('/api/stocks/financial/THYAO');
    await this.testApiEndpoint('/api/stocks/analysis/THYAO');
    
    // Test trading signals
    await this.testApiEndpoint('/api/trading-signals/THYAO');
    await this.testApiEndpoint('/api/trading-signals/portfolio-recommendation', 'POST', {
      portfolio: { totalValue: 100000, availableCash: 20000 },
      riskTolerance: 'MODERATE'
    });
    
    // Test pattern recognition
     await this.testApiEndpoint('/api/pattern-recognition/THYAO/summary');
     await this.testApiEndpoint('/api/advanced-patterns/THYAO/summary');
     await this.testApiEndpoint('/api/ai-patterns/THYAO/summary');
     
     // Test trading signals (POST endpoint)
     const mockMarketData = {
       marketData: {
         currentPrice: 100,
         volume: 1000000,
         high: 105,
         low: 95,
         open: 98
       }
     };
     await this.testApiEndpoint('/api/trading-signals/signal/THYAO', 'POST', mockMarketData);
     
     // Test technical analysis
      await this.testApiEndpoint('/api/technical-analysis/THYAO/rsi');
  }

  async runIntegrationTests() {
    this.log('🔧 Starting Integration Tests...');
    
    // Test file structure
    await this.testFileStructure();
    
    // Test frontend access
    await this.testFrontendAccess();
  }

  generateReport() {
    this.results.summary.total = this.results.summary.passed + this.results.summary.failed;
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.results.summary,
      successRate: ((this.results.summary.passed / this.results.summary.total) * 100).toFixed(2) + '%',
      details: this.results
    };

    // Write report to file
    fs.writeFileSync(
      path.join(process.cwd(), 'test-results.json'),
      JSON.stringify(report, null, 2)
    );

    // Console summary
    this.log('\n📊 TEST SUMMARY');
    this.log('================');
    this.log(`Total Tests: ${this.results.summary.total}`);
    this.log(`Passed: ${this.results.summary.passed}`);
    this.log(`Failed: ${this.results.summary.failed}`);
    this.log(`Success Rate: ${report.successRate}`);
    
    if (this.results.summary.failed > 0) {
      this.log('\n❌ FAILED TESTS:', 'error');
      [...this.results.apiTests, ...this.results.frontendTests, ...this.results.integrationTests]
        .filter(test => !test.success)
        .forEach(test => {
          this.log(`  - ${test.endpoint || test.test}: ${test.error}`, 'error');
        });
    }

    return report;
  }

  async run() {
    this.log('🎯 Starting Comprehensive Test Suite...');
    
    try {
      await this.runIntegrationTests();
      await this.runApiTests();
      
      const report = this.generateReport();
      
      this.log('\n✅ Test suite completed!');
      this.log(`Report saved to: test-results.json`);
      
      return report;
    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new ComprehensiveTest();
  tester.run()
    .then(report => {
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export default ComprehensiveTest;