import { useState, useEffect } from 'react';
import { Figma, Plus, Trash2, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';
import ComponentMapping from '../components/ComponentMapping';

interface FigmaConnection {
  id: string;
  name: string;
  figma_file_id: string;
  status: 'active' | 'inactive' | 'error';
  last_sync: string;
  created_at: string;
}

interface DesignToken {
  id: string;
  token_name: string;
  token_type: 'colors' | 'typography' | 'spacing' | 'shadows';
  token_value: any;
  description?: string;
  updated_at: string;
}

interface SyncHistory {
  id: string;
  sync_type: string;
  status: 'success' | 'error';
  details: any;
  created_at: string;
}

const FigmaConnect = () => {
  const [connections, setConnections] = useState<FigmaConnection[]>([]);
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showNewConnectionForm, setShowNewConnectionForm] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'connections' | 'tokens' | 'history' | 'mapping'>('connections');
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    figmaApiKey: '',
    figmaFileId: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    if (selectedConnection) {
      loadTokens(selectedConnection);
      loadSyncHistory(selectedConnection);
    }
  }, [selectedConnection]);

  const loadConnections = async () => {
    try {
      const response = await fetch('/api/figma/connections');
      if (response.ok) {
        const data = await response.json();
        setConnections(data);
        if (data.length > 0 && !selectedConnection) {
          setSelectedConnection(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load connections:', err);
    }
  };

  const loadTokens = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/figma/tokens/${connectionId}`);
      if (response.ok) {
        const data = await response.json();
        setTokens(data);
      }
    } catch (err) {
      console.error('Failed to load tokens:', err);
    }
  };

  const loadSyncHistory = async (connectionId: string) => {
    try {
      const response = await fetch(`/api/figma/sync-history/${connectionId}`);
      if (response.ok) {
        const data = await response.json();
        setSyncHistory(data);
      }
    } catch (err) {
      console.error('Failed to load sync history:', err);
    }
  };

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/figma/connections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const newConnection = await response.json();
        setConnections(prev => [...prev, newConnection]);
        setFormData({ name: '', figmaApiKey: '', figmaFileId: '' });
        setShowNewConnectionForm(false);
        setSuccess('Figma bağlantısı başarıyla oluşturuldu!');
        setSelectedConnection(newConnection.id);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Bağlantı oluşturulurken hata oluştu');
      }
    } catch (err) {
      setError('Ağ hatası oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Bu bağlantıyı silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/figma/connections/${connectionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
        if (selectedConnection === connectionId) {
          const remaining = connections.filter(conn => conn.id !== connectionId);
          setSelectedConnection(remaining.length > 0 ? remaining[0].id : null);
        }
        setSuccess('Bağlantı başarıyla silindi');
      } else {
        setError('Bağlantı silinirken hata oluştu');
      }
    } catch (err) {
      setError('Ağ hatası oluştu');
    }
  };

  const handleSyncTokens = async (connectionId: string) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/figma/sync/${connectionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceSync: true }),
      });

      if (response.ok) {
        const result = await response.json();
        setSuccess(`Senkronizasyon tamamlandı: ${result.tokensAdded} eklendi, ${result.tokensUpdated} güncellendi`);
        loadTokens(connectionId);
        loadSyncHistory(connectionId);
        loadConnections(); // Refresh connection status
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR');
  };

  const renderTokenValue = (token: DesignToken) => {
    switch (token.token_type) {
      case 'colors':
        return (
          <div className="flex items-center space-x-2">
            <div 
              className="w-6 h-6 rounded border border-gray-300"
              style={{ backgroundColor: token.token_value.hex }}
            ></div>
            <span className="font-mono text-sm">{token.token_value.hex}</span>
          </div>
        );
      case 'typography':
        return (
          <div className="text-sm">
            <div>{token.token_value.fontFamily} {token.token_value.fontWeight}</div>
            <div className="text-gray-500">{token.token_value.fontSize} / {token.token_value.lineHeight}</div>
          </div>
        );
      case 'spacing':
        return (
          <div className="font-mono text-sm">
            {token.token_value.px}px ({token.token_value.rem}rem)
          </div>
        );
      case 'shadows':
        return (
          <div className="text-sm text-gray-600">
            {token.token_value.offsetX} {token.token_value.offsetY} {token.token_value.blurRadius}
          </div>
        );
      default:
        return <span className="text-gray-500">-</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-3">
            <Figma className="h-8 w-8 text-purple-600" />
            <span>Figma Entegrasyonu</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Figma dosyalarınızdan tasarım tokenlarını senkronize edin
          </p>
        </div>
        <button
          onClick={() => setShowNewConnectionForm(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Bağlantı</span>
        </button>
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

      {/* New Connection Form */}
      {showNewConnectionForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Yeni Figma Bağlantısı</h2>
          <form onSubmit={handleCreateConnection} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bağlantı Adı
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Örn: Ana Tasarım Sistemi"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Figma API Anahtarı
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={formData.figmaApiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, figmaApiKey: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="figd_..."
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Figma hesap ayarlarınızdan Personal Access Token oluşturun
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Figma Dosya ID
              </label>
              <input
                type="text"
                value={formData.figmaFileId}
                onChange={(e) => setFormData(prev => ({ ...prev, figmaFileId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Figma dosya URL'sindeki ID"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Örn: https://www.figma.com/file/[DOSYA_ID]/dosya-adi
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Oluşturuluyor...' : 'Bağlantı Oluştur'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewConnectionForm(false);
                  setFormData({ name: '', figmaApiKey: '', figmaFileId: '' });
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content */}
      {connections.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connections List */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Bağlantılar</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {connections.map((connection) => (
                  <div
                    key={connection.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConnection === connection.id ? 'bg-purple-50 border-r-2 border-purple-500' : ''
                    }`}
                    onClick={() => setSelectedConnection(connection.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{connection.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{connection.figma_file_id}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            getStatusColor(connection.status)
                          }`}>
                            {getStatusText(connection.status)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(connection.last_sync)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSyncTokens(connection.id);
                          }}
                          disabled={loading}
                          className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Senkronize Et"
                        >
                          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConnection(connection.id);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-2">
            {selectedConnection && (
              <div className="bg-white border border-gray-200 rounded-lg">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-4">
                    {[
                      { id: 'tokens', label: 'Tasarım Tokenları', count: tokens.length },
                      { id: 'mapping', label: 'Bileşen Eşleştirmeleri', count: 0 },
                      { id: 'history', label: 'Senkronizasyon Geçmişi', count: syncHistory.length },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeTab === tab.id
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
                <div className="p-4">
                  {activeTab === 'tokens' && (
                    <div className="space-y-4">
                      {tokens.length > 0 ? (
                        <div className="overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Token Adı
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Tip
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Değer
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Güncelleme
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {tokens.map((token) => (
                                <tr key={token.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">{token.token_name}</div>
                                      {token.description && (
                                        <div className="text-sm text-gray-500">{token.description}</div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {token.token_type}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap">
                                    {renderTokenValue(token)}
                                  </td>
                                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(token.updated_at)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Figma className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Henüz token bulunamadı</p>
                          <p className="text-sm text-gray-400 mt-1">Senkronizasyon başlatın</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'mapping' && (
                    <div>
                      {connections.length > 0 ? (
                        <div className="space-y-4">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <p className="text-blue-800 text-sm">
                              <strong>Not:</strong> Bileşen eşleştirmeleri için önce bir Figma bağlantısı seçin.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {connections.map((connection) => (
                              <div key={connection.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="font-medium text-gray-900">{connection.name}</h3>
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    connection.status === 'active' ? 'bg-green-100 text-green-800' :
                                    connection.status === 'error' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {connection.status === 'active' ? 'Aktif' :
                                     connection.status === 'error' ? 'Hata' : 'Beklemede'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{connection.figma_file_id}</p>
                                <button
                                  onClick={() => {
                                    setSelectedConnection(connection.id);
                                    setActiveTab('mapping');
                                  }}
                                  className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                >
                                  Bileşenleri Yönet
                                </button>
                              </div>
                            ))}
                          </div>
                          {selectedConnection && (
                            <div className="mt-8">
                              <div className="bg-white border border-gray-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-6">
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-900">
                                      {connections.find(c => c.id === selectedConnection)?.name} - Bileşen Eşleştirmeleri
                                    </h3>
                                    <p className="text-sm text-gray-600">{connections.find(c => c.id === selectedConnection)?.figma_file_id}</p>
                                  </div>
                                  <button
                                    onClick={() => setSelectedConnection(null)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                <ComponentMapping 
                                  connectionId={selectedConnection}
                                  apiKey={connections.find(c => c.id === selectedConnection)?.figma_file_id}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-gray-400 mb-4">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                            </svg>
                          </div>
                          <p className="text-gray-500">Bileşen eşleştirmesi için önce Figma bağlantısı oluşturun</p>
                          <p className="text-sm text-gray-400 mt-1">Bağlantılar sekmesinden yeni bir Figma bağlantısı ekleyin</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-4">
                      {syncHistory.length > 0 ? (
                        <div className="space-y-3">
                          {syncHistory.map((entry) => (
                            <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className={`w-2 h-2 rounded-full ${
                                    entry.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                  }`}></div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {entry.sync_type === 'design_tokens' ? 'Tasarım Token Senkronizasyonu' : entry.sync_type}
                                    </p>
                                    <p className="text-xs text-gray-500">{formatDate(entry.created_at)}</p>
                                  </div>
                                </div>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  entry.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {entry.status === 'success' ? 'Başarılı' : 'Hata'}
                                </span>
                              </div>
                              {entry.details && (
                                <div className="mt-3 text-sm text-gray-600">
                                  {entry.status === 'success' ? (
                                    <div className="flex space-x-4">
                                      {entry.details.tokensAdded > 0 && (
                                        <span>✅ {entry.details.tokensAdded} eklendi</span>
                                      )}
                                      {entry.details.tokensUpdated > 0 && (
                                        <span>🔄 {entry.details.tokensUpdated} güncellendi</span>
                                      )}
                                      {entry.details.tokensRemoved > 0 && (
                                        <span>🗑️ {entry.details.tokensRemoved} silindi</span>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-red-600">❌ {entry.details.error}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">Henüz senkronizasyon geçmişi yok</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12">
          <Figma className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Figma Entegrasyonu</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Figma dosyalarınızdan tasarım tokenlarını otomatik olarak senkronize edin. 
            Başlamak için ilk bağlantınızı oluşturun.
          </p>
          <button
            onClick={() => setShowNewConnectionForm(true)}
            className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>İlk Bağlantıyı Oluştur</span>
          </button>
          <div className="mt-8 text-left max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Nasıl Başlarım?</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">1</div>
                <div>
                  <p className="text-gray-900 font-medium">Figma API Anahtarı Alın</p>
                  <p className="text-gray-600 text-sm">Figma hesabınızda Settings &gt; Personal Access Tokens bölümünden yeni bir token oluşturun.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">2</div>
                <div>
                  <p className="text-gray-900 font-medium">Figma Dosya ID'sini Bulun</p>
                  <p className="text-gray-600 text-sm">Figma dosyanızın URL'sindeki ID'yi kopyalayın (figma.com/file/[ID]/dosya-adi).</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">3</div>
                <div>
                  <p className="text-gray-900 font-medium">Bağlantı Oluşturun</p>
                  <p className="text-gray-600 text-sm">Yukarıdaki butona tıklayarak yeni bir Figma bağlantısı oluşturun ve tokenları senkronize edin.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FigmaConnect;