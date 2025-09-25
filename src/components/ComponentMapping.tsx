import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Search, ExternalLink, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

interface ComponentMapping {
  id: string;
  figma_component_id: string;
  figma_component_name: string;
  local_component_path: string;
  mapping_config: any;
  status: 'active' | 'inactive' | 'error';
  created_at: string;
  updated_at: string;
}

interface FigmaComponent {
  id: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks: string[];
}

interface LocalComponent {
  path: string;
  name: string;
}

interface ComponentSuggestion {
  figmaComponentId: string;
  figmaComponentName: string;
  suggestedLocalPath: string;
  description: string;
}

interface ComponentMappingProps {
  connectionId: string;
  apiKey: string;
}

const ComponentMapping = ({ connectionId, apiKey }: ComponentMappingProps) => {
  const [mappings, setMappings] = useState<ComponentMapping[]>([]);
  const [figmaComponents, setFigmaComponents] = useState<FigmaComponent[]>([]);
  const [localComponents, setLocalComponents] = useState<LocalComponent[]>([]);
  const [suggestions, setSuggestions] = useState<ComponentSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewMappingForm, setShowNewMappingForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<'mappings' | 'suggestions'>('mappings');
  
  // Form states
  const [formData, setFormData] = useState({
    figmaComponentId: '',
    figmaComponentName: '',
    localComponentPath: '',
    mappingConfig: {}
  });

  useEffect(() => {
    if (connectionId) {
      loadMappings();
      loadFigmaComponents();
      loadLocalComponents();
    }
  }, [connectionId]);

  const loadMappings = async () => {
    try {
      const response = await fetch(`/api/component-mapping/connections/${connectionId}/mappings`);
      if (response.ok) {
        const data = await response.json();
        setMappings(data);
      }
    } catch (err) {
      console.error('Failed to load mappings:', err);
    }
  };

  const loadFigmaComponents = async () => {
    try {
      const response = await fetch(`/api/component-mapping/connections/${connectionId}/figma-components`, {
        headers: {
          'X-Figma-Api-Key': apiKey
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFigmaComponents(data);
      }
    } catch (err) {
      console.error('Failed to load Figma components:', err);
    }
  };

  const loadLocalComponents = async () => {
    try {
      const response = await fetch('/api/component-mapping/local-components');
      if (response.ok) {
        const data = await response.json();
        setLocalComponents(data);
      }
    } catch (err) {
      console.error('Failed to load local components:', err);
    }
  };

  const handleSyncComponents = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/component-mapping/connections/${connectionId}/sync-components`, {
        method: 'POST',
        headers: {
          'X-Figma-Api-Key': apiKey
        }
      });

      if (response.ok) {
        const result = await response.json();
        setSuggestions(result.suggestions || []);
        setSuccess(`${result.newComponents} yeni bileşen bulundu, ${result.existingMappings} mevcut eşleştirme`);
        setSelectedTab('suggestions');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Senkronizasyon hatası');
      }
    } catch (err) {
      setError('Ağ hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/component-mapping/connections/${connectionId}/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newMapping = await response.json();
        setMappings(prev => [...prev, newMapping]);
        setFormData({ figmaComponentId: '', figmaComponentName: '', localComponentPath: '', mappingConfig: {} });
        setShowNewMappingForm(false);
        setSuccess('Bileşen eşleştirmesi başarıyla oluşturuldu!');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Eşleştirme oluşturulurken hata oluştu');
      }
    } catch (err) {
      setError('Ağ hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromSuggestion = async (suggestion: ComponentSuggestion) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/component-mapping/connections/${connectionId}/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          figmaComponentId: suggestion.figmaComponentId,
          figmaComponentName: suggestion.figmaComponentName,
          localComponentPath: suggestion.suggestedLocalPath,
          mappingConfig: {}
        }),
      });

      if (response.ok) {
        const newMapping = await response.json();
        setMappings(prev => [...prev, newMapping]);
        setSuggestions(prev => prev.filter(s => s.figmaComponentId !== suggestion.figmaComponentId));
        setSuccess('Bileşen eşleştirmesi oluşturuldu!');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Eşleştirme oluşturulurken hata oluştu');
      }
    } catch (err) {
      setError('Ağ hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Bu eşleştirmeyi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/component-mapping/mappings/${mappingId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMappings(prev => prev.filter(mapping => mapping.id !== mappingId));
        setSuccess('Eşleştirme başarıyla silindi');
      } else {
        setError('Eşleştirme silinirken hata oluştu');
      }
    } catch (err) {
      setError('Ağ hatası oluştu');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Aktif';
      case 'inactive': return 'Pasif';
      case 'error': return 'Hata';
      default: return 'Bilinmiyor';
    }
  };

  const filteredMappings = mappings.filter(mapping => 
    mapping.figma_component_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mapping.local_component_path.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuggestions = suggestions.filter(suggestion => 
    suggestion.figmaComponentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bileşen Eşleştirmeleri</h2>
          <p className="text-gray-600 text-sm mt-1">
            Figma bileşenlerini yerel bileşenlerle eşleştirin
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleSyncComponents}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Bileşenleri Keşfet</span>
          </button>
          <button
            onClick={() => setShowNewMappingForm(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Manuel Eşleştirme</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* New Mapping Form */}
      {showNewMappingForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Yeni Bileşen Eşleştirmesi</h3>
          <form onSubmit={handleCreateMapping} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Figma Bileşeni
                </label>
                <select
                  value={formData.figmaComponentId}
                  onChange={(e) => {
                    const selectedComponent = figmaComponents.find(c => c.id === e.target.value);
                    setFormData(prev => ({
                      ...prev,
                      figmaComponentId: e.target.value,
                      figmaComponentName: selectedComponent?.name || ''
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Figma bileşeni seçin</option>
                  {figmaComponents.map((component) => (
                    <option key={component.id} value={component.id}>
                      {component.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Yerel Bileşen
                </label>
                <select
                  value={formData.localComponentPath}
                  onChange={(e) => setFormData(prev => ({ ...prev, localComponentPath: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                >
                  <option value="">Yerel bileşen seçin</option>
                  {localComponents.map((component) => (
                    <option key={component.path} value={component.path}>
                      {component.name} ({component.path})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Oluşturuluyor...' : 'Eşleştirme Oluştur'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewMappingForm(false);
                  setFormData({ figmaComponentId: '', figmaComponentName: '', localComponentPath: '', mappingConfig: {} });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Bileşen ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'mappings', label: 'Mevcut Eşleştirmeler', count: mappings.length },
            { id: 'suggestions', label: 'Öneriler', count: suggestions.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                selectedTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {selectedTab === 'mappings' && (
          <div className="space-y-4">
            {filteredMappings.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Figma Bileşeni
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Yerel Bileşen
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Durum
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Güncelleme
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {mapping.figma_component_name}
                              </div>
                              <div className="text-sm text-gray-500 font-mono">
                                {mapping.figma_component_id.substring(0, 12)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 font-mono">
                            {mapping.local_component_path}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            getStatusColor(mapping.status)
                          }`}>
                            {getStatusText(mapping.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(mapping.updated_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleDeleteMapping(mapping.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">Henüz bileşen eşleştirmesi yok</p>
                <p className="text-sm text-gray-400 mt-1">Figma bileşenlerini keşfedin veya manuel eşleştirme oluşturun</p>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'suggestions' && (
          <div className="space-y-4">
            {filteredSuggestions.length > 0 ? (
              <div className="space-y-3">
                {filteredSuggestions.map((suggestion) => (
                  <div key={suggestion.figmaComponentId} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {suggestion.figmaComponentName}
                            </h4>
                            {suggestion.description && (
                              <p className="text-sm text-gray-500 mt-1">{suggestion.description}</p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-mono text-gray-700">
                              {suggestion.suggestedLocalPath}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCreateFromSuggestion(suggestion)}
                        disabled={loading}
                        className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        Eşleştir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-gray-500">Henüz öneri yok</p>
                <p className="text-sm text-gray-400 mt-1">"Bileşenleri Keşfet" butonuna tıklayarak yeni öneriler alın</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentMapping;