import React, { useState } from 'react';
import { Settings, Search, Check, X, Filter } from 'lucide-react';
import { 
  financialDataFields, 
  getFieldsByCategory, 
  categoryLabels,
  defaultSelectedFields,
  FinancialDataField 
} from '../config/financialFields';

interface FieldSelectorProps {
  selectedFields: string[];
  onFieldsChange: (fields: string[]) => void;
  showSelector: boolean;
  onToggleSelector: () => void;
}

const FieldSelector: React.FC<FieldSelectorProps> = ({
  selectedFields,
  onFieldsChange,
  showSelector,
  onToggleSelector
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>;
  
  const filteredFields = financialDataFields.filter(field => {
    const matchesSearch = field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         field.key.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || field.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  const handleFieldToggle = (fieldKey: string) => {
    if (selectedFields.includes(fieldKey)) {
      onFieldsChange(selectedFields.filter(key => key !== fieldKey));
    } else {
      onFieldsChange([...selectedFields, fieldKey]);
    }
  };
  
  const handleSelectAll = () => {
    const allKeys = filteredFields.map(field => field.key);
    const newSelected = [...new Set([...selectedFields, ...allKeys])];
    onFieldsChange(newSelected);
  };
  
  const handleDeselectAll = () => {
    const filteredKeys = filteredFields.map(field => field.key);
    const newSelected = selectedFields.filter(key => !filteredKeys.includes(key));
    onFieldsChange(newSelected);
  };
  
  const handleSelectDefaults = () => {
    onFieldsChange(defaultSelectedFields);
  };
  
  const handleClearAll = () => {
    onFieldsChange([]);
  };
  
  const getCategoryCount = (category: string) => {
    if (category === 'all') {
      return financialDataFields.length;
    }
    return getFieldsByCategory(category as FinancialDataField['category']).length;
  };
  
  const getSelectedCategoryCount = (category: string) => {
    if (category === 'all') {
      return selectedFields.length;
    }
    const categoryFields = getFieldsByCategory(category as FinancialDataField['category']);
    return categoryFields.filter(field => selectedFields.includes(field.key)).length;
  };
  
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <span>Alan Seçimi</span>
          <span className="text-sm font-normal text-gray-500">
            ({selectedFields.length} seçili)
          </span>
        </h3>
        <button
          onClick={onToggleSelector}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Filter className="h-4 w-4" />
          <span>{showSelector ? 'Gizle' : 'Alan Seç'}</span>
        </button>
      </div>
      
      {showSelector ? (
        <div className="space-y-6">
          {/* Arama ve Filtreler */}
          <div className="space-y-4">
            {/* Arama Kutusu */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Alan ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            
            {/* Kategori Filtreleri */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tümü ({getCategoryCount('all')})
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {categoryLabels[category]} ({getSelectedCategoryCount(category)}/{getCategoryCount(category)})
                </button>
              ))}
            </div>
          </div>
          
          {/* Toplu İşlemler */}
          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
            <button
              onClick={handleSelectAll}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              Filtrelenenleri Seç ({filteredFields.length})
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Filtrelenenleri Kaldır
            </button>
            <button
              onClick={handleSelectDefaults}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Varsayılanları Seç
            </button>
            <button
              onClick={handleClearAll}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Tümünü Temizle
            </button>
          </div>
          
          {/* Alan Listesi */}
          <div className="max-h-96 overflow-y-auto">
            {filteredFields.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Arama kriterlerinize uygun alan bulunamadı.</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
                >
                  Filtreleri temizle
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFields.map(field => {
                  const isSelected = selectedFields.includes(field.key);
                  
                  return (
                    <div
                      key={field.key}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                      onClick={() => handleFieldToggle(field.key)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 mt-0.5 ${
                          isSelected ? 'text-blue-600' : 'text-gray-400'
                        }`}>
                          {isSelected ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            <div className="h-5 w-5 border-2 border-gray-300 rounded" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className={`font-medium text-sm ${
                              isSelected ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {field.label}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                                {categoryLabels[field.category]}
                              </span>
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-600 rounded">
                                {field.unit}
                              </span>
                            </div>
                          </div>
                          <p className={`text-xs leading-relaxed ${
                            isSelected ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                            {field.description}
                          </p>
                          {field.isCalculated ? (
                            <div className="mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Hesaplanmış Alan
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Özet Bilgi */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">{selectedFields.length}</div>
                <div className="text-xs text-gray-600">Seçili Alan</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{filteredFields.length}</div>
                <div className="text-xs text-gray-600">Filtrelenen</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-600">{financialDataFields.length}</div>
                <div className="text-xs text-gray-600">Toplam Alan</div>
              </div>
              <div>
                <div className="text-lg font-bold text-purple-600">{categories.length}</div>
                <div className="text-xs text-gray-600">Kategori</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FieldSelector;