import { useState } from 'react';
import { Database, TrendingUp, BarChart3, Activity } from 'lucide-react';
import Calculator from '../components/Calculator';
import FinancialCalculator from '../components/FinancialCalculator';

interface HomeProps {
  onNavigateToDataManagement?: () => void;
  onNavigateToAnalysis?: () => void;
  onNavigateToRatios?: () => void;
  onNavigateToDashboard?: () => void;
}

export default function Home({ 
  onNavigateToDataManagement, 
  onNavigateToAnalysis, 
  onNavigateToRatios, 
  onNavigateToDashboard 
}: HomeProps) {
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
        
        {/* Hızlı Erişim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Veri Yönetimi Kartı */}
          <div 
            onClick={onNavigateToDataManagement}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-blue-500 group"
          >
            <div className="flex items-center justify-between mb-4">
              <Database className="h-8 w-8 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">YENİ</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Veri Yönetimi</h3>
            <p className="text-sm text-gray-600 mb-4">Tüm verileri kontrol edin, mükerrer verileri analiz edin</p>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              <span>Detaylı Analiz</span>
              <BarChart3 className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Hisse Analizi Kartı */}
          <div 
            onClick={onNavigateToAnalysis}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-green-500 group"
          >
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="h-8 w-8 text-green-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">AKTİF</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hisse Analizi</h3>
            <p className="text-sm text-gray-600 mb-4">Gerçek zamanlı hisse senedi analizi ve öneriler</p>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <span>Analiz Et</span>
              <Activity className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Hesap Makinesi Kartı */}
          <div 
            onClick={onNavigateToRatios}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-purple-500 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 w-8 text-purple-600 text-2xl font-bold group-hover:scale-110 transition-transform">🧮</div>
              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-medium">ARAÇ</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hesap Makinesi</h3>
            <p className="text-sm text-gray-600 mb-4">Temel ve finansal hesaplamalar</p>
            <div className="flex items-center text-purple-600 text-sm font-medium">
              <span>Hesapla</span>
              <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>

          {/* Sistem Durumu Kartı */}
          <div 
            onClick={onNavigateToDashboard}
            className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer border-l-4 border-orange-500 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-8 w-8 text-orange-600 text-2xl font-bold group-hover:scale-110 transition-transform">⚡</div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">ONLINE</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sistem Durumu</h3>
            <p className="text-sm text-gray-600 mb-4">Sunucu ve veri bağlantı durumu</p>
            <div className="flex items-center text-orange-600 text-sm font-medium">
              <span>Kontrol Et</span>
              <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
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