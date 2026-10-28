import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PortfolioItem {
  stockCode: string;
  companyName?: string;
  quantity: number;
  avgPrice: number;
  currentPrice?: number;
  addedAt: string;
}

export interface PriceAlert {
  id: string;
  stockCode: string;
  targetPrice: number;
  direction: 'above' | 'below';
  createdAt: string;
  active: boolean;
}

export interface StockNote {
  id: string;
  stockCode: string;
  content: string;
  createdAt: string;
}

interface PortfolioState {
  items: PortfolioItem[];
  favorites: string[];
  alerts: PriceAlert[];
  notes: StockNote[];

  addItem: (item: Omit<PortfolioItem, 'addedAt'>) => void;
  updateItem: (stockCode: string, patch: Partial<PortfolioItem>) => void;
  removeItem: (stockCode: string) => void;
  clearItems: () => void;
  updateCurrentPrice: (stockCode: string, price: number) => void;

  toggleFavorite: (stockCode: string) => void;
  isFavorite: (stockCode: string) => boolean;

  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'active'>) => void;
  toggleAlert: (id: string) => void;
  removeAlert: (id: string) => void;

  addNote: (note: Omit<StockNote, 'id' | 'createdAt'>) => void;
  removeNote: (id: string) => void;

  getTotalCost: () => number;
  getTotalValue: () => number;
  getTotalPnL: () => number;
  getTotalPnLPercent: () => number;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      items: [],
      favorites: [],
      alerts: [],
      notes: [],

      addItem: (item) =>
        set((state) => {
          const existing = state.items.find(
            (i) => i.stockCode === item.stockCode
          );
          if (existing) {
            const totalQuantity = existing.quantity + item.quantity;
            const totalCost =
              existing.quantity * existing.avgPrice +
              item.quantity * item.avgPrice;
            const newAvg =
              totalQuantity > 0 ? totalCost / totalQuantity : item.avgPrice;
            return {
              items: state.items.map((i) =>
                i.stockCode === item.stockCode
                  ? {
                      ...i,
                      quantity: totalQuantity,
                      avgPrice: newAvg,
                      currentPrice: item.currentPrice ?? i.currentPrice,
                    }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, addedAt: new Date().toISOString() },
            ],
          };
        }),

      updateItem: (stockCode, patch) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.stockCode === stockCode ? { ...i, ...patch } : i
          ),
        })),

      removeItem: (stockCode) =>
        set((state) => ({
          items: state.items.filter((i) => i.stockCode !== stockCode),
        })),

      clearItems: () => set({ items: [] }),

      updateCurrentPrice: (stockCode, price) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.stockCode === stockCode ? { ...i, currentPrice: price } : i
          ),
        })),

      toggleFavorite: (stockCode) =>
        set((state) => ({
          favorites: state.favorites.includes(stockCode)
            ? state.favorites.filter((s) => s !== stockCode)
            : [...state.favorites, stockCode],
        })),

      isFavorite: (stockCode) => get().favorites.includes(stockCode),

      addAlert: (alert) =>
        set((state) => ({
          alerts: [
            ...state.alerts,
            {
              ...alert,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
              active: true,
            },
          ],
        })),

      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, active: !a.active } : a
          ),
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      addNote: (note) =>
        set((state) => ({
          notes: [
            ...state.notes,
            {
              ...note,
              id: Date.now().toString(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      removeNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),

      getTotalCost: () =>
        get().items.reduce(
          (sum, i) => sum + i.quantity * i.avgPrice,
          0
        ),

      getTotalValue: () =>
        get().items.reduce((sum, i) => {
          const price = i.currentPrice ?? i.avgPrice;
          return sum + i.quantity * price;
        }, 0),

      getTotalPnL: () => get().getTotalValue() - get().getTotalCost(),

      getTotalPnLPercent: () => {
        const cost = get().getTotalCost();
        if (cost === 0) return 0;
        return (get().getTotalPnL() / cost) * 100;
      },
    }),
    {
      name: 'borsa-portfolio-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        favorites: state.favorites,
        alerts: state.alerts,
        notes: state.notes,
      }),
    }
  )
);
