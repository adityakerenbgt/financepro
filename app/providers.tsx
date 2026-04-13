'use client';

import {
  createContext, useContext, useEffect, useState,
  useCallback, ReactNode,
} from 'react';
import { AuthProvider } from './auth-context';

// ============================================================
// THEME CONTEXT — dark / light mode
// ============================================================
type Theme = 'dark' | 'light';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({ theme: 'dark', toggleTheme: () => {} });

// ============================================================
// TOAST CONTEXT — notification system
// ============================================================
export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

const ToastContext = createContext<{
  toast: (msg: string, type?: ToastItem['type']) => void;
}>({ toast: () => {} });

// ============================================================
// PROVIDERS — wraps the whole app
// ============================================================
export function Providers({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Load saved theme on mount
  useEffect(() => {
    const saved = (localStorage.getItem('fp-theme') as Theme) || 'dark';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (t === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
  }

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fp-theme', next);
      applyTheme(next);
      return next;
    });
  }, []);

  const toast = useCallback((message: string, type: ToastItem['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AuthProvider>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <ToastContext.Provider value={{ toast }}>
          {children}
          <ToastContainer toasts={toasts} dismiss={dismiss} />
        </ToastContext.Provider>
      </ThemeContext.Provider>
    </AuthProvider>
  );
}

// ============================================================
// TOAST CONTAINER UI
// ============================================================
function ToastContainer({
  toasts, dismiss,
}: {
  toasts: ToastItem[];
  dismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  const styles: Record<ToastItem['type'], string> = {
    success: 'bg-emerald-600 border-emerald-500',
    error:   'bg-red-600 border-red-500',
    warning: 'bg-amber-500 border-amber-400',
    info:    'bg-blue-600 border-blue-500',
  };

  const icons: Record<ToastItem['type'], string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
  };

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
            border shadow-2xl text-sm font-medium text-white cursor-pointer
            animate-toast-in ${styles[t.type]}`}
        >
          <span className="text-base">{icons[t.type]}</span>
          <span className="flex-1">{t.message}</span>
          <span className="text-white/60 text-xs">tap to dismiss</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// HOOKS
// ============================================================
export function useTheme() { return useContext(ThemeContext); }
export function useToast() { return useContext(ToastContext); }
