import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Plus,
  X,
  Star,
  Bell,
  Minus,
  Pencil,
  Wallet,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart as PieChartIcon,
  StickyNote,
} from 'lucide-react';
import { usePortfolioStore, type PortfolioItem, type PriceAlert, type StockNote } from '../store/portfolioStore';

type DialogType = 'add-item' | 'add-alert' | 'add-note' | null;
type DialogContext = { stockCode?: string; currentPrice?: number; companyName?: string };

const formatTL = (n: number) =>
  new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n);

const formatNumber = (n: number, digits = 2) =>
  new Intl.NumberFormat('tr-TR', { maximumFractionDigits: digits }).format(n);

export default function DashboardPage() {
  const {
    items,
    favorites,
    alerts,
    notes,
    addItem,
    updateItem,
    removeItem,
    getTotalCost,
    getTotalValue,
    getTotalPnL,
    getTotalPnLPercent,
    toggleFavorite,
    addAlert,
    toggleAlert,
    removeAlert,
    addNote,
    removeNote,
  } = usePortfolioStore();

  const [dialog, setDialog] = useState<DialogType>(null);
  const [context, setContext] = useState<DialogContext>({});

  const openDialog = (d: DialogType, ctx: DialogContext = {}) => {
    setContext(ctx);
    setDialog(d);
  };
  const closeDialog = () => setDialog(null);

  const totalCost = getTotalCost();
  const totalValue = getTotalValue();
  const totalPnL = getTotalPnL();
  const totalPnLPct = getTotalPnLPercent();
  const pnlPositive = totalPnL >= 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Portföy Dashboard</h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Yatırımlarınızı takip edin, analizleri inceleyin
            </p>
          </div>
        </div>
        <button
          onClick={() => openDialog('add-item')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="h-4 w-4" />
          Yeni Hisse Ekle
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Toplam Maliyet"
          value={formatTL(totalCost)}
          icon={Wallet}
          gradient="from-slate-500 to-slate-700"
        />
        <StatCard
          label="Anlık Değer"
          value={formatTL(totalValue)}
          icon={BarChart3}
          gradient="from-blue-500 to-indigo-600"
        />
        <StatCard
          label={pnlPositive ? 'Toplam Kâr' : 'Toplam Zarar'}
          value={formatTL(totalPnL)}
          subValue={`%${formatNumber(totalPnLPct)}`}
          icon={pnlPositive ? ArrowUpRight : ArrowDownRight}
          gradient={pnlPositive ? 'from-emerald-500 to-green-600' : 'from-rose-500 to-red-600'}
          positive={pnlPositive}
        />
        <StatCard
          label="Hisse Sayısı"
          value={String(items.length)}
          subValue={`Favori: ${favorites.length}`}
          icon={PieChartIcon}
          gradient="from-purple-500 to-fuchsia-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Portföy Detayı
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Toplam {items.length} hisse senedi
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="Henüz hisse eklenmedi"
                description="Portföyünüze hisse eklemeye başlayın"
                actionLabel="Hisse Ekle"
                onAction={() => openDialog('add-item')}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-left font-medium px-5 py-3">Hisse</th>
                      <th className="text-right font-medium px-5 py-3">Adet</th>
                      <th className="text-right font-medium px-5 py-3">Ort. Maliyet</th>
                      <th className="text-right font-medium px-5 py-3">Fiyat</th>
                      <th className="text-right font-medium px-5 py-3">Değer</th>
                      <th className="text-right font-medium px-5 py-3">K/Z</th>
                      <th className="text-right font-medium px-5 py-3">%</th>
                      <th className="px-5 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <PortfolioRow
                        key={item.stockCode}
                        item={item}
                        onEdit={() => openDialog('add-item', {
                          stockCode: item.stockCode,
                          companyName: item.companyName,
                          currentPrice: item.currentPrice,
                        })}
                        onRemove={() => removeItem(item.stockCode)}
                        onToggleFavorite={() => toggleFavorite(item.stockCode)}
                        isFavorite={favorites.includes(item.stockCode)}
                      />
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold text-gray-900">
                      <td colSpan={4} className="text-right px-5 py-3">Toplam</td>
                      <td className="text-right px-5 py-3">{formatTL(totalValue)}</td>
                      <td className={`text-right px-5 py-3 ${pnlPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatTL(totalPnL)}
                      </td>
                      <td className={`text-right px-5 py-3 ${pnlPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        %{formatNumber(totalPnLPct)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Favori Hisseler
                </h2>
              </div>
            </div>
            {favorites.length === 0 ? (
              <EmptyState
                icon={Star}
                title="Favori hisse yok"
                description="Portföyden yıldız simgesine tıklayarak favorilere ekleyin"
              />
            ) : (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {favorites.map((code) => (
                  <button
                    key={code}
                    onClick={() => toggleFavorite(code)}
                    className="flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 rounded-xl transition-colors group"
                  >
                    <span className="font-semibold text-gray-900">{code}</span>
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 group-hover:fill-transparent" />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Fiyat Uyarıları
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {alerts.filter((a) => a.active).length} aktif uyarı
                </p>
              </div>
              <button
                onClick={() => openDialog('add-alert')}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Uyarı ekle"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {alerts.length === 0 ? (
              <EmptyState
                icon={Bell}
                title="Uyarı tanımlı değil"
                description="Hedef fiyata ulaştığında bildirim alın"
                compact
              />
            ) : (
              <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {alerts.map((a) => (
                  <AlertRow
                    key={a.id}
                    alert={a}
                    onToggle={() => toggleAlert(a.id)}
                    onRemove={() => removeAlert(a.id)}
                  />
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-indigo-500" />
                  Notlar
                </h2>
              </div>
              <button
                onClick={() => openDialog('add-note')}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {notes.length === 0 ? (
              <EmptyState
                icon={StickyNote}
                title="Henüz not yok"
                description="Hisseler hakkında notlar alın"
                compact
              />
            ) : (
              <ul className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {notes.map((n) => (
                  <NoteRow key={n.id} note={n} onRemove={() => removeNote(n.id)} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {dialog === 'add-item' && (
        <AddItemDialog
          onClose={closeDialog}
          onSubmit={(payload) => {
            addItem(payload);
            closeDialog();
          }}
          defaultCode={context.stockCode}
          defaultCompany={context.companyName}
          defaultPrice={context.currentPrice}
          existing={context.stockCode ? items.find((i) => i.stockCode === context.stockCode) : undefined}
        />
      )}

      {dialog === 'add-alert' && (
        <AddAlertDialog
          onClose={closeDialog}
          onSubmit={(payload) => {
            addAlert(payload);
            closeDialog();
          }}
          defaultCode={context.stockCode}
          defaultPrice={context.currentPrice}
        />
      )}

      {dialog === 'add-note' && (
        <AddNoteDialog
          onClose={closeDialog}
          onSubmit={(payload) => {
            addNote(payload);
            closeDialog();
          }}
          defaultCode={context.stockCode}
        />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  gradient,
  positive,
}: {
  label: string;
  value: string;
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${gradient} opacity-10 rounded-full`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subValue !== undefined && (
            <div
              className={`inline-flex items-center gap-1 mt-2 text-sm font-medium ${
                positive === false ? 'text-rose-600' : positive === true ? 'text-emerald-600' : 'text-gray-500'
              }`}
            >
              {positive === true && <TrendingUp className="h-3.5 w-3.5" />}
              {positive === false && <TrendingDown className="h-3.5 w-3.5" />}
              <span>{subValue}</span>
            </div>
          )}
        </div>
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${gradient} text-white shadow-md`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8 px-4' : 'py-12 px-6'}`}>
      <div className={`${compact ? 'p-2.5' : 'p-4'} bg-gray-100 rounded-2xl mb-3`}>
        <Icon className={`${compact ? 'h-6 w-6' : 'h-10 w-10'} text-gray-400`} />
      </div>
      <h3 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-gray-800`}>{title}</h3>
      <p className={`${compact ? 'text-xs' : 'text-sm'} text-gray-500 mt-1 max-w-sm`}>{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function PortfolioRow({
  item,
  onEdit,
  onRemove,
  onToggleFavorite,
  isFavorite,
}: {
  item: PortfolioItem;
  onEdit: () => void;
  onRemove: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}) {
  const price = item.currentPrice ?? item.avgPrice;
  const value = item.quantity * price;
  const cost = item.quantity * item.avgPrice;
  const pnl = value - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
  const positive = pnl >= 0;
  const allocation = usePortfolioStore.getState().getTotalValue() || 1;
  const share = (value / allocation) * 100;

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggleFavorite}
            className="text-gray-400 hover:text-yellow-500 transition-colors"
            title="Favorilere ekle/kaldır"
          >
            <Star
              className={`h-4 w-4 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : ''}`}
            />
          </button>
          <div>
            <div className="font-semibold text-gray-900">{item.stockCode}</div>
            {item.companyName && (
              <div className="text-xs text-gray-500 truncate max-w-[140px]">{item.companyName}</div>
            )}
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-right text-gray-900 font-medium tabular-nums">
        {item.quantity.toLocaleString('tr-TR')}
      </td>
      <td className="px-5 py-4 text-right text-gray-700 tabular-nums">
        {formatTL(item.avgPrice)}
      </td>
      <td className="px-5 py-4 text-right tabular-nums">
        <div className="text-gray-900 font-medium">{formatTL(price)}</div>
        <div className="text-[10px] text-gray-400">Ayrım %{share.toFixed(1)}</div>
      </td>
      <td className="px-5 py-4 text-right font-semibold text-gray-900 tabular-nums">
        {formatTL(value)}
      </td>
      <td className={`px-5 py-4 text-right font-semibold tabular-nums ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {positive ? '+' : ''}
        {formatTL(pnl)}
      </td>
      <td className={`px-5 py-4 text-right font-medium tabular-nums ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {positive ? '+' : ''}%{formatNumber(pnlPct)}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Düzenle"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Sil"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AlertRow({
  alert,
  onToggle,
  onRemove,
}: {
  alert: PriceAlert;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <li className="p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-2 rounded-lg ${
            alert.direction === 'above' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          {alert.direction === 'above' ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-gray-900">{alert.stockCode}</div>
          <div className="text-xs text-gray-500">
            {alert.direction === 'above' ? 'Üstünde' : 'Altında'}{' '}
            <span className="font-medium text-gray-700">{formatTL(alert.targetPrice)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={alert.active}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600" />
        </label>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function NoteRow({ note, onRemove }: { note: StockNote; onRemove: () => void }) {
  return (
    <li className="p-4 group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold">
          {note.stockCode}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">
            {new Date(note.createdAt).toLocaleDateString('tr-TR')}
          </span>
          <button
            onClick={onRemove}
            className="p-1 text-gray-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
        {note.content}
      </p>
    </li>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function AddItemDialog({
  onClose,
  onSubmit,
  defaultCode,
  defaultCompany,
  defaultPrice,
  existing,
}: {
  onClose: () => void;
  onSubmit: (p: Omit<PortfolioItem, 'addedAt'>) => void;
  defaultCode?: string;
  defaultCompany?: string;
  defaultPrice?: number;
  existing?: PortfolioItem;
}) {
  const [stockCode, setStockCode] = useState(existing?.stockCode ?? defaultCode ?? '');
  const [companyName, setCompanyName] = useState(existing?.companyName ?? defaultCompany ?? '');
  const [quantity, setQuantity] = useState<string>(existing ? String(existing.quantity) : '');
  const [avgPrice, setAvgPrice] = useState<string>(
    existing ? String(existing.avgPrice) : defaultPrice ? String(defaultPrice) : ''
  );
  const [currentPrice, setCurrentPrice] = useState<string>(
    existing?.currentPrice ? String(existing.currentPrice) : defaultPrice ? String(defaultPrice) : ''
  );
  const invalidQty = !quantity || Number(quantity) <= 0;
  const invalidPrice = !avgPrice || Number(avgPrice) <= 0;

  return (
    <ModalShell title={existing ? 'Hisseyi Düzenle' : 'Portföye Ekle'} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalidQty || invalidPrice) return;
          onSubmit({
            stockCode: stockCode.trim().toUpperCase(),
            companyName: companyName.trim() || undefined,
            quantity: Number(quantity),
            avgPrice: Number(avgPrice),
            currentPrice: currentPrice ? Number(currentPrice) : undefined,
          });
        }}
      >
        <Field label="Hisse Kodu" required>
          <input
            type="text"
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value.toUpperCase())}
            placeholder="THYAO, AKBNK..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
            maxLength={6}
            required
          />
        </Field>

        <Field label="Şirket Adı (opsiyonel)">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Türk Hava Yolları"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Adet" required>
            <input
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="100"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
              required
            />
          </Field>
          <Field label="Ortalama Maliyet (₺)" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
              <input
                type="number"
                min={0.01}
                step="any"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                placeholder="250.50"
                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
                required
              />
            </div>
          </Field>
        </div>

        <Field label="Güncel Fiyat (₺) (opsiyonel)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
            <input
              type="number"
              min={0}
              step="any"
              value={currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder="300.00"
              className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
            />
          </div>
        </Field>

        {quantity && avgPrice && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Toplam Maliyet</span>
              <span className="font-semibold text-gray-900">
                {formatTL(Number(quantity) * Number(avgPrice))}
              </span>
            </div>
            {currentPrice && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">Anlık Değer</span>
                  <span className="font-semibold text-gray-900">
                    {formatTL(Number(quantity) * Number(currentPrice))}
                  </span>
                </div>
                {(() => {
                  const pnl = Number(quantity) * Number(currentPrice) - Number(quantity) * Number(avgPrice);
                  const pct = Number(avgPrice) > 0 ? (pnl / (Number(quantity) * Number(avgPrice))) * 100 : 0;
                  const pos = pnl >= 0;
                  return (
                    <div className={`flex justify-between font-semibold ${pos ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <span>Önizleme K/Z</span>
                      <span>
                        {pos ? '+' : ''}
                        {formatTL(pnl)} (%{formatNumber(pct)})
                      </span>
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={invalidQty || invalidPrice || !stockCode.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors inline-flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {existing ? 'Güncelle' : 'Ekle'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddAlertDialog({
  onClose,
  onSubmit,
  defaultCode,
  defaultPrice,
}: {
  onClose: () => void;
  onSubmit: (p: Omit<PriceAlert, 'id' | 'createdAt' | 'active'>) => void;
  defaultCode?: string;
  defaultPrice?: number;
}) {
  const [stockCode, setStockCode] = useState(defaultCode ?? '');
  const [targetPrice, setTargetPrice] = useState(defaultPrice ? String(defaultPrice) : '');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const invalid = !stockCode.trim() || !targetPrice || Number(targetPrice) <= 0;

  return (
    <ModalShell title="Fiyat Uyarısı Ekle" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid) return;
          onSubmit({
            stockCode: stockCode.trim().toUpperCase(),
            targetPrice: Number(targetPrice),
            direction,
          });
        }}
      >
        <Field label="Hisse Kodu" required>
          <input
            type="text"
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value.toUpperCase())}
            placeholder="THYAO"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
            maxLength={6}
            required
          />
        </Field>

        <Field label="Yön" required>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { v: 'above', label: 'Üstünde', icon: ArrowUpRight, color: 'emerald' },
                { v: 'below', label: 'Altında', icon: ArrowDownRight, color: 'rose' },
              ] as const
            ).map((o) => {
              const active = direction === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setDirection(o.v)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border font-medium transition-colors ${
                    active
                      ? o.color === 'emerald'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-rose-50 border-rose-300 text-rose-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <o.icon className="h-4 w-4" />
                  {o.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Hedef Fiyat (₺)" required icon={Target}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₺</span>
            <input
              type="number"
              min={0.01}
              step="any"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="500.00"
              className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent tabular-nums"
              required
            />
          </div>
        </Field>

        <Field label="Hızlı Seçimler" icon={Percent}>
          <div className="grid grid-cols-4 gap-2">
            {defaultPrice
              ? [0.9, 0.95, 1.05, 1.1].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTargetPrice(String(Number((defaultPrice * m).toFixed(2))))}
                    className="py-1.5 px-2 text-xs bg-gray-50 hover:bg-gray-100 rounded-md font-semibold text-gray-700 border border-gray-200 transition-colors"
                  >
                    %{((m - 1) * 100).toFixed(0)}
                  </button>
                ))
              : null}
          </div>
        </Field>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={invalid}
            className="flex-1 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors inline-flex items-center justify-center gap-2"
          >
            <Bell className="h-4 w-4" />
            Ekle
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function AddNoteDialog({
  onClose,
  onSubmit,
  defaultCode,
}: {
  onClose: () => void;
  onSubmit: (p: Omit<StockNote, 'id' | 'createdAt'>) => void;
  defaultCode?: string;
}) {
  const [stockCode, setStockCode] = useState(defaultCode ?? '');
  const [content, setContent] = useState('');
  const invalid = !stockCode.trim() || !content.trim();

  return (
    <ModalShell title="Not Ekle" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid) return;
          onSubmit({ stockCode: stockCode.trim().toUpperCase(), content: content.trim() });
        }}
      >
        <Field label="Hisse Kodu" required>
          <input
            type="text"
            value={stockCode}
            onChange={(e) => setStockCode(e.target.value.toUpperCase())}
            placeholder="THYAO"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono uppercase"
            maxLength={6}
            required
          />
        </Field>

        <Field label="Not" required>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Hisse hakkındaki yorumlarınız..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            required
          />
        </Field>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={invalid}
            className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium transition-colors inline-flex items-center justify-center gap-2"
          >
            <StickyNote className="h-4 w-4" />
            Kaydet
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function Field({
  label,
  required,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
        <span className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-rose-500 ml-0.5">*</span>}
        </span>
      </div>
      {children}
    </label>
  );
}
