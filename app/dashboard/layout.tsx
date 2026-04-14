'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, Wallet, TrendingUp, CreditCard, PieChart,
  Target, CalendarDays, Settings, Menu, X, Landmark,
  Sun, Moon, ChevronLeft, ChevronRight, Building2, LogOut, ShieldCheck, Sparkles,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '../providers';
import { useAuth } from '../auth-context';

const allNavItems = [
  { href: '/dashboard/admin', label: 'Admin Panel', icon: ShieldCheck, adminOnly: true },
  { href: '/dashboard',            label: 'Dashboard',         icon: BarChart3 },
  { href: '/transactions',         label: 'Transaksi',         icon: Wallet },
  { href: '/dashboard/rekening',   label: 'Rekening',          icon: Building2 },
  { href: '/dashboard/savings',    label: 'Nabung & Investasi',icon: TrendingUp },
  { href: '/dashboard/debts',      label: 'Hutang & Piutang',  icon: CreditCard },
  { href: '/dashboard/assets',     label: 'Aset',              icon: Landmark },
  { href: '/dashboard/budget',     label: 'Budget',            icon: PieChart },
  { href: '/dashboard/goals',      label: 'Goals',             icon: Target },
  { href: '/dashboard/reports',    label: 'Laporan',           icon: CalendarDays },
  { href: '/dashboard/settings',   label: 'Pengaturan',        icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { logout, role, plan } = useAuth();
  const navItems = allNavItems.filter(item => !item.adminOnly || role === 'ADMIN');
  const isProUser = role === 'ADMIN' || plan === 'PRO';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userName, setUserName] = useState('User');

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('fp-sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  // Fetch user name for avatar
  useEffect(() => {
    fetch('/api/setup')
      .then(r => r.json())
      .then(d => { if (d?.profile?.name) setUserName(d.profile.name); })
      .catch(() => {});
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('fp-sidebar-collapsed', String(next));
  };

  const initials = userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ---- SIDEBAR ---- */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        bg-slate-900 border-r border-slate-800
        flex flex-col transition-all duration-200
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${collapsed ? 'lg:w-16' : 'lg:w-64'}
        w-64
      `}>

        {/* Logo */}
        <div className={`h-14 border-b border-slate-800 flex items-center justify-between px-3 shrink-0`}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg text-white truncate">FinancePro</span>
            </Link>
          )}
          {collapsed && (
            <Link href="/" className="mx-auto">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
            </Link>
          )}
          {/* Close on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white ml-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: theme toggle + collapse + avatar */}
        <div className="p-2 border-t border-slate-800 space-y-1 shrink-0">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              text-slate-400 hover:text-white hover:bg-slate-800 transition-colors
              ${collapsed ? 'justify-center' : ''}`}
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 shrink-0" />
              : <Moon className="w-4 h-4 shrink-0" />}
            {!collapsed && (
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            )}
          </button>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm
              text-slate-400 hover:text-white hover:bg-slate-800 transition-colors
              ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4 shrink-0" />
              : <ChevronLeft className="w-4 h-4 shrink-0" />}
            {!collapsed && <span>Collapse</span>}
          </button>

          {/* Upgrade banner for FREE users */}
          {!isProUser && !collapsed && (
            <Link
              href="/dashboard/upgrade"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-yellow-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-yellow-400 font-semibold">Upgrade ke PRO</p>
                <p className="text-xs text-slate-500 truncate">Rp 29.000/bln</p>
              </div>
            </Link>
          )}
          {!isProUser && collapsed && (
            <Link
              href="/dashboard/upgrade"
              title="Upgrade ke PRO"
              className="flex items-center justify-center px-3 py-2 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
            </Link>
          )}

          {/* User avatar */}
          <div className={`flex items-center gap-3 px-3 py-2 ${collapsed ? 'justify-center' : ''}`}>
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {initials}
              </div>
              {isProUser && !collapsed && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border border-slate-900" title="PRO" />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-white font-medium truncate">{userName}</p>
                  {isProUser ? (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1 rounded font-bold">PRO</span>
                  ) : (
                    <span className="text-xs bg-slate-700 text-slate-400 border border-slate-600 px-1 rounded">FREE</span>
                  )}
                </div>
                <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-400 transition-colors">
                  Logout
                </button>
              </div>
            )}
          </div>

          {/* Logout button - mobile/collapsed view */}
          {collapsed && (
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* ---- MAIN CONTENT ---- */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center gap-3 shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-white flex-1">FinancePro</span>
          <button onClick={toggleTheme} className="text-slate-400 hover:text-white">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
