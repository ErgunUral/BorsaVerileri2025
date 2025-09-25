import axios from 'axios';

// Test ASELS scraper with fixed algorithm
async function testASELSScraper() {
  console.log('Testing ASELS scraper with fixed algorithm...');
  
  try {
    // Test the API endpoint directly
    const response = await axios.get('http://localhost:3001/api/stocks/data/ASELS');
    
    console.log('\n=== ASELS API Response ===');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.current) {
      const price = response.data.current;
      console.log(`\n=== Price Analysis ===`);
      console.log(`Current Price: ${price} TL`);
      
      if (price >= 10 && price <= 20) {
        console.log('✅ Price is in reasonable range (10-20 TL)');
      } else if (price > 200) {
        console.log('❌ Price is too high (>200 TL) - scraper issue detected');
      } else {
        console.log(`⚠️  Price is ${price} TL - check if this is correct`);
      }
    }
    
  } catch (error) {
    console.error('Error testing ASELS scraper:', error.message);
    
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

// Run the test
testASELSScraper();