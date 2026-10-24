'use client';

import { Languages } from 'lucide-react';
import { useLang, type Lang } from '@/app/i18n';

// variant 'landing': palet gelap hex (aman dari override tema terang); 'app': memakai kelas slate bawaan dashboard.
export default function LanguageSwitcher({ variant = 'app', className = '' }: { variant?: 'landing' | 'app'; className?: string }) {
  const { lang, setLang } = useLang();

  const wrap = variant === 'landing'
    ? 'border-[#243456] bg-[#0d1526]/70'
    : 'border-slate-700 bg-slate-800';
  const on = variant === 'landing' ? 'bg-[#2563eb] text-[#ffffff]' : 'bg-blue-600 text-white';
  const off = variant === 'landing' ? 'text-[#94a3b8] hover:text-[#f8fafc]' : 'text-slate-400 hover:text-white';

  const options: { code: Lang; label: string; title: string }[] = [
    { code: 'id', label: 'ID', title: 'Bahasa Indonesia' },
    { code: 'en', label: 'EN', title: 'English' },
  ];

  return (
    <div
      role="group"
      aria-label={lang === 'en' ? 'Language' : 'Bahasa'}
      className={`inline-flex items-center gap-1 rounded-lg border p-0.5 ${wrap} ${className}`}
    >
      <Languages className={`ml-1.5 h-3.5 w-3.5 shrink-0 ${variant === 'landing' ? 'text-[#64748b]' : 'text-slate-500'}`} aria-hidden />
      {options.map((o) => (
        <button
          key={o.code}
          type="button"
          title={o.title}
          aria-pressed={lang === o.code}
          onClick={() => setLang(o.code)}
          className={`rounded-md px-2 py-1 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#67e8f9] ${lang === o.code ? on : off}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
