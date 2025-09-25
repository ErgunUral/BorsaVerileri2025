// Simple test to check if XPath scraper works using fetch API

// Simple test to check if XPath scraper works
async function testXPathScraper() {
  console.log('🚀 Simple XPath Scraper Test');
  console.log('============================================================');
  
  const symbols = ['ASELS', 'THYAO', 'AKBNK'];
  
  for (const symbol of symbols) {
    console.log(`\n📊 Testing ${symbol}...`);
    console.log('----------------------------------------');
    
    try {
      // Make HTTP request to our test endpoint
      const response = await fetch(`http://localhost:3001/api/stocks/test-xpath/${symbol}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data && data.data.price) {
          console.log(`✅ Success - Price: ${data.data.price}, Change: ${data.data.change}`);
          console.log(`   Volume: ${data.data.volume}, High: ${data.data.high}, Low: ${data.data.low}`);
          console.log(`   Method: ${data.method || 'unknown'}`);
        } else {
          console.log('❌ Failed - No valid data returned');
          console.log('Response:', JSON.stringify(data, null, 2));
        }
      } else {
        const errorText = await response.text();
        console.log(`❌ HTTP Error ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n🏁 Simple XPath Test Completed!');
  console.log('============================================================');
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Please start with: npm run dev');
    return false;
  }
  return false;
}

// Run the test
async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testXPathScraper();
  }
}

main().catch(console.error);