import React from 'react';
import { FileBarChart } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/20">
          <FileBarChart className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Raporlar</h1>
          <p className="text-sm text-gray-600 mt-0.5">PDF ve Excel formatında raporlar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Temel Analiz Raporu', desc: 'Seçili hissenin tüm temel analiz raporu', icon: '📊' },
          { title: 'Portföy Performans', desc: 'Portföyünüzün aylık/ yıllık performansı', icon: '📈' },
          { title: 'Sektör Raporu', desc: 'İlgili sektördeki şirketlerin karşılaştırması', icon: '🏭' },
          { title: 'Fiyat Hedef Raporu', desc: 'Teknik analiz ve fiyat hedefleri', icon: '🎯' },
        ].map((r) => (
          <div key={r.title} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="text-3xl mb-3">{r.icon}</div>
            <h3 className="font-semibold text-gray-900">{r.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{r.desc}</p>
            <button className="mt-4 text-sm text-violet-600 hover:text-violet-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed" disabled>
              Hazırlanıyor...
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
