'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/app/auth-context';
import { useLang } from '@/app/i18n';

type Variant = 'nav' | 'hero' | 'final';

const primary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#2563eb] to-[#06b6d4] font-semibold text-[#ffffff] shadow-lg shadow-[#2563eb]/30 transition hover:brightness-110 hover:shadow-[#2563eb]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#67e8f9]';
const ghost =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-[#2a3a5c] bg-[#0d1526]/60 font-semibold text-[#e8eefc] transition hover:border-[#3b82f6]/60 hover:bg-[#13203a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#67e8f9]';

// Tombol aksi yang menyesuaikan status login. Landing tidak pernah me-redirect paksa.
export default function AuthCta({ variant }: { variant: Variant }) {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLang();
  const loggedIn = !loading && isAuthenticated;

  if (variant === 'nav') {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        {loggedIn ? (
          <Link href="/dashboard" className={`${primary} px-4 py-2 text-sm`}>
            {t('Buka Dashboard', 'Open Dashboard')} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-[#cbd5e1] transition hover:text-[#ffffff]">
              {t('Masuk', 'Log in')}
            </Link>
            <Link href="/register" className={`${primary} px-4 py-2 text-sm`}>
              {t('Daftar Gratis', 'Sign Up Free')}
            </Link>
          </>
        )}
      </div>
    );
  }

  const size = variant === 'hero' ? 'px-7 py-3.5 text-base' : 'px-8 py-4 text-lg';

  if (loggedIn) {
    return (
      <Link href="/dashboard" className={`${primary} ${size}`}>
        {t('Buka Dashboard', 'Open Dashboard')} <ArrowRight className="h-5 w-5" />
      </Link>
    );
  }

  return (
    <>
      <Link href="/register" className={`${primary} ${size}`}>
        {t('Daftar Gratis', 'Sign Up Free')} <ArrowRight className="h-5 w-5" />
      </Link>
      {variant === 'hero' ? (
        <a href="#harga" className={`${ghost} ${size}`}>
          {t('Lihat Harga', 'See Pricing')}
        </a>
      ) : (
        <Link href="/login" className={`${ghost} ${size}`}>
          {t('Sudah punya akun? Masuk', 'Have an account? Log in')}
        </Link>
      )}
    </>
  );
}
