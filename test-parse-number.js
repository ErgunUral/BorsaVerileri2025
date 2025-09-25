// Test parseNumber function

function parseNumber(text) {
  if (!text || typeof text !== 'string') return null;
  
  // Clean the text: remove currency symbols, spaces, and handle Turkish number format
  let cleaned = text
    .replace(/[₺$€£¥]/g, '') // Remove currency symbols
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^0-9.,+-]/g, ''); // Keep only numbers, dots, commas, and signs
  
  if (!cleaned) return null;
  
  console.log(`Original text: "${text}" -> Cleaned: "${cleaned}"`);
  
  // Handle Turkish number format: 1.234,56 -> 1234.56
  // If there's both dot and comma, dot is thousand separator, comma is decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    // Remove thousand separators (dots) and replace decimal comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    console.log(`Both dot and comma found, result: "${cleaned}"`);
  } else if (cleaned.includes(',')) {
    // Only comma present - could be decimal separator
    // Check if it's likely a decimal (2 digits after comma)
    const commaIndex = cleaned.lastIndexOf(',');
    const afterComma = cleaned.substring(commaIndex + 1);
    if (afterComma.length <= 2) {
      // Likely decimal separator
      cleaned = cleaned.replace(',', '.');
      console.log(`Comma as decimal separator, result: "${cleaned}"`);
    } else {
      // Likely thousand separator
      cleaned = cleaned.replace(/,/g, '');
      console.log(`Comma as thousand separator, result: "${cleaned}"`);
    }
  }
  // If only dots, they could be thousand separators or decimal
  else if (cleaned.includes('.')) {
    const dotIndex = cleaned.lastIndexOf('.');
    const afterDot = cleaned.substring(dotIndex + 1);
    if (afterDot.length > 2) {
      // Likely thousand separators
      cleaned = cleaned.replace(/\./g, '');
      console.log(`Dots as thousand separators, result: "${cleaned}"`);
    }
    console.log(`Dot handling result: "${cleaned}"`);
    // Otherwise keep as decimal separator
  }
  
  const number = parseFloat(cleaned);
  console.log(`Final parsed number: ${number}`);
  return isNaN(number) ? null : number;
}

// Test cases
console.log('=== Testing parseNumber function ===');

const testCases = [
  '123,45',
  '1.234,56',
  '1.234.567',
  '123.45',
  '1,234.56',
  '50,00',
  '1000500307.69',
  '100.05.003.07.69',
  '100,05,003,07,69'
];

testCases.forEach(testCase => {
  console.log(`\n--- Testing: "${testCase}" ---`);
  const result = parseNumber(testCase);
  console.log(`Result: ${result}`);
});