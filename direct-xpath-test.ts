import { IsYatirimScraper } from './api/scrapers/isYatirimScraper.js';
import { AdvancedLoggerService } from './api/services/advancedLoggerService.js';
import { ErrorHandlingService } from './api/services/errorHandlingService.js';

async function testXPathScraper() {
  console.log('🚀 Direct XPath Scraper Test');
  console.log('============================================================');
  
  const logger = new AdvancedLoggerService();
  const errorHandler = new ErrorHandlingService(logger);
  const scraper = new IsYatirimScraper(logger, errorHandler);
  
  const symbols = ['ASELS', 'THYAO', 'AKBNK'];
  
  for (const symbol of symbols) {
    console.log(`\n📊 Testing ${symbol}...`);
    console.log('----------------------------------------');
    
    try {
      // Test optimized XPath method
      console.log('Testing optimized XPath method...');
      const result = await scraper.getStockDataOptimizedXPath(symbol);
      
      if (result && result.price) {
        console.log(`✅ Success - Price: ${result.price}, Change: ${result.change}`);
        console.log(`   Volume: ${result.volume}, High: ${result.high}, Low: ${result.low}`);
      } else {
        console.log('❌ Failed - No data returned');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      // Fallback to standard XPath method
      try {
        console.log('Trying standard XPath method...');
        const fallbackResult = await scraper.getStockDataWithXPath(symbol);
        
        if (fallbackResult && fallbackResult.price) {
          console.log(`✅ Fallback Success - Price: ${fallbackResult.price}`);
        } else {
          console.log('❌ Fallback also failed');
        }
      } catch (fallbackError) {
        console.log(`❌ Fallback Error: ${fallbackError.message}`);
      }
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🏁 Direct XPath Test Completed!');
  console.log('============================================================');
}

// Run the test
testXPathScraper().catch(console.error);