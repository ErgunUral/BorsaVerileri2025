import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import NewsWidget from '../NewsWidget';

// Mock fetch API
global.fetch = vi.fn();

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock date functions
vi.mock('../utils/dateUtils', () => ({
  formatRelativeTime: vi.fn((date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'Az önce';
    if (hours < 24) return `${hours} saat önce`;
    return `${Math.floor(hours / 24)} gün önce`;
  }),
  formatDate: vi.fn((date) => new Date(date).toLocaleDateString('tr-TR'))
}));

describe('NewsWidget Component', () => {
  const user = userEvent.setup();

  const mockNews = [
    {
      id: '1',
      title: 'Apple Q4 Earnings Beat Expectations',
      summary: 'Apple reported strong quarterly earnings with revenue growth across all segments.',
      content: 'Apple Inc. announced its fourth quarter results today, showing significant growth...',
      source: 'Reuters',
      author: 'John Smith',
      publishedAt: '2024-01-15T10:30:00Z',
      url: 'https://example.com/news/1',
      imageUrl: 'https://example.com/images/apple-earnings.jpg',
      category: 'earnings',
      sentiment: 'positive',
      symbols: ['AAPL'],
      tags: ['earnings', 'technology', 'revenue']
    },
    {
      id: '2',
      title: 'Federal Reserve Announces Interest Rate Decision',
      summary: 'The Fed maintains current interest rates amid economic uncertainty.',
      content: 'The Federal Reserve announced today that it will maintain the current interest rate...',
      source: 'Bloomberg',
      author: 'Jane Doe',
      publishedAt: '2024-01-15T09:15:00Z',
      url: 'https://example.com/news/2',
      imageUrl: 'https://example.com/images/fed-decision.jpg',
      category: 'monetary-policy',
      sentiment: 'neutral',
      symbols: ['SPY', 'QQQ'],
      tags: ['fed', 'interest-rates', 'monetary-policy']
    },
    {
      id: '3',
      title: 'Tesla Stock Drops After Production Concerns',
      summary: 'Tesla shares fell following reports of production delays at Shanghai factory.',
      content: 'Tesla Inc. shares declined in after-hours trading following reports...',
      source: 'CNBC',
      author: 'Mike Johnson',
      publishedAt: '2024-01-15T08:45:00Z',
      url: 'https://example.com/news/3',
      imageUrl: 'https://example.com/images/tesla-factory.jpg',
      category: 'company-news',
      sentiment: 'negative',
      symbols: ['TSLA'],
      tags: ['tesla', 'production', 'manufacturing']
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ news: mockNews, total: mockNews.length })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Temel Render', () => {
    it('haber widget\'i render edilmeli', async () => {
      render(<NewsWidget />);

      expect(screen.getByTestId('news-widget')).toBeInTheDocument();
      expect(screen.getByText('Son Haberler')).toBeInTheDocument();
    });

    it('yükleme durumu gösterilmeli', () => {
      (fetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
      
      render(<NewsWidget />);

      expect(screen.getByTestId('news-loading')).toBeInTheDocument();
      expect(screen.getByText('Haberler yükleniyor...')).toBeInTheDocument();
    });

    it('haberler yüklendikten sonra gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
        expect(screen.getByText('Federal Reserve Announces Interest Rate Decision')).toBeInTheDocument();
        expect(screen.getByText('Tesla Stock Drops After Production Concerns')).toBeInTheDocument();
      });
    });

    it('haber sayısı gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('3 haber')).toBeInTheDocument();
      });
    });
  });

  describe('Haber Kartları', () => {
    it('haber başlığı gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });
    });

    it('haber özeti gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple reported strong quarterly earnings with revenue growth across all segments.')).toBeInTheDocument();
      });
    });

    it('haber kaynağı gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Reuters')).toBeInTheDocument();
        expect(screen.getByText('Bloomberg')).toBeInTheDocument();
        expect(screen.getByText('CNBC')).toBeInTheDocument();
      });
    });

    it('yayın tarihi gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText(/saat önce|gün önce|Az önce/)).toBeInTheDocument();
      });
    });

    it('haber görseli gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        expect(images).toHaveLength(3);
        expect(images[0]).toHaveAttribute('src', 'https://example.com/images/apple-earnings.jpg');
      });
    });

    it('sentiment göstergesi gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByTestId('sentiment-positive')).toBeInTheDocument();
        expect(screen.getByTestId('sentiment-neutral')).toBeInTheDocument();
        expect(screen.getByTestId('sentiment-negative')).toBeInTheDocument();
      });
    });

    it('ilgili semboller gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('TSLA')).toBeInTheDocument();
        expect(screen.getByText('SPY')).toBeInTheDocument();
      });
    });
  });

  describe('Haber Detayı', () => {
    it('haber tıklandığında detay açılmalı', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        const newsItem = screen.getByText('Apple Q4 Earnings Beat Expectations');
        fireEvent.click(newsItem);
      });

      expect(screen.getByTestId('news-detail-modal')).toBeInTheDocument();
      expect(screen.getByText('Apple Inc. announced its fourth quarter results today, showing significant growth...')).toBeInTheDocument();
    });

    it('detay modalında tam içerik gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        const newsItem = screen.getByText('Apple Q4 Earnings Beat Expectations');
        fireEvent.click(newsItem);
      });

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('earnings')).toBeInTheDocument();
      expect(screen.getByText('technology')).toBeInTheDocument();
      expect(screen.getByText('revenue')).toBeInTheDocument();
    });

    it('detay modalı kapatılabilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        const newsItem = screen.getByText('Apple Q4 Earnings Beat Expectations');
        fireEvent.click(newsItem);
      });

      const closeButton = screen.getByTestId('close-modal');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('news-detail-modal')).not.toBeInTheDocument();
    });

    it('ESC tuşu ile modal kapatılabilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        const newsItem = screen.getByText('Apple Q4 Earnings Beat Expectations');
        fireEvent.click(newsItem);
      });

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByTestId('news-detail-modal')).not.toBeInTheDocument();
    });

    it('modal dışına tıklandığında kapatılmalı', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        const newsItem = screen.getByText('Apple Q4 Earnings Beat Expectations');
        fireEvent.click(newsItem);
      });

      const modalOverlay = screen.getByTestId('modal-overlay');
      fireEvent.click(modalOverlay);

      expect(screen.queryByTestId('news-detail-modal')).not.toBeInTheDocument();
    });
  });

  describe('Filtreleme', () => {
    it('kategori filtresi çalışmalı', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByTestId('category-filter');
      await user.selectOptions(categoryFilter, 'earnings');

      expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      expect(screen.queryByText('Federal Reserve Announces Interest Rate Decision')).not.toBeInTheDocument();
    });

    it('sentiment filtresi çalışmalı', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      const sentimentFilter = screen.getByTestId('sentiment-filter');
      await user.selectOptions(sentimentFilter, 'positive');

      expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      expect(screen.queryByText('Tesla Stock Drops After Production Concerns')).not.toBeInTheDocument();
    });

    it('sembol filtresi çalışmalı', async () => {
      render(<NewsWidget symbol="AAPL" />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
        expect(screen.queryByText('Federal Reserve Announces Interest Rate Decision')).not.toBeInTheDocument();
      });
    });

    it('tarih aralığı filtresi çalışmalı', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      const dateFilter = screen.getByTestId('date-filter');
      await user.selectOptions(dateFilter, 'today');

      // Bugünkü haberler gösterilmeli
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('date=today'),
        expect.any(Object)
      );
    });

    it('filtreleri temizle butonu çalışmalı', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      const categoryFilter = screen.getByTestId('category-filter');
      await user.selectOptions(categoryFilter, 'earnings');

      const clearButton = screen.getByText('Filtreleri Temizle');
      fireEvent.click(clearButton);

      expect(categoryFilter).toHaveValue('');
    });
  });

  describe('Arama', () => {
    it('arama kutusu çalışmalı', async () => {
      render(<NewsWidget />);

      const searchInput = screen.getByTestId('news-search');
      await user.type(searchInput, 'Apple');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('search=Apple'),
          expect.any(Object)
        );
      });
    });

    it('arama sonuçları gösterilmeli', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ news: [mockNews[0]], total: 1 })
      });

      render(<NewsWidget />);

      const searchInput = screen.getByTestId('news-search');
      await user.type(searchInput, 'Apple');

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
        expect(screen.queryByText('Tesla Stock Drops After Production Concerns')).not.toBeInTheDocument();
      });
    });

    it('arama temizle butonu çalışmalı', async () => {
      render(<NewsWidget />);

      const searchInput = screen.getByTestId('news-search');
      await user.type(searchInput, 'Apple');

      const clearButton = screen.getByTestId('clear-search');
      fireEvent.click(clearButton);

      expect(searchInput).toHaveValue('');
    });

    it('arama sonucu bulunamadığında mesaj gösterilmeli', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ news: [], total: 0 })
      });

      render(<NewsWidget />);

      const searchInput = screen.getByTestId('news-search');
      await user.type(searchInput, 'NonExistentTerm');

      await waitFor(() => {
        expect(screen.getByText('Arama kriterlerinize uygun haber bulunamadı')).toBeInTheDocument();
      });
    });
  });

  describe('Sıralama', () => {
    it('tarihe göre sıralama çalışmalı', async () => {
      render(<NewsWidget />);

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'date-desc');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=date-desc'),
          expect.any(Object)
        );
      });
    });

    it('relevansa göre sıralama çalışmalı', async () => {
      render(<NewsWidget />);

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'relevance');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=relevance'),
          expect.any(Object)
        );
      });
    });

    it('popülerliğe göre sıralama çalışmalı', async () => {
      render(<NewsWidget />);

      const sortSelect = screen.getByTestId('sort-select');
      await user.selectOptions(sortSelect, 'popularity');

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('sort=popularity'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Sayfalama', () => {
    it('daha fazla yükle butonu gösterilmeli', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ news: mockNews, total: 10, hasMore: true })
      });

      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Daha Fazla Yükle')).toBeInTheDocument();
      });
    });

    it('daha fazla yükle butonu çalışmalı', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ news: mockNews, total: 10, hasMore: true })
      });

      render(<NewsWidget />);

      await waitFor(() => {
        const loadMoreButton = screen.getByText('Daha Fazla Yükle');
        fireEvent.click(loadMoreButton);
      });

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('tüm haberler yüklendiğinde buton gizlenmeli', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ news: mockNews, total: 3, hasMore: false })
      });

      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.queryByText('Daha Fazla Yükle')).not.toBeInTheDocument();
      });
    });

    it('infinite scroll çalışmalı', async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ news: mockNews, total: 10, hasMore: true })
      });

      render(<NewsWidget enableInfiniteScroll={true} />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      // Scroll to bottom
      const scrollContainer = screen.getByTestId('news-list');
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 1000 } });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Paylaşım', () => {
    it('haber paylaşım butonu gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getAllByTestId('share-button')).toHaveLength(3);
      });
    });

    it('paylaşım modalı açılabilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        const shareButton = screen.getAllByTestId('share-button')[0];
        fireEvent.click(shareButton);
      });

      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    });

    it('link kopyalama çalışmalı', async () => {
      const mockClipboard = {
        writeText: vi.fn().mockResolvedValue(undefined)
      };
      Object.assign(navigator, { clipboard: mockClipboard });

      render(<NewsWidget />);

      await waitFor(() => {
        const shareButton = screen.getAllByTestId('share-button')[0];
        fireEvent.click(shareButton);
      });

      const copyButton = screen.getByText('Linki Kopyala');
      fireEvent.click(copyButton);

      expect(mockClipboard.writeText).toHaveBeenCalledWith('https://example.com/news/1');
    });

    it('sosyal medya paylaşımı çalışmalı', async () => {
      const mockOpen = vi.fn();
      Object.assign(window, { open: mockOpen });

      render(<NewsWidget />);

      await waitFor(() => {
        const shareButton = screen.getAllByTestId('share-button')[0];
        fireEvent.click(shareButton);
      });

      const twitterButton = screen.getByText('Twitter');
      fireEvent.click(twitterButton);

      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com'),
        '_blank'
      );
    });
  });

  describe('Favoriler', () => {
    it('haberi favorilere ekleme butonu gösterilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getAllByTestId('favorite-button')).toHaveLength(3);
      });
    });

    it('haber favorilere eklenebilmeli', async () => {
      const onFavorite = vi.fn();
      
      render(<NewsWidget onFavorite={onFavorite} />);

      await waitFor(() => {
        const favoriteButton = screen.getAllByTestId('favorite-button')[0];
        fireEvent.click(favoriteButton);
      });

      expect(onFavorite).toHaveBeenCalledWith(mockNews[0]);
    });

    it('favori haberler vurgulanmalı', async () => {
      render(<NewsWidget favorites={['1']} />);

      await waitFor(() => {
        const favoriteButton = screen.getAllByTestId('favorite-button')[0];
        expect(favoriteButton).toHaveClass('text-yellow-500');
      });
    });
  });

  describe('Hata Durumları', () => {
    it('API hatası gösterilmeli', async () => {
      (fetch as any).mockRejectedValue(new Error('Network error'));

      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByTestId('news-error')).toBeInTheDocument();
        expect(screen.getByText('Haberler yüklenirken bir hata oluştu')).toBeInTheDocument();
      });
    });

    it('yeniden deneme butonu çalışmalı', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'))
                    .mockResolvedValue({
                      ok: true,
                      json: async () => ({ news: mockNews, total: mockNews.length })
                    });

      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Haberler yüklenirken bir hata oluştu')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Yeniden Dene');
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });
    });

    it('404 hatası özel mesaj göstermeli', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Not found' })
      });

      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Haber bulunamadı')).toBeInTheDocument();
      });
    });

    it('rate limit hatası özel mesaj göstermeli', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' })
      });

      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Tasarım', () => {
    it('mobil görünümde kartlar düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });

      render(<NewsWidget />);

      const container = screen.getByTestId('news-widget');
      expect(container).toHaveClass('flex-col');
    });

    it('tablet görünümde kartlar düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });

      render(<NewsWidget />);

      const container = screen.getByTestId('news-widget');
      expect(container).toHaveClass('md:grid-cols-2');
    });

    it('masaüstü görünümde kartlar düzenlenmeli', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024
      });

      render(<NewsWidget />);

      const container = screen.getByTestId('news-widget');
      expect(container).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Performans', () => {
    it('bileşen hızlı render edilmeli', () => {
      const startTime = performance.now();
      render(<NewsWidget />);
      const endTime = performance.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(100); // 100ms'den az
    });

    it('büyük haber listesi ile performans korunmalı', async () => {
      const largeNewsList = Array.from({ length: 100 }, (_, i) => ({
        ...mockNews[0],
        id: `${i + 1}`,
        title: `News Item ${i + 1}`
      }));

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ news: largeNewsList, total: largeNewsList.length })
      });

      const startTime = performance.now();
      render(<NewsWidget />);
      
      await waitFor(() => {
        expect(screen.getByText('News Item 1')).toBeInTheDocument();
      });
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(500); // 500ms'den az
    });

    it('gereksiz re-render olmamalı', async () => {
      const renderSpy = vi.fn();
      
      const TestComponent = (props: any) => {
        renderSpy();
        return <NewsWidget {...props} />;
      };

      const { rerender } = render(<TestComponent />);
      
      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });
      
      // Aynı props ile yeniden render
      rerender(<TestComponent />);
      
      expect(renderSpy).toHaveBeenCalledTimes(2); // İlk render + rerender
    });
  });

  describe('Klavye Navigasyonu', () => {
    it('Tab tuşu ile haberler arasında gezinilebilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      const firstNews = screen.getByTestId('news-item-1');
      const secondNews = screen.getByTestId('news-item-2');

      firstNews.focus();
      expect(firstNews).toHaveFocus();

      fireEvent.keyDown(firstNews, { key: 'Tab' });
      expect(secondNews).toHaveFocus();
    });

    it('Enter tuşu ile haber açılabilmeli', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      const firstNews = screen.getByTestId('news-item-1');
      firstNews.focus();
      fireEvent.keyDown(firstNews, { key: 'Enter' });

      expect(screen.getByTestId('news-detail-modal')).toBeInTheDocument();
    });

    it('Arrow tuşları ile navigasyon çalışmalı', async () => {
      render(<NewsWidget />);

      await waitFor(() => {
        expect(screen.getByText('Apple Q4 Earnings Beat Expectations')).toBeInTheDocument();
      });

      const firstNews = screen.getByTestId('news-item-1');
      const secondNews = screen.getByTestId('news-item-2');

      firstNews.focus();
      fireEvent.keyDown(firstNews, { key: 'ArrowDown' });
      expect(secondNews).toHaveFocus();

      fireEvent.keyDown(secondNews, { key: 'ArrowUp' });
      expect(firstNews).toHaveFocus();
    });
  });

  describe('Temizlik', () => {
    it('component unmount olduğunda API çağrıları iptal edilmeli', () => {
      const abortSpy = vi.fn();
      const mockAbortController = {
        abort: abortSpy,
        signal: {}
      };
      
      global.AbortController = vi.fn(() => mockAbortController) as any;

      const { unmount } = render(<NewsWidget />);
      
      unmount();
      
      expect(abortSpy).toHaveBeenCalled();
    });

    it('component unmount olduğunda event listener\'lar temizlenmeli', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(<NewsWidget />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });

    it('component unmount olduğunda IntersectionObserver temizlenmeli', () => {
      const disconnectSpy = vi.fn();
      (global.IntersectionObserver as any).mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: disconnectSpy
      }));

      const { unmount } = render(<NewsWidget enableInfiniteScroll={true} />);
      
      unmount();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});