import React, { useState } from 'react';

const TestPage: React.FC = () => {
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAPI = async () => {
    setLoading(true);
    try {
      console.log('🧪 Testing API call...');
      
      // Test price API
      const priceResponse = await fetch('/api/stocks/ASELS/price');
      const priceData = await priceResponse.json();
      console.log('💰 Price data:', priceData);
      
      // Test analysis API
      const analysisResponse = await fetch('/api/stocks/ASELS/analysis');
      const analysisData = await analysisResponse.json();
      console.log('📊 Analysis data:', analysisData);
      
      const combinedData = {
        stockCode: 'ASELS',
        price: priceData.data,
        analysis: analysisData.data,
        timestamp: new Date().toISOString()
      };
      
      console.log('🎯 Combined data:', combinedData);
      setTestData(combinedData);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">API Test Sayfası</h1>
      
      <button
        onClick={testAPI}
        disabled={loading}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-6"
      >
        {loading ? 'Test Ediliyor...' : 'API Test Et'}
      </button>
      
      {testData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Test Sonuçları</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(testData, null, 2)}
            </pre>
          </div>
          
          {testData.analysis && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Şirket Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Şirket:</strong> {testData.analysis.companyName}
                </div>
                <div>
                  <strong>Hisse Kodu:</strong> {testData.analysis.stockCode}
                </div>
                <div>
                  <strong>Risk Seviyesi:</strong> {testData.analysis.riskLevel}
                </div>
                <div>
                  <strong>Yatırım Skoru:</strong> {testData.analysis.investmentScore}/100
                </div>
              </div>
            </div>
          )}
          
          {testData.price && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Fiyat Bilgileri</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>Fiyat:</strong> {testData.price.price} TL
                </div>
                <div>
                  <strong>Değişim:</strong> %{testData.price.changePercent}
                </div>
                <div>
                  <strong>Hacim:</strong> {testData.price.volume?.toLocaleString()}
                </div>
                <div>
                  <strong>Son Güncelleme:</strong> {testData.price.lastUpdated}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TestPage;