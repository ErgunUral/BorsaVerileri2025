import { getIsYatirimScraper } from './api/scrapers/isYatirimScraper.js';
import { AdvancedLoggerService } from './api/services/advancedLoggerService.js';
import { ErrorHandlingService } from './api/services/errorHandlingService.js';

// Test the new XPath-based scraper
async function testXPathScraper() {
  console.log('🚀 Testing XPath-based İş Yatırım Scraper...');
  
  // Initialize services
  const logger = new AdvancedLoggerService();
  const errorHandler = new ErrorHandlingService(logger);
  const scraper = getIsYatirimScraper(logger, errorHandler);
  
  try {
    // Test with ASELS (Aselsan) as mentioned in the user request
    console.log('\n📊 Testing single stock data fetch for ASELS...');
    const aselsData = await scraper.getStockDataWithXPath('ASELS');
    
    if (aselsData) {
      console.log('✅ ASELS data fetched successfully:');
      console.log(`   Symbol: ${aselsData.symbol}`);
      console.log(`   Name: ${aselsData.name}`);
      console.log(`   Price: ${aselsData.price} TL`);
      console.log(`   Change: ${aselsData.change} (${aselsData.changePercent.toFixed(2)}%)`);
      console.log(`   Volume: ${aselsData.volume}`);
      console.log(`   High: ${aselsData.high} TL`);
      console.log(`   Low: ${aselsData.low} TL`);
      console.log(`   Open: ${aselsData.open} TL`);
      console.log(`   Timestamp: ${aselsData.timestamp}`);
    } else {
      console.log('❌ Failed to fetch ASELS data');
    }
    
    // Test with multiple stocks
    console.log('\n📊 Testing multiple stocks data fetch...');
    const testSymbols = ['THYAO', 'AKBNK', 'ISCTR', 'GARAN', 'SASA'];
    const multipleData = await scraper.getMultipleStocksDataWithXPath(testSymbols);
    
    console.log(`✅ Fetched data for ${multipleData.length}/${testSymbols.length} stocks:`);
    multipleData.forEach(stock => {
      console.log(`   ${stock.symbol}: ${stock.price} TL (${stock.changePercent.toFixed(2)}%)`);
    });
    
    // Test health check
    console.log('\n🏥 Testing health check...');
    const isHealthy = await scraper.healthCheck();
    console.log(`Health status: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    
    // Get stats
    console.log('\n📈 Scraper statistics:');
    const stats = scraper.getStats();
    console.log(`   Name: ${stats.name}`);
    console.log(`   Base URL: ${stats.baseUrl}`);
    console.log(`   Is Healthy: ${stats.isHealthy}`);
    console.log(`   Min Request Interval: ${stats.minRequestInterval}ms`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up browser
    console.log('\n🧹 Cleaning up browser...');
    await scraper.closeBrowser();
    console.log('✅ Test completed!');
  }
}

// Run the test
testXPathScraper().catch(console.error);