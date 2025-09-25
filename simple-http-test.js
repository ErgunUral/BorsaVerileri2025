// Simple HTTP-based scraper test

async function testHttpScraper() {
  console.log('🚀 Simple HTTP Scraper Test');
  console.log('============================================================');

  // Check if server is running
  try {
    const healthResponse = await fetch('http://localhost:3001/api/stocks/health');
    if (!healthResponse.ok) {
      console.log('❌ Server is not responding properly');
      return;
    }
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is not responding properly');
    return;
  }

  const symbols = ['ASELS', 'THYAO', 'AKBNK'];

  for (const symbol of symbols) {
    console.log(`\n📊 Testing ${symbol}...`);
    console.log('----------------------------------------');
    
    try {
      const response = await fetch(`http://localhost:3001/api/stocks/test-simple/${symbol}`);
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Success:', JSON.stringify(data, null, 2));
      } else {
        console.log('❌ HTTP Error', response.status + ':', JSON.stringify(data, null, 2));
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
    }
  }

  console.log('\n🏁 Simple HTTP Test Completed!');
  console.log('============================================================');
}

testHttpScraper().catch(console.error);