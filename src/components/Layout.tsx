import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  TrendingUp,
  LayoutDashboard,
  GitCompare,
  FileBarChart,
  User,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navItems = [
  { to: '/', label: 'Ana Sayfa', icon: TrendingUp, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/compare', label: 'Karşılaştır', icon: GitCompare },
  { to: '/reports', label: 'Raporlar', icon: FileBarChart },
  { to: '/profile', label: 'Profil', icon: User },
];

export const Layout: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <NavLink to="/" className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold text-gray-900 leading-tight">
                  Borsa Analiz
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">
                  Gerçek zamanlı mali tablo analizi
                </p>
              </div>
            </NavLink>

            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        <nav className="md:hidden border-t border-gray-100 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-1 py-2 min-w-max">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )
                  }
                >
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="text-sm">
              © 2025 Borsa Analiz Sistemi. Tüm hakları saklıdır.
            </p>
            <p className="text-xs mt-2">
              Veriler İş Yatırım&apos;dan alınmaktadır. Yatırım kararlarınızı
              verirken profesyonel danışmanlık alınız.
            </p>
            <p className="text-[11px] text-gray-400 mt-2">
              Aktif rota: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{location.pathname}</code>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
