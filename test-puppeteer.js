import puppeteer from 'puppeteer';

async function testPuppeteerSimple() {
  let browser = null;
  let page = null;
  
  try {
    console.log('Starting simple Puppeteer test...');
    
    // Very stable browser configuration
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      timeout: 60000,
      protocolTimeout: 60000
    });
    
    console.log('Browser launched successfully');
    
    page = await browser.newPage();
    
    // Set page timeouts
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(60000);
    
    // Set a simple user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Navigating to İş Yatırım...');
    
    // Navigate with a longer timeout and better wait strategy
    await page.goto('https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS', {
      waitUntil: 'networkidle2',
      timeout: 90000
    });
    
    console.log('Page loaded successfully');
    
    // Wait a bit for JavaScript to execute
    await page.waitForTimeout(5000);
    
    console.log('Looking for price elements...');
    
    // Try to find the price element
    const priceSelectors = [
      '#hisse_Son',
      '[id*="hisse_Son"]',
      '[id*="Son"]',
      '.hisse-fiyat',
      '.price-value'
    ];
    
    for (const selector of priceSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          const text = await page.evaluate(el => el.textContent, element);
          console.log(`Found element with selector "${selector}": "${text}"`);
        } else {
          console.log(`No element found with selector "${selector}"`);
        }
      } catch (err) {
        console.log(`Error with selector "${selector}": ${err.message}`);
      }
    }
    
    // Look for any elements containing price-like numbers
    console.log('\nLooking for elements with price-like numbers...');
    
    const priceElements = await page.evaluate(() => {
      const elements = [];
      const allElements = document.querySelectorAll('*');
      
      for (let el of allElements) {
        const text = el.textContent?.trim() || '';
        // Look for numbers between 100-1000 (realistic ASELS price range)
        if (text.match(/^\d{2,3}[.,]\d{1,2}$/) && text.length <= 10) {
          const numValue = parseFloat(text.replace(',', '.'));
          if (numValue >= 100 && numValue <= 1000) {
            elements.push({
              text: text,
              value: numValue,
              tagName: el.tagName,
              id: el.id || '',
              className: el.className || ''
            });
          }
        }
      }
      
      return elements.slice(0, 10); // Return first 10 matches
    });
    
    if (priceElements.length > 0) {
      console.log('Found potential price elements:');
      priceElements.forEach((el, index) => {
        console.log(`${index + 1}. ${el.value} ("${el.text}") - ${el.tagName}${el.id ? ` #${el.id}` : ''}${el.className ? ` .${el.className}` : ''}`);
      });
    } else {
      console.log('No realistic price elements found');
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Error during Puppeteer test:', error.message);
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

testPuppeteerSimple();