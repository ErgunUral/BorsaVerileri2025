import React from 'react';
import { Link } from 'react-router-dom';
import { GitCompare, ArrowLeft, Plus } from 'lucide-react';

export default function ComparePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-500/20">
          <GitCompare className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Hisse Karşılaştırma</h1>
          <p className="text-sm text-gray-600 mt-0.5">Birden fazla hisseyi yan yana karşılaştırın</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="inline-flex p-4 bg-emerald-50 rounded-2xl mb-4">
          <GitCompare className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Karşılaştırma Sayfası</h2>
        <p className="text-gray-600 max-w-md mx-auto mb-6">
          2-5 arası hisse seçerek finansal oranlarını, karlılıklarını ve risk seviyelerini karşılaştırabilirsiniz.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Ana sayfaya dön, hisse seç ve karşılaştırmaya ekle
        </Link>
      </div>
    </div>
  );
}
