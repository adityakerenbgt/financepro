'use client';

import { useAuth } from '@/app/auth-context';
import { Check, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';

import { FREE_FEATURES as freeFeatures, PRO_FEATURES as proFeatures, PRICING } from '@/lib/plans';

export default function UpgradePage() {
  const { plan, role } = useAuth();
  const isAlreadyPro = role === 'ADMIN' || plan === 'PRO';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-semibold uppercase tracking-wide text-sm">FinancePro Premium</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Upgrade ke PRO</h1>
        <p className="text-slate-400 max-w-lg mx-auto">
          Kelola keuangan lebih serius dengan akses penuh ke semua fitur manajemen keuangan pribadi.
        </p>
        {isAlreadyPro && (
          <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-2 rounded-full text-sm font-medium">
            <Check className="w-4 h-4" /> Kamu sudah berlangganan PRO
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
              <span className="text-3xl font-bold text-white">Rp 0</span>
              <span className="text-slate-400 ml-1">/ bulan</span>
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
            {plan === 'FREE' ? 'Plan kamu sekarang' : ''}
          </div>
        </div>

        {/* PRO */}
        <div className="bg-gradient-to-b from-yellow-500/10 to-orange-500/5 border border-yellow-500/40 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
              <Zap className="w-3 h-3" /> POPULER
            </span>
          </div>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-white">PRO</h2>
            <div className="mt-2 flex items-end gap-3">
              <div>
                <span className="text-3xl font-bold text-white">Rp {PRICING.proMonthly.toLocaleString('id-ID')}</span>
                <span className="text-slate-400 ml-1">/ bulan</span>
              </div>
              <div className="text-sm text-slate-400 mb-1">
                atau <span className="text-yellow-400 font-semibold">Rp {PRICING.proYearly.toLocaleString('id-ID')}</span> / tahun
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
              ✓ Aktif
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-4 text-sm text-slate-300">
                <p className="font-medium text-white mb-2">Cara upgrade:</p>
                <ol className="space-y-1 list-decimal list-inside text-slate-400">
                  <li>Transfer ke rekening di bawah</li>
                  <li>Kirim bukti ke WhatsApp/email</li>
                  <li>Akun diaktifkan dalam 1x24 jam</li>
                </ol>
              </div>
              <div className="bg-slate-800/60 border border-slate-600 rounded-xl p-4 text-sm">
                <p className="text-slate-400 text-xs mb-2">Rekening pembayaran:</p>
                <p className="text-white font-mono font-semibold">BCA — 1234567890</p>
                <p className="text-slate-400 text-xs">a.n. Virgian Galang</p>
              </div>
              <a
                href="https://wa.me/628xxxxxxxxxx?text=Halo,%20saya%20mau%20upgrade%20FinancePro%20PRO"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
              >
                Hubungi untuk Upgrade
              </a>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-slate-500 text-sm">
        Ada pertanyaan?{' '}
        <Link href="mailto:hello@grexion.ai" className="text-blue-400 hover:underline">
          Hubungi kami
        </Link>
      </p>
    </div>
  );
}
