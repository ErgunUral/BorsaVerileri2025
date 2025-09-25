const puppeteer = require('puppeteer');
const axios = require('axios');
const cheerio = require('cheerio');

async function debugASELS() {
  console.log('=== ASELS HTML Debug ===');
  
  // Test 1: Direct HTTP request to see all potential prices
  console.log('\n1. Direct HTTP Request Analysis:');
  try {
    const response = await axios.get('https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Find all numeric values that could be prices
    const allNumbers = [];
    $('*').each((_, element) => {
      const text = $(element).text().trim();
      if (text && /^[0-9]{1,4}[.,]?[0-9]{0,4}$/.test(text)) {
        const num = parseFloat(text.replace(',', '.'));
        if (num > 200 && num < 250) {
          allNumbers.push({
            value: num,
            element: element.tagName,
            class: $(element).attr('class') || 'no-class',
            id: $(element).attr('id') || 'no-id',
            parent: $(element).parent().attr('class') || 'no-parent-class'
          });
        }
      }
    });
    
    console.log('Found potential ASELS prices:', allNumbers);
    
    // Check specific selectors
    const selectors = ['#hisse_Son', '.text-right', '.hisse-fiyat', '.price-value'];
    selectors.forEach(selector => {
      const element = $(selector);
      if (element.length) {
        console.log(`${selector}: "${element.text().trim()}"`);
      }
    });
    
  } catch (error) {
    console.error('HTTP request failed:', error.message);
  }
  
  // Test 2: Puppeteer to see dynamic content
  console.log('\n2. Puppeteer Analysis:');
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();
    
    await page.goto('https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Extract all potential price elements
    const priceData = await page.evaluate(() => {
      const results = [];
      
      // Check all elements with numeric content
      document.querySelectorAll('*').forEach(element => {
        const text = element.textContent?.trim();
        if (text && /^[0-9]{1,4}[.,]?[0-9]{0,4}$/.test(text)) {
          const num = parseFloat(text.replace(',', '.'));
          if (num > 200 && num < 250) {
            results.push({
              value: num,
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              innerHTML: element.innerHTML,
              parentClass: element.parentElement?.className || 'no-parent'
            });
          }
        }
      });
      
      return results;
    });
    
    console.log('Puppeteer found potential prices:', priceData);
    
    // Take a screenshot for manual inspection
    await page.screenshot({ path: 'asels-debug.png', fullPage: true });
    console.log('Screenshot saved as asels-debug.png');
    
  } catch (error) {
    console.error('Puppeteer failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugASELS().catch(console.error);