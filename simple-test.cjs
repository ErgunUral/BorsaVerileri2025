// Simple test for XPath scraper
const puppeteer = require('puppeteer');

async function testXPathScraper() {
  console.log('🚀 Testing XPath-based İş Yatırım Scraper...');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ],
      timeout: 60000,
      slowMo: 100
    });
    
    const page = await browser.newPage();
    
    // Set user agent and viewport
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // First navigate to a simple page
    console.log('📊 Testing basic navigation...');
    await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Google loaded successfully');
    
    // Now navigate to ASELS page
    console.log('📊 Navigating to ASELS page...');
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for page to load
    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);
    
    // Try to find the price element using XPath
    console.log('🔍 Looking for price element using XPath //*[@id="hisse_Son"]...');
    
    try {
      const priceElement = await page.$x('//*[@id="hisse_Son"]');
      if (priceElement.length > 0) {
        const priceText = await page.evaluate(el => el.textContent, priceElement[0]);
        console.log('✅ Found price element:', priceText);
      } else {
        console.log('❌ Price element not found with XPath //*[@id="hisse_Son"]');
        
        // Try alternative selectors
        console.log('🔍 Trying alternative selectors...');
        
        const alternatives = [
          '#hisse_Son',
          '.hisse-fiyat',
          '.price-value',
          '[data-field="price"]',
          '.son-fiyat',
          '.current-price'
        ];
        
        for (const selector of alternatives) {
          try {
            const element = await page.$(selector);
            if (element) {
              const text = await page.evaluate(el => el.textContent, element);
              console.log(`✅ Found with selector ${selector}:`, text);
              break;
            }
          } catch (e) {
            console.log(`❌ Selector ${selector} failed`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error finding price element:', error.message);
    }
    
    // Get page title and URL for verification
    const title = await page.title();
    const currentUrl = page.url();
    console.log('📄 Page title:', title);
    console.log('🔗 Current URL:', currentUrl);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: false });
    console.log('📸 Screenshot saved as debug-screenshot.png');
    
    await page.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🧹 Browser closed');
    }
  }
}

// Run the test
testXPathScraper().catch(console.error);