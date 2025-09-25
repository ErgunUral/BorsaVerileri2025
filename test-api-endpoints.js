import axios from 'axios';

async function testIsYatirimAPI() {
  console.log('Testing İş Yatırım API endpoints...');
  
  const baseURL = 'https://www.isyatirim.com.tr';
  const symbol = 'ASELS';
  
  // Common API endpoints to test
  const endpoints = [
    // Potential AJAX endpoints
    `/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=${symbol}`,
    `/api/stocks/${symbol}`,
    `/api/hisse/${symbol}`,
    `/services/stock/${symbol}`,
    `/data/hisse/${symbol}`,
    `/tr/analiz/hisse/services/GetStockData?symbol=${symbol}`,
    `/tr/analiz/hisse/services/GetHisseData?hisse=${symbol}`,
    `/services/GetHisseVerileri?hisse=${symbol}`,
    `/api/GetHisseDetay?hisse=${symbol}`,
    `/tr-tr/analiz/hisse/services/GetHisseDetay?hisse=${symbol}`,
    
    // Market data endpoints
    '/services/GetPiyasaVerileri',
    '/api/market/data',
    '/services/GetEndeksVerileri',
    
    // Real-time data endpoints
    '/services/GetRealTimeData',
    '/api/realtime/stocks',
    '/services/GetCanliVeriler'
  ];
  
  const client = axios.create({
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
      'Referer': `${baseURL}/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=${symbol}`,
      'X-Requested-With': 'XMLHttpRequest'
    }
  });
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${baseURL}${endpoint}`);
      
      const response = await client.get(`${baseURL}${endpoint}`);
      
      console.log(`✅ Status: ${response.status}`);
      console.log(`📄 Content-Type: ${response.headers['content-type']}`);
      console.log(`📊 Data length: ${JSON.stringify(response.data).length} chars`);
      
      // Check if response contains stock data
      const dataStr = JSON.stringify(response.data).toLowerCase();
      const hasStockData = dataStr.includes('price') || 
                          dataStr.includes('fiyat') || 
                          dataStr.includes('son') ||
                          dataStr.includes('degisim') ||
                          dataStr.includes('hacim') ||
                          dataStr.includes('asels');
      
      if (hasStockData) {
        console.log(`🎯 POTENTIAL STOCK DATA FOUND!`);
        console.log(`📋 Sample data:`, JSON.stringify(response.data).substring(0, 500));
      }
      
      // If it's JSON, show structure
      if (response.headers['content-type']?.includes('application/json')) {
        console.log(`🔍 JSON keys:`, Object.keys(response.data || {}));
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Status: ${error.response.status} - ${error.response.statusText}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n=== Testing completed ===');
}

// Also test for network requests made by the page
async function analyzeNetworkRequests() {
  console.log('\n=== Analyzing potential AJAX patterns ===');
  
  // Common patterns for Turkish financial sites
  const patterns = [
    'GetHisse',
    'GetStock', 
    'GetData',
    'GetVeriler',
    'GetDetay',
    'GetFiyat',
    'GetCanli',
    'GetRealTime',
    'HisseDetay',
    'StockDetail',
    'PiyasaVerileri',
    'MarketData'
  ];
  
  console.log('Common AJAX endpoint patterns to look for:');
  patterns.forEach(pattern => {
    console.log(`- *${pattern}*`);
  });
  
  console.log('\nSuggested manual inspection:');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to Network tab');
  console.log('3. Visit: https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS');
  console.log('4. Look for XHR/Fetch requests containing stock data');
  console.log('5. Check response data for price information');
}

testIsYatirimAPI().then(() => {
  analyzeNetworkRequests();
}).catch(console.error);