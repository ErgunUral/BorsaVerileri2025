const axios = require('axios');
const cheerio = require('cheerio');

class IsYatirimScraper {
  constructor() {
    this.baseUrl = 'https://www.isyatirim.com.tr';
    this.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async fetchPage(stockCode) {
    try {
      const url = `${this.baseUrl}/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=${stockCode}`;
      
      console.log(`Fetching data for ${stockCode} from ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`Successfully fetched page for ${stockCode}, size: ${response.data.length} characters`);
      return cheerio.load(response.data);
    } catch (error) {
      console.error(`Error fetching page for ${stockCode}:`, error.message);
      throw error;
    }
  }

  extractFinancialValue(text) {
    if (!text) return undefined;
    
    // Look for patterns like: 123.456.789,12 or 123.456.789 or 123,456
    const patterns = [
      /\b(\d{1,3}(?:\.\d{3})*),\d{1,2}\b/g, // 123.456.789,12
      /\b(\d{1,3}(?:\.\d{3})*)\b/g,         // 123.456.789
      /\b(\d+),\d{1,2}\b/g,                 // 123,45
      /\b(\d+)\b/g                          // 123
    ];
    
    const values = [];
    
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Convert Turkish format to standard format
          let cleanMatch = match;
          
          // If it has dots and comma (123.456.789,12)
          if (cleanMatch.includes('.') && cleanMatch.includes(',')) {
            cleanMatch = cleanMatch.replace(/\./g, '').replace(',', '.');
          }
          // If it only has comma (123,45)
          else if (cleanMatch.includes(',') && !cleanMatch.includes('.')) {
            cleanMatch = cleanMatch.replace(',', '.');
          }
          // If it only has dots (123.456.789) - treat as thousands separator
          else if (cleanMatch.includes('.') && !cleanMatch.includes(',')) {
            // Only remove dots if there are multiple groups of 3 digits
            const parts = cleanMatch.split('.');
            if (parts.length > 1 && parts.slice(1).every(part => part.length === 3)) {
              cleanMatch = cleanMatch.replace(/\./g, '');
            }
          }
          
          const value = parseFloat(cleanMatch);
          if (!isNaN(value) && value > 0 && value < 1e15) { // Reasonable range
            values.push(value);
          }
        }
      }
    }
    
    return values.length > 0 ? Math.max(...values) : undefined;
  }

  findFinancialData($) {
    const data = {};
    
    // Define search terms and their corresponding data fields
    const searchTerms = {
      'Dönen Varlıklar': 'donenVarliklar',
      'Kısa Vadeli Yükümlülükler': 'kisaVadeliYukumlulukler',
      'Nakit ve Nakit Benzerleri': 'nakitVeNakitBenzerleri',
      'Finansal Yatırımlar': 'finansalYatirimlar',
      'Finansal Borçlar': 'finansalBorclar',
      'Aktif Toplamı': 'aktifToplami',
      'Özkaynaklar': 'ozkaynaklar',
      'Ödenmiş Sermaye': 'odenmisSermaye',
      'FAVÖK': 'favok',
      'Ana Ortaklık Payları': 'netKar'
    };

    // Search for each term in the page
    Object.entries(searchTerms).forEach(([term, field]) => {
      try {
        const elements = $('*').filter(function() {
          return $(this).text().includes(term);
        });

        if (elements.length > 0) {
          console.log(`\n=== ${term} === (${elements.length} matches)`);
          
          // Try to find the associated value
          elements.each((i, el) => {
            if (i >= 3) return false; // Limit to first 3 matches
            
            const $el = $(el);
            const text = $el.text().trim();
            
            console.log(`Match ${i + 1}: "${text.substring(0, 200)}${text.length > 200 ? '...' : ''}"`); // Show first 200 chars
            
            // Extract financial value from the entire text
             const extractedValue = this.extractFinancialValue(text);
             if (extractedValue !== undefined) {
               console.log(`  Extracted value: ${extractedValue}`);
               
               if (!data[field] || extractedValue > data[field]) {
                 data[field] = extractedValue;
               }
             } else {
               console.log(`  No valid financial value found`);
             }
          });
          
          if (data[field]) {
            console.log(`✓ Final value for ${term}: ${data[field]}`);
          } else {
            console.log(`✗ No valid value found for ${term}`);
          }
        } else {
          console.log(`✗ ${term} not found`);
        }
      } catch (error) {
        console.warn(`Error processing ${term}:`, error.message);
      }
    });

    return data;
  }

  async scrapeFinancialData(stockCode) {
    try {
      const $ = await this.fetchPage(stockCode);
      const financialData = this.findFinancialData($);
      
      console.log('\n=== FINAL RESULTS ===');
      console.log('Financial Data:', financialData);
      
      return financialData;
    } catch (error) {
      console.error(`Failed to scrape financial data for ${stockCode}:`, error.message);
      return {};
    }
  }
}

// Test the scraper
async function testScraper() {
  const scraper = new IsYatirimScraper();
  
  console.log('Testing İş Yatırım scraper for ASELS...');
  
  try {
    // First, let's examine the page structure
    const url = 'https://www.isyatirim.com.tr/tr-tr/analiz/hisse/Sayfalar/sirket-karti.aspx?hisse=ASELS';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('\n=== PAGE STRUCTURE ANALYSIS ===');
    
    // Look for tables
    const tables = $('table');
    console.log(`Found ${tables.length} tables`);
    
    tables.each((i, table) => {
      const $table = $(table);
      const tableText = $table.text().trim();
      if (tableText.length > 50) {
        console.log(`\nTable ${i + 1}:`);
        console.log(tableText.substring(0, 300) + '...');
      }
    });
    
    // Look for divs with financial data
    const divs = $('div');
    console.log(`\n=== SEARCHING FOR FINANCIAL TERMS IN DIVS ===`);
    
    const financialTerms = ['Aktif Toplamı', 'Özkaynaklar', 'Net Kar', 'Satışlar'];
    
    financialTerms.forEach(term => {
      console.log(`\n--- Searching for: ${term} ---`);
      let found = false;
      
      divs.each((i, div) => {
        const $div = $(div);
        const text = $div.text();
        
        if (text.includes(term)) {
          found = true;
          console.log(`Found in div ${i}: ${text.substring(0, 200)}...`);
          
          // Look for numbers in the same div or nearby
          const numbers = text.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g);
          if (numbers) {
            console.log(`  Numbers found: ${numbers.slice(0, 5).join(', ')}`);
          }
        }
      });
      
      if (!found) {
        console.log(`  ${term} not found in any div`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testScraper();