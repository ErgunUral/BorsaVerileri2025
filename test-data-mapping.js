// Test script for data mapping functions
import { mapFinancialData, getTurkishKey, getEnglishKey } from './src/utils/dataMapping.js';

// Test data from real API responses
const mockAnalysisData = {
  stockCode: "ASELS",
  companyName: "ASELS Şirketi",
  period: "2024-Q3",
  currentAssets: 560000000,
  shortTermLiabilities: 562500000,
  longTermLiabilities: 180000000,
  cashAndEquivalents: 85000000,
  inventory: 120000000,
  financialInvestments: 45000000,
  financialDebts: 320000000,
  totalAssets: 1120000000,
  totalLiabilities: 742500000,
  revenue: 800000000,
  grossProfit: 240000000,
  ebitda: 150000000,
  netProfit: 60000000,
  equity: 377500000,
  paidCapital: 200000000
};

const realFinancialData = {
  stockCode: "ASELS",
  ozkaynaklar: 1690027156,
  sermaye: 4560040
};

console.log('=== Testing Data Mapping Functions ===');

// Test 1: Map mock analysis data
console.log('\n1. Testing mapFinancialData with mock analysis data:');
const mappedMockData = mapFinancialData(mockAnalysisData);
console.log('Original keys:', Object.keys(mockAnalysisData));
console.log('Mapped keys:', Object.keys(mappedMockData));
console.log('Sample mapped values:');
console.log('  totalAssets -> toplamVarliklar:', mappedMockData.toplamVarliklar);
console.log('  currentAssets -> donenVarliklar:', mappedMockData.donenVarliklar);
console.log('  equity -> ozkaynaklar:', mappedMockData.ozkaynaklar);

// Test 2: Map real financial data
console.log('\n2. Testing mapFinancialData with real financial data:');
const mappedRealData = mapFinancialData(realFinancialData);
console.log('Real data keys:', Object.keys(realFinancialData));
console.log('Mapped real data keys:', Object.keys(mappedRealData));
console.log('Values:');
console.log('  ozkaynaklar:', mappedRealData.ozkaynaklar);
console.log('  sermaye:', mappedRealData.sermaye);

// Test 3: Key translation functions
console.log('\n3. Testing key translation functions:');
console.log('getTurkishKey("totalAssets"):', getTurkishKey('totalAssets'));
console.log('getTurkishKey("equity"):', getTurkishKey('equity'));
console.log('getEnglishKey("toplamVarliklar"):', getEnglishKey('toplamVarliklar'));
console.log('getEnglishKey("ozkaynaklar"):', getEnglishKey('ozkaynaklar'));

// Test 4: Data consistency check
console.log('\n4. Data consistency analysis:');
console.log('Mock equity value:', mockAnalysisData.equity);
console.log('Real ozkaynaklar value:', realFinancialData.ozkaynaklar);
console.log('Difference:', Math.abs(mockAnalysisData.equity - realFinancialData.ozkaynaklar));
console.log('Ratio:', (mockAnalysisData.equity / realFinancialData.ozkaynaklar).toFixed(4));

console.log('\n=== Test Complete ===');