import axios from 'axios';

async function testIsYatirimAPI() {
  try {
    console.log('Testing İş Yatırım API endpoints...');
    
    // Test different possible API endpoints
    const endpoints = [
      'https://www.isyatirim.com.tr/api/stockdata/ASELS',
      'https://www.isyatirim.com.tr/api/hisse/ASELS',
      'https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/GetStockData?symbol=ASELS',
      'https://www.isyatirim.com.tr/_layouts/15/IsYatirim.Website/Common/ChartData.aspx?symbol=ASELS',
      'https://www.isyatirim.com.tr/tr-tr/_layouts/15/IsYatirim.Website/Common/Data.aspx/GetStockData?symbol=ASELS'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\nTesting: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': 'https://www.isyatirim.com.tr/'
          },
          timeout: 10000
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Content-Type: ${response.headers['content-type']}`);
        console.log(`Data preview: ${JSON.stringify(response.data).substring(0, 200)}...`);
        
      } catch (error) {
        console.log(`Failed: ${error.response?.status || error.message}`);
      }
    }
    
    // Test the main page with different headers
    console.log('\n=== Testing main page with different approaches ===');
    
    try {
      const response = await axios.get('https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });
      
      console.log(`Main page status: ${response.status}`);
      console.log(`Content length: ${response.data.length}`);
      
      // Look for JSON data in script tags
      const jsonMatches = response.data.match(/var\s+\w+\s*=\s*{[^}]+}/g);
      if (jsonMatches) {
        console.log('Found JSON-like data in scripts:');
        jsonMatches.slice(0, 3).forEach((match, i) => {
          console.log(`${i + 1}: ${match.substring(0, 100)}...`);
        });
      }
      
      // Look for ASELS data specifically
      if (response.data.includes('ASELS')) {
        const aselMatches = response.data.match(/.{0,50}ASELS.{0,50}/g);
        console.log('\nASELS mentions:');
        aselMatches?.slice(0, 5).forEach((match, i) => {
          console.log(`${i + 1}: ${match}`);
        });
      }
      
    } catch (error) {
      console.log(`Main page failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('General error:', error.message);
  }
}

testIsYatirimAPI();