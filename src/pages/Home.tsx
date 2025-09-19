import { useState } from 'react';
import Calculator from '../components/Calculator';
import FinancialCalculator from '../components/FinancialCalculator';

export default function Home() {
  const [showFinancialCalculator, setShowFinancialCalculator] = useState(false);
  
  // Örnek finansal veriler
  const sampleFinancialData = {
    totalAssets: 1000000,
    totalLiabilities: 600000,
    revenue: 500000,
    netIncome: 75000,
    operatingCashFlow: 80000,
    currentAssets: 400000,
    currentLiabilities: 200000,
    totalEquity: 400000,
    grossProfit: 200000,
    operatingIncome: 100000
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Hesap Makinesi Uygulaması
          </h1>
          <p className="text-lg text-gray-600">
            Temel ve finansal hesaplamalar yapabileceğiniz kapsamlı hesap makinesi
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Temel Hesap Makinesi */}
          <Calculator />
          
          {/* Finansal Hesap Makinesi */}
          <FinancialCalculator 
            showCalculator={showFinancialCalculator}
            onToggle={() => setShowFinancialCalculator(!showFinancialCalculator)}
            financialData={sampleFinancialData}
          />
        </div>
      </div>
    </div>
  );
}