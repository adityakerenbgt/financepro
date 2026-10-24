'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3, Wallet, TrendingUp, Target, CreditCard, PieChart, CalendarDays, Bot,
  Landmark, Check, X, ShieldCheck, Lock, KeyRound, Database, Sparkles, Zap, Plus,
  NotebookPen, LineChart, Flag, Smartphone, Languages, MessageCircle, ArrowRight, Coins,
} from 'lucide-react';
import AuthCta from './AuthCta';
import LanguageSwitcher from '../LanguageSwitcher';
import CurrencySwitcher from '../CurrencySwitcher';
import { useLang } from '@/app/i18n';
import { useCurrency } from '@/app/currency-context';
import { formatMoney } from '@/lib/currency';
import {
  PRICING, YEARLY_SAVING_PERCENT, YEARLY_PER_MONTH, formatRupiah, FREE_FEATURES_I18N, PRO_FEATURES_I18N,
} from '@/lib/plans';

// Kelas Tailwind harus literal agar ter-generate di production build (tidak boleh `bg-${color}-500`).
const TONES = {
  blue:    { box: 'bg-[#3b82f6]/15 ring-[#3b82f6]/30', icon: 'text-[#60a5fa]' },
  emerald: { box: 'bg-[#10b981]/15 ring-[#10b981]/30', icon: 'text-[#34d399]' },
  amber:   { box: 'bg-[#f59e0b]/15 ring-[#f59e0b]/30', icon: 'text-[#fbbf24]' },
  violet:  { box: 'bg-[#8b5cf6]/15 ring-[#8b5cf6]/30', icon: 'text-[#a78bfa]' },
  rose:    { box: 'bg-[#f43f5e]/15 ring-[#f43f5e]/30', icon: 'text-[#fb7185]' },
  cyan:    { box: 'bg-[#06b6d4]/15 ring-[#06b6d4]/30', icon: 'text-[#22d3ee]' },
  indigo:  { box: 'bg-[#6366f1]/15 ring-[#6366f1]/30', icon: 'text-[#818cf8]' },
  green:   { box: 'bg-[#22c55e]/15 ring-[#22c55e]/30', icon: 'text-[#4ade80]' },
  sky:     { box: 'bg-[#0ea5e9]/15 ring-[#0ea5e9]/30', icon: 'text-[#38bdf8]' },
} as const;
type Tone = keyof typeof TONES;

function IconBox({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${TONES[tone].box} ${TONES[tone].icon}`}>
      {children}
    </div>
  );
}

function SectionHead({ eyebrow, title, desc }: { eyebrow: string; title: React.ReactNode; desc?: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#38bdf8]">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#f8fafc] sm:text-4xl">{title}</h2>
      {desc && <p className="mt-4 text-base leading-relaxed text-[#94a3b8] sm:text-lg">{desc}</p>}
    </div>
  );
}

const card = 'rounded-2xl border border-[#1c2942] bg-[#0b1324]/80';

/* ------------------------------ Hero mockup ------------------------------ */

const BARS: [number, number][] = [
  [58, 40], [64, 46], [52, 50], [72, 44], [68, 52], [80, 48],
  [62, 56], [76, 42], [70, 54], [88, 46], [74, 50], [92, 44],
];

function DashboardMockup() {
  const { t } = useLang();
  const kpis = [
    { l: t('Total Saldo', 'Total Balance'), v: formatMoney(48_250_000), d: '+12,4%', c: 'text-[#34d399]' },
    { l: t('Pemasukan', 'Income'), v: formatMoney(15_000_000), d: t('bulan ini', 'this month'), c: 'text-[#94a3b8]' },
    { l: t('Pengeluaran', 'Expenses'), v: formatMoney(8_730_000), d: '-5,1%', c: 'text-[#34d399]' },
    { l: t('Tabungan', 'Savings'), v: formatMoney(6_270_000), d: t('42% dari gaji', '42% of income'), c: 'text-[#38bdf8]' },
  ];
  const cats: [string, string, string][] = [
    [t('Makan', 'Food'), '38%', 'bg-[#3b82f6]'], [t('Transport', 'Transport'), '23%', 'bg-[#8b5cf6]'],
    [t('Tagihan', 'Bills'), '17%', 'bg-[#f59e0b]'], [t('Hiburan', 'Fun'), '13%', 'bg-[#10b981]'],
  ];

  return (
    <div className="relative mx-auto mt-16 w-full max-w-5xl sm:mt-20">
      <div className="absolute -inset-x-10 -top-10 bottom-0 -z-10 rounded-[3rem] bg-gradient-to-b from-[#2563eb]/25 via-[#06b6d4]/10 to-transparent blur-3xl" />

      <div className="overflow-hidden rounded-2xl border border-[#243456] bg-[#0a1122] shadow-2xl shadow-[#000000]/60">
        <div className="flex items-center gap-2 border-b border-[#1c2942] bg-[#0d1628] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-[#ef4444]/80" />
          <span className="h-3 w-3 rounded-full bg-[#f59e0b]/80" />
          <span className="h-3 w-3 rounded-full bg-[#22c55e]/80" />
          <span className="ml-3 hidden rounded-md bg-[#0a1122] px-3 py-1 text-xs text-[#64748b] sm:block">financepro.grexion.ai/dashboard</span>
          <span className="ml-auto text-[11px] text-[#64748b]">{t('Contoh tampilan', 'Sample view')}</span>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.l} className="rounded-xl border border-[#1c2942] bg-[#0d1628] p-3 sm:p-4">
                <p className="text-[11px] text-[#64748b] sm:text-xs">{k.l}</p>
                <p className="mt-1 truncate text-sm font-bold text-[#f1f5f9] sm:text-lg">{k.v}</p>
                <p className={`mt-0.5 text-[11px] sm:text-xs ${k.c}`}>{k.d}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            <div className="rounded-xl border border-[#1c2942] bg-[#0d1628] p-4 lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-semibold text-[#e2e8f0]">{t('Arus Kas 12 Bulan', '12-Month Cash Flow')}</p>
                <div className="flex items-center gap-3 text-[11px] text-[#94a3b8]">
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#3b82f6]" />{t('Masuk', 'In')}</span>
                  <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-[#f472b6]" />{t('Keluar', 'Out')}</span>
                </div>
              </div>
              <div className="flex h-40 items-end gap-1.5 sm:gap-2.5">
                {BARS.map(([inc, exp], i) => (
                  <div key={i} className="flex h-full flex-1 items-end gap-[3px]">
                    <div className="lp-bar w-1/2 rounded-t bg-gradient-to-t from-[#1d4ed8] to-[#60a5fa]" style={{ height: `${inc}%`, animationDelay: `${0.4 + i * 0.05}s` }} />
                    <div className="lp-bar w-1/2 rounded-t bg-gradient-to-t from-[#be185d] to-[#f472b6]" style={{ height: `${exp}%`, animationDelay: `${0.45 + i * 0.05}s` }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#1c2942] bg-[#0d1628] p-4 lg:col-span-2">
              <p className="mb-4 text-sm font-semibold text-[#e2e8f0]">{t('Pengeluaran per Kategori', 'Spending by Category')}</p>
              <div className="flex items-center gap-5">
                <div
                  className="relative h-28 w-28 shrink-0 rounded-full"
                  style={{ background: 'conic-gradient(#3b82f6 0 38%, #8b5cf6 38% 61%, #f59e0b 61% 78%, #10b981 78% 91%, #f43f5e 91% 100%)' }}
                >
                  <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-[#0d1628] text-center">
                    <span className="text-[10px] leading-tight text-[#94a3b8]">Total<br /><b className="text-xs text-[#f1f5f9]">{formatMoney(8_730_000)}</b></span>
                  </div>
                </div>
                <ul className="min-w-0 flex-1 space-y-2 text-xs">
                  {cats.map(([n, p, c]) => (
                    <li key={n} className="flex items-center gap-2 text-[#cbd5e1]">
                      <i className={`h-2 w-2 shrink-0 rounded-full ${c}`} />
                      <span className="flex-1 truncate">{n}</span>
                      <b className="text-[#f1f5f9]">{p}</b>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lp-float absolute -left-3 top-24 hidden w-56 rounded-xl border border-[#243456] bg-[#0d1628]/95 p-3.5 shadow-xl shadow-[#000000]/50 backdrop-blur md:block lg:-left-10">
        <div className="mb-2 flex items-center justify-between text-xs">
          <span className="font-semibold text-[#e2e8f0]">{t('Budget Makan', 'Food Budget')}</span>
          <span className="text-[#fbbf24]">72%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1c2942]"><div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#f59e0b] to-[#fbbf24]" /></div>
        <p className="mt-2 text-[11px] text-[#94a3b8]">{t(`Sisa ${formatMoney(560_000)} untuk 9 hari`, `${formatMoney(560_000)} left for 9 days`)}</p>
      </div>
      <div className="lp-float-slow absolute -right-3 bottom-16 hidden w-60 rounded-xl border border-[#243456] bg-[#0d1628]/95 p-3.5 shadow-xl shadow-[#000000]/50 backdrop-blur md:block lg:-right-10">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <Flag className="h-3.5 w-3.5 text-[#fb7185]" />
          <span className="font-semibold text-[#e2e8f0]">{t('Dana Darurat', 'Emergency Fund')}</span>
          <span className="ml-auto text-[#34d399]">64%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1c2942]"><div className="h-full w-[64%] rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399]" /></div>
        <p className="mt-2 text-[11px] text-[#94a3b8]">{t(`${formatMoney(19_200_000)} dari target ${formatMoney(30_000_000)}`, `${formatMoney(19_200_000)} of ${formatMoney(30_000_000)} target`)}</p>
      </div>
    </div>
  );
}

/* --------------------------------- Page ---------------------------------- */

export default function LandingContent() {
  const { t, lang } = useLang();
  const { currency } = useCurrency();

  // Judul tab mengikuti bahasa saat tombol bahasa ditekan (metadata server hanya berlaku saat muat ulang)
  useEffect(() => {
    document.title = lang === 'en'
      ? 'FinancePro — Personal Finance Manager for Indonesia'
      : 'FinancePro — Aplikasi Manajemen Keuangan Pribadi untuk Indonesia';
  }, [lang]);

  const FREE_FEATURES = FREE_FEATURES_I18N.map(([id, en]) => t(id, en));
  const PRO_FEATURES = PRO_FEATURES_I18N.map(([id, en]) => t(id, en));

  const FEATURES: { icon: typeof Wallet; title: string; desc: string; tone: Tone; tag: 'FREE' | 'PRO'; note?: string }[] = [
    { icon: Wallet, title: t('Transaksi', 'Transactions'), desc: t('Catat pemasukan dan pengeluaran dalam hitungan detik, lengkap dengan kategori, rekening, dan catatan.', 'Log income and expenses in seconds, with category, account, and notes.'), tone: 'blue', tag: 'FREE', note: t('Unlimited', 'Unlimited') },
    { icon: BarChart3, title: 'Dashboard', desc: t('KPI, arus kas, dan kategori terbesar tampil sekilas. Cukup buka, langsung paham kondisi keuanganmu.', 'KPIs, cash flow, and top categories at a glance. Just open it and understand your finances.'), tone: 'indigo', tag: 'FREE', note: t('Bulan berjalan', 'Current month') },
    { icon: Landmark, title: t('Rekening & Transfer', 'Accounts & Transfers'), desc: t('Bank, e-wallet, dan tunai dalam satu tempat. Pindahkan dana antar rekening tanpa merusak laporan.', 'Banks, e-wallets, and cash in one place. Move money between accounts without breaking your reports.'), tone: 'sky', tag: 'FREE', note: t('1 rekening · PRO tak terbatas', '1 account · PRO unlimited') },
    { icon: TrendingUp, title: t('Nabung, Investasi & Aset', 'Savings, Investments & Assets'), desc: t('Pantau modal, nilai saat ini, serta untung-rugi tiap instrumen: reksa dana, saham, emas, dan lainnya.', 'Track capital, current value, and profit/loss per instrument: mutual funds, stocks, gold, and more.'), tone: 'emerald', tag: 'PRO' },
    { icon: CreditCard, title: t('Hutang & Piutang', 'Debts & Receivables'), desc: t('Kartu kredit, cicilan, dan pinjaman teman. Lihat sisa pokok dan riwayat pembayaran tanpa lupa.', 'Credit cards, installments, and loans to friends. See remaining balances and payment history.'), tone: 'amber', tag: 'PRO' },
    { icon: PieChart, title: 'Budget', desc: t('Tetapkan batas per kategori tiap bulan, lalu pantau sisa anggaranmu sebelum kebablasan.', 'Set a limit per category each month and watch what is left before you overspend.'), tone: 'violet', tag: 'PRO' },
    { icon: Target, title: 'Goals', desc: t('Dana darurat, liburan, atau DP rumah. Tentukan target dan tenggat, lihat progresnya bertambah.', 'Emergency fund, a trip, or a home down payment. Set a target and deadline, watch progress grow.'), tone: 'rose', tag: 'PRO' },
    { icon: CalendarDays, title: t('Laporan Lengkap', 'Full Reports'), desc: t('Ringkasan harian, mingguan, dan bulanan untuk melihat pola kebiasaan finansialmu dari waktu ke waktu.', 'Daily, weekly, and monthly summaries to see your financial habits over time.'), tone: 'cyan', tag: 'PRO' },
    { icon: Bot, title: 'Telegram Bot', desc: t('Tambah dan lihat transaksi langsung dari chat, tanpa perlu membuka aplikasi.', 'Add and view transactions straight from chat, without opening the app.'), tone: 'green', tag: 'FREE', note: t('Basic · PRO lengkap', 'Basic · PRO full') },
  ];

  const BENEFITS: { icon: typeof Wallet; title: string; desc: string; tone: Tone }[] = [
    { icon: LineChart, title: t('Semua di satu tempat', 'Everything in one place'), desc: t('Tidak lagi berpindah antara catatan HP, spreadsheet, dan m-banking untuk tahu posisi uangmu.', 'No more hopping between phone notes, spreadsheets, and banking apps to know where your money stands.'), tone: 'blue' },
    { icon: Languages, title: t('Dibuat untuk Indonesia', 'Built for Indonesia'), desc: t('Bahasa Indonesia, format Rupiah, dan istilah yang kamu pakai sehari-hari: pemasukan, piutang, cicilan.', 'Indonesian-first with Rupiah formatting and the terms you use daily. Switch to English anytime.'), tone: 'emerald' },
    { icon: Coins, title: t('Lihat dalam mata uang apa pun', 'See it in any currency'), desc: t('Ganti tampilan ke USD, EUR, SGD, dan 20+ mata uang lain dengan kurs yang diperbarui otomatis.', 'Switch the display to USD, EUR, SGD, and 20+ other currencies using automatically refreshed rates.'), tone: 'amber' },
    { icon: Target, title: t('Dari mencatat ke mencapai', 'From tracking to achieving'), desc: t('Bukan sekadar daftar transaksi. Budget dan goals mengubah data jadi keputusan nyata.', 'Not just a list of transactions. Budgets and goals turn data into real decisions.'), tone: 'violet' },
    { icon: Smartphone, title: t('Nyaman di HP dan laptop', 'Great on phone and laptop'), desc: t('Tampilan responsif dengan mode gelap dan terang. Buka dari browser mana saja.', 'Responsive layout with dark and light modes. Open it from any browser.'), tone: 'cyan' },
    { icon: ShieldCheck, title: t('Datamu milikmu', 'Your data is yours'), desc: t('Setiap akun terisolasi. Tidak ada iklan dan tidak ada jual-beli data keuanganmu.', 'Every account is isolated. No ads and no selling of your financial data.'), tone: 'rose' },
  ];

  const STEPS = [
    { n: '01', icon: KeyRound, title: t('Daftar gratis', 'Sign up free'), desc: t('Buat akun dengan username dan password. Selesai dalam kurang dari satu menit, tanpa kartu kredit.', 'Create an account with a username and password. Done in under a minute, no credit card.') },
    { n: '02', icon: NotebookPen, title: t('Catat transaksi pertama', 'Log your first transaction'), desc: t('Masukkan pemasukan dan pengeluaranmu. Kategori dan rekening langsung terbentuk saat dipakai.', 'Enter your income and expenses. Categories and accounts are created as you use them.') },
    { n: '03', icon: LineChart, title: t('Pahami & atur', 'Understand & plan'), desc: t('Lihat dashboard, pasang budget, dan tetapkan goals. Upgrade ke PRO kapan pun kamu butuh fitur penuh.', 'Check the dashboard, set budgets, and define goals. Upgrade to PRO whenever you need the full toolkit.') },
  ];

  const SUBSCRIBE_STEPS = [
    { t: t('Daftar akun gratis', 'Create a free account'), d: t('Mulai dari paket FREE. Tidak ada biaya dan tidak ada batas waktu.', 'Start on the FREE plan. No cost and no time limit.') },
    { t: t('Pilih PRO di menu Upgrade', 'Choose PRO in the Upgrade menu'), d: t('Tentukan paket bulanan atau tahunan, lalu lihat petunjuk pembayaran.', 'Pick monthly or yearly, then see the payment instructions.') },
    { t: t('Transfer & kirim bukti', 'Transfer & send proof'), d: t('Bayar lewat transfer bank, kemudian kirim bukti pembayaran lewat WhatsApp.', 'Pay by bank transfer, then send the payment proof via WhatsApp.') },
    { t: t('Akun PRO aktif', 'PRO is activated'), d: t('Diaktifkan maksimal 1×24 jam. Perpanjang manual kapan saja, tanpa tagihan otomatis.', 'Activated within 24 hours. Renew manually anytime, no automatic billing.') },
  ];

  const FAQ = [
    { q: t('Apakah FinancePro benar-benar gratis?', 'Is FinancePro really free?'), a: t('Ya. Paket FREE gratis tanpa batas waktu dan sudah mencakup pencatatan transaksi tak terbatas, dashboard bulan berjalan, satu rekening, laporan bulanan sederhana, dan Telegram bot dasar. PRO bersifat opsional.', 'Yes. The FREE plan has no time limit and includes unlimited transaction logging, a current-month dashboard, one account, a basic monthly report, and the basic Telegram bot. PRO is optional.') },
    { q: t('Apa bedanya paket FREE dan PRO?', 'What is the difference between FREE and PRO?'), a: t('FREE cocok untuk mulai mencatat. PRO membuka rekening tak terbatas, laporan harian-mingguan-bulanan, tracker nabung & investasi, hutang & piutang, aset, goals, budget, riwayat tanpa batas, serta semua fitur Telegram bot.', 'FREE is great for getting started. PRO unlocks unlimited accounts, daily/weekly/monthly reports, savings & investment tracking, debts & receivables, assets, goals, budgets, unlimited history, and every Telegram bot feature.') },
    { q: t('Bagaimana cara berlangganan PRO?', 'How do I subscribe to PRO?'), a: t('Daftar akun, buka menu Upgrade, lakukan transfer bank, lalu kirim bukti lewat WhatsApp. Admin mengaktifkan akunmu maksimal 1×24 jam. Tidak ada perpanjangan otomatis, jadi kamu yang menentukan kapan memperpanjang.', 'Sign up, open the Upgrade menu, make a bank transfer, then send the proof via WhatsApp. An admin activates your account within 24 hours. There is no auto-renewal, so you decide when to renew.') },
    { q: t('Apa yang terjadi kalau masa PRO saya berakhir?', 'What happens when my PRO period ends?'), a: t('Akunmu kembali ke paket FREE. Datamu tetap tersimpan; fitur PRO terkunci sampai kamu memperpanjang.', 'Your account returns to the FREE plan. Your data stays saved; PRO features are locked until you renew.') },
    { q: t('Bisakah saya melihat angka dalam dolar atau mata uang lain?', 'Can I see amounts in dollars or other currencies?'), a: t('Bisa. Pilih mata uang tampilan di sidebar dashboard (atau di bagian harga ini). Kurs diambil otomatis dari penyedia kurs gratis dan diperbarui berkala. Data tetap tercatat dalam Rupiah, dan konversi hanya untuk tampilan. Datanya harian, bukan kurs bank.', 'Yes. Choose a display currency in the dashboard sidebar (or in the pricing section). Rates are fetched automatically from a free rate provider and refreshed periodically. Your data stays recorded in Rupiah and conversion is display-only. Rates are daily reference rates, not bank rates.') },
    { q: t('Apakah data keuangan saya aman?', 'Is my financial data safe?'), a: t('Data tiap akun dipisahkan dan hanya bisa diakses oleh pemiliknya. Password disimpan dalam bentuk hash, sesi memakai cookie httpOnly, dan percobaan login dibatasi untuk mencegah tebak-tebakan password.', 'Each account is isolated and only its owner can access it. Passwords are stored hashed, sessions use httpOnly cookies, and login attempts are rate-limited to stop password guessing.') },
    { q: t('Bisa dipakai di HP?', 'Does it work on mobile?'), a: t('Bisa. Tampilannya responsif dan nyaman dibuka dari browser HP, lengkap dengan mode gelap dan terang.', 'Yes. The layout is responsive and comfortable in a phone browser, with dark and light modes.') },
  ];

  const billedNote = currency !== 'IDR'
    ? t('Perkiraan dalam mata uang pilihanmu. Pembayaran tetap dalam Rupiah.', 'Approximate, in your chosen currency. Billing stays in Rupiah.')
    : '';

  return (
    <div className="min-h-screen overflow-x-clip bg-[#060b18] text-[#e8eefc] selection:bg-[#3b82f6]/40">
      {/* ------------------------------ Navbar ------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-[#1c2942]/70 bg-[#060b18]/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3.5 sm:px-6" aria-label={t('Navigasi utama', 'Main navigation')}>
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563eb] to-[#06b6d4] shadow-lg shadow-[#2563eb]/30">
              <BarChart3 className="h-5 w-5 text-[#ffffff]" />
            </span>
            <span className="hidden text-lg font-bold tracking-tight text-[#f8fafc] sm:inline">FinancePro</span>
          </Link>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#94a3b8] lg:flex">
            <a href="#apa" className="transition hover:text-[#f8fafc]">{t('Apa itu', 'What is it')}</a>
            <a href="#kenapa" className="transition hover:text-[#f8fafc]">{t('Kenapa', 'Why')}</a>
            <a href="#fitur" className="transition hover:text-[#f8fafc]">{t('Fitur', 'Features')}</a>
            <a href="#harga" className="transition hover:text-[#f8fafc]">{t('Harga', 'Pricing')}</a>
            <a href="#faq" className="transition hover:text-[#f8fafc]">FAQ</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="landing" />
            <AuthCta variant="nav" />
          </div>
        </nav>
      </header>

      <main>
        {/* ------------------------------- Hero ------------------------------- */}
        <section className="relative px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24">
          <div className="lp-grid pointer-events-none absolute inset-0 -z-10" />
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[#2563eb]/20 blur-[120px]" />

          <div className="mx-auto max-w-4xl text-center">
            <div className="lp-rise inline-flex items-center gap-2 rounded-full border border-[#2563eb]/30 bg-[#2563eb]/10 px-4 py-1.5 text-sm text-[#93c5fd]">
              <Sparkles className="h-4 w-4" />
              {t('Aplikasi keuangan pribadi untuk Indonesia', 'Personal finance app built for Indonesia')}
            </div>
            <h1 className="lp-rise mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#f8fafc] sm:text-6xl lg:text-7xl" style={{ animationDelay: '0.08s' }}>
              {t('Tahu ke mana uangmu pergi.', 'Know where your money goes.')}{' '}
              <span className="bg-gradient-to-r from-[#60a5fa] via-[#22d3ee] to-[#34d399] bg-clip-text text-transparent">
                {t('Atur ke mana ia harus pergi.', 'Decide where it should go.')}
              </span>
            </h1>
            <p className="lp-rise mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#94a3b8] sm:text-xl" style={{ animationDelay: '0.16s' }}>
              {t(
                'FinancePro menyatukan transaksi, rekening, utang, investasi, budget, dan target tabunganmu dalam satu dashboard yang rapi. Dalam Bahasa Indonesia dan format Rupiah.',
                'FinancePro brings your transactions, accounts, debts, investments, budgets, and savings goals into one tidy dashboard. In Indonesian or English, in Rupiah or your own currency.',
              )}
            </p>
            <div className="lp-rise mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4" style={{ animationDelay: '0.24s' }}>
              <AuthCta variant="hero" />
            </div>
            <ul className="lp-rise mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[#94a3b8]" style={{ animationDelay: '0.32s' }}>
              {[
                t('Gratis tanpa batas waktu', 'Free, no time limit'),
                t('Tanpa kartu kredit', 'No credit card'),
                t('Siap dipakai dalam 1 menit', 'Ready in 1 minute'),
              ].map((x) => (
                <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-[#34d399]" />{x}</li>
              ))}
            </ul>
          </div>

          <DashboardMockup />
        </section>

        {/* ----------------------------- 1. Apa itu ----------------------------- */}
        <section id="apa" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow={t('1 · Apa itu FinancePro', '1 · What is FinancePro')}
              title={<>{t('Satu tempat untuk', 'One place for')} <span className="text-[#38bdf8]">{t('seluruh keuanganmu', 'all your finances')}</span></>}
              desc={t(
                'FinancePro adalah aplikasi web manajemen keuangan pribadi. Kamu mencatat, FinancePro merangkum: saldo semua rekening, arus kas, sisa utang, nilai investasi, hingga progres target tabungan.',
                'FinancePro is a personal finance web app. You log, FinancePro summarizes: balances across accounts, cash flow, remaining debt, investment value, and progress toward savings goals.',
              )}
            />
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: NotebookPen, tone: 'blue' as Tone, ti: t('Catat', 'Track'), d: t('Setiap pemasukan dan pengeluaran tersimpan rapi dengan kategori, rekening, dan tanggal. Cepat, tanpa ribet.', 'Every income and expense is stored neatly with category, account, and date. Fast and hassle-free.') },
                { icon: LineChart, tone: 'emerald' as Tone, ti: t('Pahami', 'Understand'), d: t('Dashboard dan laporan otomatis menunjukkan ke mana uangmu mengalir dan kategori mana yang paling boros.', 'Dashboards and reports show where your money flows and which categories cost you the most.') },
                { icon: Flag, tone: 'violet' as Tone, ti: t('Capai', 'Achieve'), d: t('Pasang budget dan goals. Pantau progresnya sampai dana darurat, liburan, atau cicilan lunas.', 'Set budgets and goals. Follow your progress until the emergency fund, the trip, or the loan is done.') },
              ].map((p) => (
                <div key={p.ti} className={`${card} p-7 transition hover:-translate-y-1 hover:border-[#2d4270]`}>
                  <IconBox tone={p.tone}><p.icon className="h-5 w-5" /></IconBox>
                  <h3 className="mt-5 text-xl font-bold text-[#f8fafc]">{p.ti}</h3>
                  <p className="mt-2 leading-relaxed text-[#94a3b8]">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ 2. Kenapa ------------------------------ */}
        <section id="kenapa" className="scroll-mt-20 border-y border-[#1c2942]/70 bg-[#080f20] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow={t('2 · Kenapa harus FinancePro', '2 · Why FinancePro')}
              title={<>{t('Gaji selalu habis,', 'Paycheck always gone,')} <span className="text-[#38bdf8]">{t('tapi habis ke mana?', 'but where did it go?')}</span></>}
              desc={t('Kebanyakan orang bukan boros. Mereka hanya tidak punya gambaran yang jelas. Itulah yang diselesaikan FinancePro.', 'Most people are not careless spenders. They just lack a clear picture. That is what FinancePro solves.')}
            />

            <div className="mb-14 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#3b1d2a] bg-[#1a0c14]/60 p-7">
                <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#fb7185]">{t('Tanpa sistem', 'Without a system')}</p>
                <ul className="space-y-4">
                  {[
                    t('Tidak tahu uang habis ke mana di akhir bulan', 'No idea where the money went at month-end'),
                    t('Catatan tersebar di notes, spreadsheet, dan ingatan', 'Records scattered across notes, spreadsheets, and memory'),
                    t('Lupa sisa cicilan dan utang yang masih berjalan', 'Forgotten installments and running debts'),
                    t('Menabung tanpa target dan tenggat yang jelas', 'Saving without a clear target or deadline'),
                  ].map((x) => (
                    <li key={x} className="flex gap-3 text-[#cbd5e1]"><X className="mt-0.5 h-5 w-5 shrink-0 text-[#fb7185]" />{x}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-[#14532d]/70 bg-[#07170f]/60 p-7">
                <p className="mb-5 text-sm font-semibold uppercase tracking-wider text-[#4ade80]">{t('Dengan FinancePro', 'With FinancePro')}</p>
                <ul className="space-y-4">
                  {[
                    t('Tahu persis kategori mana yang paling menguras dompet', 'Know exactly which category drains your wallet most'),
                    t('Semua transaksi, rekening, dan aset di satu dashboard', 'All transactions, accounts, and assets in one dashboard'),
                    t('Sisa utang dan riwayat pembayaran selalu terlihat', 'Remaining debt and payment history always in view'),
                    t('Goals dengan progres nyata yang bisa kamu kejar', 'Goals with real progress you can chase'),
                  ].map((x) => (
                    <li key={x} className="flex gap-3 text-[#e2e8f0]"><Check className="mt-0.5 h-5 w-5 shrink-0 text-[#4ade80]" />{x}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((b) => (
                <div key={b.title} className={`${card} p-6 transition hover:-translate-y-1 hover:border-[#2d4270]`}>
                  <IconBox tone={b.tone}><b.icon className="h-5 w-5" /></IconBox>
                  <h3 className="mt-4 text-lg font-bold text-[#f8fafc]">{b.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#94a3b8]">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------- Fitur ------------------------------- */}
        <section id="fitur" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow={t('Fitur lengkap', 'Full feature set')}
              title={<>{t('Semua yang kamu butuhkan untuk', 'Everything you need to')} <span className="text-[#38bdf8]">{t('mengelola uang', 'manage money')}</span></>}
              desc={t('Mulai dari pencatatan dasar yang gratis, sampai alat perencanaan lengkap di paket PRO.', 'From free basic tracking up to a complete planning toolkit on PRO.')}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className={`${card} group relative p-6 transition hover:-translate-y-1 hover:border-[#2d4270]`}>
                  <div className="flex items-start justify-between">
                    <IconBox tone={f.tone}><f.icon className="h-5 w-5" /></IconBox>
                    {f.tag === 'PRO' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f97316] px-2.5 py-1 text-[11px] font-bold text-[#ffffff]">
                        <Zap className="h-3 w-3" />PRO
                      </span>
                    ) : (
                      <span className="rounded-full border border-[#1f6f4a] bg-[#10b981]/10 px-2.5 py-1 text-[11px] font-bold text-[#34d399]">{t('GRATIS', 'FREE')}</span>
                    )}
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-[#f8fafc]">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#94a3b8]">{f.desc}</p>
                  {f.note && <p className="mt-3 text-xs font-medium text-[#64748b]">{f.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------- Cara kerja ----------------------------- */}
        <section className="border-y border-[#1c2942]/70 bg-[#080f20] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead eyebrow={t('Cara kerja', 'How it works')} title={<>{t('Mulai dalam', 'Get started in')} <span className="text-[#38bdf8]">{t('3 langkah', '3 steps')}</span></>} />
            <div className="relative grid gap-6 md:grid-cols-3">
              <div className="pointer-events-none absolute left-[16%] right-[16%] top-9 hidden h-px bg-gradient-to-r from-transparent via-[#2d4270] to-transparent md:block" />
              {STEPS.map((s) => (
                <div key={s.n} className="relative text-center">
                  <div className="relative mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-[#2d4270] bg-[#0b1324] shadow-lg shadow-[#2563eb]/10">
                    <s.icon className="h-7 w-7 text-[#60a5fa]" />
                    <span className="absolute -right-2 -top-2 rounded-full bg-gradient-to-r from-[#2563eb] to-[#06b6d4] px-2 py-0.5 text-[11px] font-bold text-[#ffffff]">{s.n}</span>
                  </div>
                  <h3 className="mt-5 text-lg font-bold text-[#f8fafc]">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-[#94a3b8]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------- 3. Harga & langganan -------------------------- */}
        <section id="harga" className="relative scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="pointer-events-none absolute left-1/2 top-40 -z-10 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-[#f59e0b]/10 blur-[120px]" />
          <div className="mx-auto max-w-5xl">
            <SectionHead
              eyebrow={t('3 · Harga & langganan', '3 · Pricing & subscription')}
              title={<>{t('Mulai gratis.', 'Start free.')} <span className="text-[#fbbf24]">{t('Upgrade saat siap.', 'Upgrade when ready.')}</span></>}
              desc={t('Tanpa kontrak, tanpa perpanjangan otomatis. Bayar hanya kalau kamu butuh fitur lengkap.', 'No contract, no auto-renewal. Pay only when you need the full toolkit.')}
            />

            <div className="mx-auto mb-10 -mt-6 flex max-w-md flex-col items-center gap-1 text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-[#64748b]">{t('Lihat harga dalam', 'View prices in')}</p>
              <CurrencySwitcher showInfo={false} className="w-full max-w-xs" />
              {billedNote && <p className="text-[11px] text-[#64748b]">{billedNote}</p>}
            </div>

            <div className="grid items-stretch gap-6 md:grid-cols-2">
              {/* FREE */}
              <div className={`${card} flex flex-col p-8`}>
                <h3 className="text-lg font-bold text-[#f8fafc]">Free</h3>
                <p className="mt-1 text-sm text-[#94a3b8]">{t('Untuk mulai mencatat keuangan', 'To start tracking your money')}</p>
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-5xl font-extrabold tracking-tight text-[#f8fafc]">{formatMoney(0)}</span>
                  <span className="text-[#94a3b8]">{t('selamanya', 'forever')}</span>
                </p>
                <ul className="mt-8 flex-1 space-y-3.5">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-[#cbd5e1]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#94a3b8]" />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 inline-flex items-center justify-center rounded-xl border border-[#2a3a5c] bg-[#0d1526] py-3.5 font-semibold text-[#e8eefc] transition hover:border-[#3b82f6]/60 hover:bg-[#13203a]">
                  {t('Daftar Gratis', 'Sign Up Free')}
                </Link>
              </div>

              {/* PRO */}
              <div className="relative flex flex-col rounded-2xl border border-[#f59e0b]/50 bg-gradient-to-b from-[#f59e0b]/10 via-[#0b1324] to-[#0b1324] p-8 shadow-2xl shadow-[#f59e0b]/10">
                <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#f59e0b] to-[#f97316] px-4 py-1.5 text-xs font-bold text-[#ffffff] shadow-lg shadow-[#f59e0b]/30">
                  <Zap className="h-3.5 w-3.5" />{t('PALING POPULER', 'MOST POPULAR')}
                </span>
                <h3 className="text-lg font-bold text-[#f8fafc]">PRO</h3>
                <p className="mt-1 text-sm text-[#94a3b8]">{t('Kontrol penuh atas seluruh keuanganmu', 'Full control over your finances')}</p>

                <p className="mt-6 flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-5xl font-extrabold tracking-tight text-[#f8fafc]">{formatMoney(PRICING.proMonthly)}</span>
                  <span className="text-[#94a3b8]">{t('/ bulan', '/ month')}</span>
                </p>
                {currency !== 'IDR' && <p className="mt-1 text-xs text-[#64748b]">≈ {formatRupiah(PRICING.proMonthly)} {t('(ditagih dalam Rupiah)', '(billed in Rupiah)')}</p>}
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3">
                  <div>
                    <p className="text-sm text-[#e2e8f0]">{t('Paket tahunan', 'Yearly plan')} <b className="text-[#fbbf24]">{formatMoney(PRICING.proYearly)}</b> {t('/ tahun', '/ year')}</p>
                    <p className="text-xs text-[#94a3b8]">{t('Setara', 'About')} {formatMoney(YEARLY_PER_MONTH)} {t('per bulan', 'per month')}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#fbbf24] px-2.5 py-1 text-xs font-extrabold text-[#451a03]">{t('HEMAT', 'SAVE')} {YEARLY_SAVING_PERCENT}%</span>
                </div>

                <ul className="mt-8 flex-1 space-y-3.5">
                  {PRO_FEATURES.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-[#e2e8f0]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#fbbf24]" />{f}</li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f59e0b] to-[#f97316] py-3.5 font-semibold text-[#ffffff] shadow-lg shadow-[#f59e0b]/25 transition hover:brightness-110">
                  {t('Mulai lalu Upgrade ke PRO', 'Start, then Upgrade to PRO')} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className={`${card} mt-14 p-8 sm:p-10`}>
              <h3 className="text-xl font-bold text-[#f8fafc]">{t('Bagaimana cara berlangganan?', 'How do I subscribe?')}</h3>
              <p className="mt-1 text-sm text-[#94a3b8]">{t('Sederhana, jelas, dan tanpa tagihan otomatis.', 'Simple, clear, and no automatic billing.')}</p>
              <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {SUBSCRIBE_STEPS.map((s, i) => (
                  <li key={s.t} className="relative">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-sm font-bold text-[#ffffff]">{i + 1}</span>
                    <p className="mt-3 font-semibold text-[#f8fafc]">{s.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-[#94a3b8]">{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ------------------------------ Keamanan ------------------------------ */}
        <section className="border-y border-[#1c2942]/70 bg-[#080f20] px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow={t('Keamanan & privasi', 'Security & privacy')}
              title={<>{t('Datamu', 'Your data is')} <span className="text-[#38bdf8]">{t('hanya milikmu', 'yours alone')}</span></>}
              desc={t('Data keuangan itu sensitif. Karena itu keamanan dirancang sejak awal, bukan tambahan belakangan.', 'Financial data is sensitive. That is why security is designed in from the start, not bolted on later.')}
            />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Database, tone: 'blue' as Tone, ti: t('Terisolasi per akun', 'Isolated per account'), d: t('Setiap data terikat ke akunmu. Pengguna lain tidak bisa melihat atau mengubahnya.', 'Every record is tied to your account. Other users cannot see or change it.') },
                { icon: Lock, tone: 'emerald' as Tone, ti: t('Password ter-hash', 'Hashed passwords'), d: t('Password disimpan dengan hashing bcrypt, tidak pernah dalam bentuk teks asli.', 'Passwords are stored with bcrypt hashing, never as plain text.') },
                { icon: KeyRound, tone: 'amber' as Tone, ti: t('Sesi aman', 'Secure sessions'), d: t('Login memakai cookie httpOnly sehingga token tidak bisa dibaca skrip di halaman.', 'Login uses httpOnly cookies so the token cannot be read by scripts on the page.') },
                { icon: ShieldCheck, tone: 'violet' as Tone, ti: t('Anti tebak password', 'Brute-force protection'), d: t('Percobaan login dibatasi otomatis untuk menghentikan serangan brute-force.', 'Login attempts are rate-limited automatically to stop brute-force attacks.') },
              ].map((s) => (
                <div key={s.ti} className={`${card} p-6`}>
                  <IconBox tone={s.tone}><s.icon className="h-5 w-5" /></IconBox>
                  <h3 className="mt-4 font-bold text-[#f8fafc]">{s.ti}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#94a3b8]">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------- FAQ -------------------------------- */}
        <section id="faq" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
          <div className="mx-auto max-w-3xl">
            <SectionHead eyebrow="FAQ" title={<>{t('Pertanyaan yang', 'Frequently')} <span className="text-[#38bdf8]">{t('sering ditanyakan', 'asked questions')}</span></>} />
            <div className="space-y-3">
              {FAQ.map((f) => (
                <details key={f.q} className={`${card} group px-6 py-5 open:border-[#2d4270]`}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-[#f8fafc] [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Plus className="h-5 w-5 shrink-0 text-[#60a5fa] transition-transform group-open:rotate-45" />
                  </summary>
                  <p className="mt-3 leading-relaxed text-[#94a3b8]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------ CTA akhir ------------------------------ */}
        <section className="px-4 pb-20 sm:px-6 sm:pb-28">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#2d4270] bg-gradient-to-br from-[#10234d] via-[#0b1730] to-[#0a1f2e] px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#06b6d4]/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#2563eb]/25 blur-3xl" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-[#f8fafc] sm:text-5xl">
                {t('Mulai ambil kendali keuanganmu hari ini', 'Take control of your money today')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-[#b6c4e0]">
                {t('Gratis untuk memulai. Satu menit untuk daftar. Setiap rupiah yang kamu catat membuat keputusan besok lebih baik.', 'Free to start. One minute to sign up. Every transaction you log makes tomorrow’s decisions better.')}
              </p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
                <AuthCta variant="final" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ------------------------------- Footer ------------------------------- */}
      <footer className="border-t border-[#1c2942]/70 px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563eb] to-[#06b6d4]">
              <BarChart3 className="h-4 w-4 text-[#ffffff]" />
            </span>
            <span className="font-bold text-[#f8fafc]">FinancePro</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-sm text-[#94a3b8]" aria-label="Footer">
            <a href="#fitur" className="transition hover:text-[#f8fafc]">{t('Fitur', 'Features')}</a>
            <a href="#harga" className="transition hover:text-[#f8fafc]">{t('Harga', 'Pricing')}</a>
            <a href="#faq" className="transition hover:text-[#f8fafc]">FAQ</a>
            <Link href="/login" className="transition hover:text-[#f8fafc]">{t('Masuk', 'Log in')}</Link>
            <Link href="/register" className="transition hover:text-[#f8fafc]">{t('Daftar', 'Sign up')}</Link>
            <a href="mailto:hello@grexion.ai" className="inline-flex items-center gap-1.5 transition hover:text-[#f8fafc]"><MessageCircle className="h-4 w-4" />{t('Kontak', 'Contact')}</a>
          </nav>
          <p className="text-sm text-[#64748b]">&copy; {new Date().getFullYear()} FinancePro. {t('Dibuat di Indonesia.', 'Made in Indonesia.')}</p>
        </div>
      </footer>
    </div>
  );
}
