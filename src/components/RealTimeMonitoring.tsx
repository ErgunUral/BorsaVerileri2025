import React, { useState, useEffect } from 'react';
import { useRealTimeMonitoring } from '../hooks/useRealTimeMonitoring';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Play,
  Pause,
  Settings,
  Trash2,
  X,
  Plus,
  Edit,
  Save,
  AlertCircle,
  Info,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface RealTimeMonitoringProps {
  className?: string;
}

const RealTimeMonitoring: React.FC<RealTimeMonitoringProps> = ({ className = '' }) => {
  const {
    alerts,
    alertRules,
    systemMetrics,
    config,
    isMonitoring,
    alertStats,
    startMonitoring,
    stopMonitoring,
    acknowledgeAlert,
    acknowledgeAllAlerts,
    clearAlert,
    clearAllAlerts,
    addAlertRule,
    updateAlertRule,
    deleteAlertRule,
    updateConfig,
    requestNotificationPermission
  } = useRealTimeMonitoring();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'alerts' | 'rules' | 'settings'>('dashboard');
  const [showNewRuleForm, setShowNewRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<any[]>([]);
  
  // Metrik geçmişini takip et
  useEffect(() => {
    setMetricsHistory(prev => {
      const newEntry = {
        time: new Date().toLocaleTimeString(),
        cacheHitRate: systemMetrics.cacheHitRate,
        apiResponseTime: systemMetrics.apiResponseTime,
        errorRate: systemMetrics.errorRate,
        memoryUsage: systemMetrics.memoryUsage
      };
      
      const updated = [...prev, newEntry];
      return updated.slice(-20); // Son 20 veri noktasını tut
    });
  }, [systemMetrics]);
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };
  
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <Bell className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };
  
  const getMetricStatus = (type: string, value: number) => {
    const rule = alertRules.find(r => r.type === type && r.enabled);
    if (!rule) return 'normal';
    
    switch (rule.operator) {
      case 'greater_than':
        return value > rule.threshold ? 'alert' : 'normal';
      case 'less_than':
        return value < rule.threshold ? 'alert' : 'normal';
      case 'equals':
        return value === rule.threshold ? 'alert' : 'normal';
      default:
        return 'normal';
    }
  };
  
  const MetricCard = ({ title, value, unit, type, icon }: {
    title: string;
    value: number;
    unit: string;
    type: string;
    icon: React.ReactNode;
  }) => {
    const status = getMetricStatus(type, value);
    const isAlert = status === 'alert';
    
    return (
      <div className={`p-4 rounded-lg border-2 transition-all duration-300 ${
        isAlert ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${
              isAlert ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {icon}
            </div>
            <h3 className="font-medium text-gray-900">{title}</h3>
          </div>
          {isAlert && (
            <div className="flex items-center space-x-1 text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">UYARI</span>
            </div>
          )}
        </div>
        <div className="flex items-baseline space-x-1">
          <span className={`text-2xl font-bold ${
            isAlert ? 'text-red-600' : 'text-gray-900'
          }`}>
            {value.toFixed(1)}
          </span>
          <span className="text-sm text-gray-500">{unit}</span>
        </div>
      </div>
    );
  };
  
  const NewRuleForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      type: 'cache_hit_rate' as const,
      threshold: 0,
      operator: 'greater_than' as const,
      severity: 'medium' as const,
      description: ''
    });
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      addAlertRule({ ...formData, enabled: true });
      setShowNewRuleForm(false);
      setFormData({
        name: '',
        type: 'cache_hit_rate',
        threshold: 0,
        operator: 'greater_than',
        severity: 'medium',
        description: ''
      });
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Yeni Alert Kuralı</h3>
            <button
              onClick={() => setShowNewRuleForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kural Adı
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Metrik Tipi
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cache_hit_rate">Cache Hit Rate</option>
                <option value="api_response_time">API Response Time</option>
                <option value="error_rate">Error Rate</option>
                <option value="duplicate_data">Duplicate Data</option>
                <option value="memory_usage">Memory Usage</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operatör
                </label>
                <select
                  value={formData.operator}
                  onChange={(e) => setFormData(prev => ({ ...prev, operator: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="greater_than">Büyük</option>
                  <option value="less_than">Küçük</option>
                  <option value="equals">Eşit</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Eşik Değer
                </label>
                <input
                  type="number"
                  value={formData.threshold}
                  onChange={(e) => setFormData(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Önem Derecesi
              </label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Düşük</option>
                <option value="medium">Orta</option>
                <option value="high">Yüksek</option>
                <option value="critical">Kritik</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Kaydet
              </button>
              <button
                type="button"
                onClick={() => setShowNewRuleForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Activity className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Real-Time Monitoring</h2>
            <p className="text-gray-600">Sistem durumu ve uyarıları izleyin</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
            isMonitoring ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
            }`} />
            <span className="text-sm font-medium">
              {isMonitoring ? 'Aktif' : 'Durduruldu'}
            </span>
          </div>
          
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              isMonitoring
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isMonitoring ? 'Durdur' : 'Başlat'}</span>
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Activity },
            { id: 'alerts', label: `Uyarılar (${alertStats.unacknowledged})`, icon: Bell },
            { id: 'rules', label: 'Kurallar', icon: Settings },
            { id: 'settings', label: 'Ayarlar', icon: Settings }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      
      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Sistem Metrikleri */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Cache Hit Rate"
              value={systemMetrics.cacheHitRate}
              unit="%"
              type="cache_hit_rate"
              icon={<Zap className="w-5 h-5" />}
            />
            <MetricCard
              title="API Response Time"
              value={systemMetrics.apiResponseTime}
              unit="ms"
              type="api_response_time"
              icon={<Clock className="w-5 h-5" />}
            />
            <MetricCard
              title="Error Rate"
              value={systemMetrics.errorRate}
              unit="%"
              type="error_rate"
              icon={<AlertTriangle className="w-5 h-5" />}
            />
            <MetricCard
              title="Memory Usage"
              value={systemMetrics.memoryUsage}
              unit="%"
              type="memory_usage"
              icon={<Activity className="w-5 h-5" />}
            />
          </div>
          
          {/* Metrik Grafikleri */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Cache Hit Rate & API Response Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="cacheHitRate"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Cache Hit Rate (%)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="apiResponseTime"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="API Response Time (ms)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Error Rate & Memory Usage</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metricsHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="errorRate"
                    stackId="1"
                    stroke="#F59E0B"
                    fill="#FEF3C7"
                    name="Error Rate (%)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memoryUsage"
                    stackId="2"
                    stroke="#10B981"
                    fill="#D1FAE5"
                    name="Memory Usage (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Son Uyarılar */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Son Uyarılar</h3>
              <button
                onClick={() => setActiveTab('alerts')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Tümünü Gör
              </button>
            </div>
            
            {alerts.slice(0, 5).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>Henüz uyarı bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.slice(0, 5).map(alert => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      getSeverityColor(alert.severity)
                    } ${alert.acknowledged ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      {getSeverityIcon(alert.severity)}
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-xs opacity-75">
                          {alert.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                      >
                        Onayla
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Alert İstatistikleri */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-gray-900">{alertStats.total}</div>
              <div className="text-sm text-gray-600">Toplam</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-red-600">{alertStats.critical}</div>
              <div className="text-sm text-gray-600">Kritik</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-orange-600">{alertStats.high}</div>
              <div className="text-sm text-gray-600">Yüksek</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-yellow-600">{alertStats.medium}</div>
              <div className="text-sm text-gray-600">Orta</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
              <div className="text-2xl font-bold text-blue-600">{alertStats.low}</div>
              <div className="text-sm text-gray-600">Düşük</div>
            </div>
          </div>
          
          {/* Alert Aksiyonları */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Uyarılar ({alerts.length})</h3>
            <div className="flex space-x-2">
              <button
                onClick={acknowledgeAllAlerts}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Tümünü Onayla</span>
              </button>
              <button
                onClick={clearAllAlerts}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Tümünü Temizle</span>
              </button>
            </div>
          </div>
          
          {/* Alert Listesi */}
          <div className="bg-white rounded-lg border border-gray-200">
            {alerts.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-lg font-medium mb-2">Uyarı Bulunmuyor</h3>
                <p>Sistem normal çalışıyor, herhangi bir uyarı yok.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {alerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`p-4 ${alert.acknowledged ? 'bg-gray-50' : 'bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${
                          getSeverityColor(alert.severity).split(' ')[2]
                        }`}>
                          {getSeverityIcon(alert.severity)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{alert.ruleName}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              getSeverityColor(alert.severity)
                            }`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            {alert.acknowledged && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                ONAYLANDI
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mt-1">{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>Onayla</span>
                          </button>
                        )}
                        <button
                          onClick={() => clearAlert(alert.id)}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Sil</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Alert Kuralları ({alertRules.length})</h3>
            <button
              onClick={() => setShowNewRuleForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Kural</span>
            </button>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="divide-y divide-gray-200">
              {alertRules.map(rule => (
                <div key={rule.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateAlertRule(rule.id, { enabled: !rule.enabled })}
                        className={`p-2 rounded-lg transition-colors ${
                          rule.enabled
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {rule.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">{rule.name}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            getSeverityColor(rule.severity)
                          }`}>
                            {rule.severity.toUpperCase()}
                          </span>
                          {!rule.enabled && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                              DEVRE DIŞI
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{rule.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {rule.type} {rule.operator.replace('_', ' ')} {rule.threshold}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingRule(rule.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteAlertRule(rule.id)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
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
      )}
      
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Monitoring Ayarları</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Genel Ayarlar</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Güncelleme Aralığı (saniye)
                  </label>
                  <input
                    type="number"
                    value={config.updateInterval / 1000}
                    onChange={(e) => updateConfig({ updateInterval: Number(e.target.value) * 1000 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="5"
                    max="300"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimum Alert Sayısı
                  </label>
                  <input
                    type="number"
                    value={config.maxAlerts}
                    onChange={(e) => updateConfig({ maxAlerts: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="10"
                    max="1000"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Otomatik Onaylama (dakika)
                  </label>
                  <input
                    type="number"
                    value={config.autoAcknowledgeAfter}
                    onChange={(e) => updateConfig({ autoAcknowledgeAfter: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="1440"
                  />
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Bildirim Ayarları</h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Browser Bildirimleri
                    </label>
                    <p className="text-xs text-gray-500">Tarayıcı bildirimleri göster</p>
                  </div>
                  <button
                    onClick={() => {
                      if (config.enableNotifications) {
                        updateConfig({ enableNotifications: false });
                      } else {
                        requestNotificationPermission().then(granted => {
                          if (granted) {
                            updateConfig({ enableNotifications: true });
                          }
                        });
                      }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enableNotifications ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enableNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Ses Uyarıları
                    </label>
                    <p className="text-xs text-gray-500">Alert geldiğinde ses çal</p>
                  </div>
                  <button
                    onClick={() => updateConfig({ enableSounds: !config.enableSounds })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.enableSounds ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.enableSounds ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* New Rule Form Modal */}
      {showNewRuleForm && <NewRuleForm />}
    </div>
  );
};

export default RealTimeMonitoring;