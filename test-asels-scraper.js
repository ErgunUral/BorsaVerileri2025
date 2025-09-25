import axios from 'axios';

async function testAselsPage() {
  console.log('🔍 Testing ASELS page access...');
  
  try {
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    console.log(`Fetching: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      timeout: 30000
    });
    
    console.log(`✅ Page fetched successfully. Status: ${response.status}`);
    console.log(`📄 Content length: ${response.data.length} characters`);
    
    const content = response.data;
    
    // Search for all TL prices
    const priceMatches = content.match(/(\d+[.,]\d+)\s*TL/gi);
    if (priceMatches) {
      console.log('\n💰 All price patterns found:');
      const uniquePrices = [...new Set(priceMatches)];
      uniquePrices.slice(0, 15).forEach((match, i) => {
        const priceStr = match.match(/(\d+[.,]\d+)/)[1].replace(',', '.');
        const price = parseFloat(priceStr);
        console.log(`  ${i + 1}. ${match} (${price})`);
      });
    }
    
    // Look for current price indicators
    const currentPricePatterns = [
      /Son\s*Fiyat[:\s]*(\d+[.,]\d+)\s*TL/gi,
      /Güncel\s*Fiyat[:\s]*(\d+[.,]\d+)\s*TL/gi,
      /Fiyat[:\s]*(\d+[.,]\d+)\s*TL/gi,
      /Last\s*Price[:\s]*(\d+[.,]\d+)\s*TL/gi
    ];
    
    console.log('\n🎯 Looking for current price indicators:');
    currentPricePatterns.forEach((pattern, i) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`  Pattern ${i + 1}: ${matches[0]}`);
      }
    });
    
    // Search for ASELS specific mentions with prices
    const aselsPattern = /ASELS[^<>]*?(\d+[.,]\d+)[^<>]*?TL/gi;
    const aselsMatches = content.match(aselsPattern);
    if (aselsMatches) {
      console.log('\n🏢 ASELS specific price mentions:');
      aselsMatches.forEach((match, i) => {
        console.log(`  ${i + 1}. ${match}`);
      });
    }
    
    // Look for table data that might contain the price
    const tablePattern = /<td[^>]*>[^<]*?(\d+[.,]\d+)[^<]*?TL[^<]*?<\/td>/gi;
    const tableMatches = content.match(tablePattern);
    if (tableMatches) {
      console.log('\n📊 Table cell prices:');
      tableMatches.slice(0, 10).forEach((match, i) => {
        console.log(`  ${i + 1}. ${match.replace(/<[^>]*>/g, '').trim()}`);
      });
    }
    
    // Check for reasonable ASELS price range (10-30 TL)
    console.log('\n🔍 Analyzing prices for ASELS range (10-30 TL):');
    if (priceMatches) {
      const reasonablePrices = priceMatches
        .map(match => {
          const priceStr = match.match(/(\d+[.,]\d+)/)[1].replace(',', '.');
          return { original: match, value: parseFloat(priceStr) };
        })
        .filter(p => p.value >= 10 && p.value <= 30)
        .sort((a, b) => b.value - a.value);
      
      if (reasonablePrices.length > 0) {
        console.log('  Reasonable ASELS prices found:');
        reasonablePrices.slice(0, 5).forEach((price, i) => {
          console.log(`    ${i + 1}. ${price.original} (${price.value} TL)`);
        });
      } else {
        console.log('  ⚠️  No prices in reasonable ASELS range (10-30 TL) found!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing ASELS page:', error.message);
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
      console.error(`   Status Text: ${error.response.statusText}`);
    }
  }
}

testAselsPage().catch(console.error);