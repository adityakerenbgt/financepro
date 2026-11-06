'use client';

import { useAuth } from '@/app/auth-context';
import { Check, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

import { FREE_FEATURES_I18N, PRO_FEATURES_I18N, PRICING } from '@/lib/plans';
import { useLang } from '@/app/i18n';
import { formatMoney } from '@/lib/currency';
import PaymentRequestForm from '@/app/components/PaymentRequestForm';
import WhatsAppPayButton from '@/app/components/WhatsAppPayButton';

export default function UpgradePage() {
  const { plan, role } = useAuth();
  const { t } = useLang();
  const freeFeatures = FREE_FEATURES_I18N.map(([id, en]) => t(id, en));
  const proFeatures = PRO_FEATURES_I18N.map(([id, en]) => t(id, en));
  const isAlreadyPro = role === 'ADMIN' || plan === 'PRO';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">FinancePro Premium</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">{t('Upgrade ke PRO', 'Upgrade to PRO')}</h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          {t('Kelola keuangan lebih serius dengan akses penuh ke semua fitur manajemen keuangan pribadi.', 'Take your finances seriously with full access to every personal finance feature.')}
        </p>
        {isAlreadyPro && (
          <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-full text-sm font-medium">
            <Check className="w-4 h-4" /> {t('Kamu sudah berlangganan PRO', 'You are subscribed to PRO')}
          </div>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-6">

        {/* FREE */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">Free</h2>
            <div className="mt-2">
              <span className="text-3xl font-bold text-white">{formatMoney(0)}</span>
              <span className="text-slate-400 ml-1">{t('/ bulan', '/ month')}</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {freeFeatures.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                <Check className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <div className="text-center text-slate-500 text-sm py-2">
            {plan === 'FREE' ? t('Plan kamu sekarang', 'Your current plan') : ''}
          </div>
        </div>

        {/* PRO */}
        <div className="bg-gradient-to-b from-yellow-500/10 to-orange-500/5 border border-yellow-500/40 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" /> {t('POPULER', 'POPULAR')}
            </span>
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">PRO</h2>
            <div className="mt-2 flex items-end gap-3">
              <div>
                <span className="text-3xl font-bold text-white">{formatMoney(PRICING.proMonthly)}</span>
                <span className="text-slate-400 ml-1">{t('/ bulan', '/ month')}</span>
              </div>
              <div className="text-sm text-slate-400 mb-1">
                {t('atau', 'or')} <span className="text-yellow-400 font-semibold">{formatMoney(PRICING.proYearly)}</span> {t('/ tahun', '/ year')}
              </div>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {proFeatures.map(f => (
              <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                <Check className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>

          {isAlreadyPro ? (
            <div className="w-full text-center py-3 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl text-sm font-medium">
              ✓ {t('Aktif', 'Active')}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-4 text-sm text-slate-300">
                <p className="font-medium text-white mb-2">{t('Cara upgrade:', 'How to upgrade:')}</p>
                <ol className="space-y-1 list-decimal list-inside text-slate-400">
                  <li>{t('Chat admin via WhatsApp untuk mendapat info pembayaran', 'Chat the admin on WhatsApp to get the payment details')}</li>
                  <li>{t('Transfer sesuai nominal paket', 'Transfer the exact plan amount')}</li>
                  <li>{t('Unggah bukti transfer di formulir pembayaran di bawah', 'Upload the proof in the payment form below')}</li>
                  <li>{t('Admin mengonfirmasi dan PRO aktif dalam 1x24 jam', 'The admin confirms and PRO is activated within 24 hours')}</li>
                </ol>
              </div>
              <WhatsAppPayButton />
              <a
                href="#bayar"
                className="block w-full text-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
              >
                {t('Sudah transfer? Unggah Bukti', 'Already paid? Upload Proof')}
              </a>
            </div>
          )}
        </div>
      </div>

      {role !== 'ADMIN' && <PaymentRequestForm />}

      <p className="text-center text-slate-500 text-sm">
        {t('Ada pertanyaan?', 'Questions?')}{' '}
        <Link href="mailto:hello@grexion.ai" className="text-blue-400 hover:underline">
          {t('Hubungi kami', 'Contact us')}
        </Link>
      </p>
    </div>
  );
}
