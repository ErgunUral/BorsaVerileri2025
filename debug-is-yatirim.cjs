const puppeteer = require('puppeteer');

async function testIsYatirimScraping() {
  const browser = await puppeteer.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to İş Yatırım TARKM page...');
    await page.goto('https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=TARKM', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait for page to load completely
    await page.waitForTimeout(5000);
    
    console.log('Page loaded, checking for price elements...');
    
    // Check if hisse_Son element exists and has content
    const priceElement = await page.$('#hisse_Son');
    if (priceElement) {
      const priceText = await page.evaluate(el => el.textContent, priceElement);
      console.log('hisse_Son element text:', priceText);
    } else {
      console.log('hisse_Son element not found');
    }
    
    // Check all elements with price-like content
    const allPrices = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const prices = [];
      
      elements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.match(/^\d{1,4}[.,]?\d{0,4}$/) && text.length >= 2 && text.length <= 10) {
          const numValue = parseFloat(text.replace(',', '.'));
          if (numValue >= 1 && numValue <= 2000) {
            prices.push({
              text: text,
              value: numValue,
              tagName: el.tagName,
              id: el.id,
              className: el.className
            });
          }
        }
      });
      
      return prices.slice(0, 20); // Return first 20 potential prices
    });
    
    console.log('Potential price elements found:', allPrices.length);
    allPrices.forEach((price, index) => {
      console.log(`${index + 1}. ${price.text} (${price.value}) - ${price.tagName}#${price.id}.${price.className}`);
    });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tarkm-debug.png', fullPage: true });
    console.log('Screenshot saved as tarkm-debug.png');
    
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
}

testIsYatirimScraping().catch(console.error);