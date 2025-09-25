import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

// Test ASELS specifically
async function testASELS() {
  console.log('=== ASELS Debug Test ===');
  
  // Test 1: Direct HTTP request to İş Yatırım
  console.log('\n1. Testing direct HTTP request...');
  try {
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Check various selectors
    console.log('Checking #hisse_Son:', $('#hisse_Son').text().trim());
    console.log('Checking #lblSon:', $('#lblSon').text().trim());
    console.log('Checking .hisse-fiyat:', $('.hisse-fiyat').text().trim());
    
    // Look for any element containing price-like numbers
    const allNumbers = [];
    $('*').each((_, element) => {
      const text = $(element).text().trim();
      if (/^[0-9]{1,4}[.,]?[0-9]{0,4}$/.test(text)) {
        const num = parseFloat(text.replace(',', '.'));
        if (num > 200 && num < 250) {
          allNumbers.push({ text, num, tag: element.tagName, id: element.attribs?.id, class: element.attribs?.class });
        }
      }
    });
    
    console.log('Found potential ASELS prices:', allNumbers);
    
  } catch (error) {
    console.error('HTTP request failed:', error.message);
  }
  
  // Test 2: Puppeteer with browser
  console.log('\n2. Testing with Puppeteer...');
  let browser = null;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
    
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Extract using XPath
    const priceXPath = await page.evaluate(() => {
      const xpath = '//*[@id="hisse_Son"]';
      const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue ? result.singleNodeValue.textContent.trim() : null;
    });
    
    console.log('XPath result for #hisse_Son:', priceXPath);
    
    // Check page content
    const pageContent = await page.content();
    const $page = cheerio.load(pageContent);
    
    console.log('Page title:', await page.title());
    console.log('Checking #hisse_Son in rendered page:', $page('#hisse_Son').text().trim());
    console.log('Checking #lblSon in rendered page:', $page('#lblSon').text().trim());
    
    // Look for ASELS price in page
    const aselsMatches = pageContent.match(/ASELS[\s\S]{0,200}?([0-9]{1,4}[.,][0-9]{1,4})/gi);
    console.log('ASELS price patterns found:', aselsMatches);
    
  } catch (error) {
    console.error('Puppeteer test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Test 3: Our API endpoint
  console.log('\n3. Testing our API endpoint...');
  try {
    const response = await axios.get('http://localhost:3001/api/stocks/test-xpath/ASELS');
    console.log('Our API response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('API test failed:', error.message);
  }
  
  // Test 4: BIST Data Table
  console.log('\n4. Testing BIST Data Table...');
  try {
    const response = await axios.get('https://www.isyatirim.com.tr/en-us/analysis/stocks/Pages/bist-data-table.aspx', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const pageText = $.text();
    
    // Look for ASELS in the data table
    const aselsMatch = pageText.match(/ASELS[\s\S]{0,100}?([0-9]{1,4}[.,][0-9]{1,4})/i);
    if (aselsMatch) {
      console.log('ASELS found in BIST Data Table:', aselsMatch[1]);
    } else {
      console.log('ASELS not found in BIST Data Table');
    }
    
  } catch (error) {
    console.error('BIST Data Table test failed:', error.message);
  }
}

testASELS().catch(console.error);