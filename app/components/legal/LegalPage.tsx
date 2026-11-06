import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft, BarChart3 } from 'lucide-react';

export type LegalSection = { h: [string, string]; p: [string, string][] };

export function isEnglish(): boolean {
  return cookies().get('fp-lang')?.value === 'en';
}

// Tata letak halaman legal (server component, publik). Isi teks diberikan oleh halaman pemanggil.
export default function LegalPage({
  title,
  updated,
  sections,
}: {
  title: [string, string];
  updated: string;
  sections: LegalSection[];
}) {
  const en = isEnglish();
  const t = (pair: [string, string]) => (en ? pair[1] : pair[0]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="rounded-lg bg-blue-600 p-1.5"><BarChart3 className="h-4 w-4 text-white" /></span>
            <span className="font-bold text-white">FinancePro</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
            {en ? 'Back to home' : 'Kembali ke beranda'}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-white">{t(title)}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {en ? 'Last updated' : 'Terakhir diperbarui'}: {updated}
        </p>
        <p className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          {en
            ? 'This document is a draft and is pending legal review. It is not legal advice.'
            : 'Dokumen ini masih berupa draf dan menunggu tinjauan hukum. Ini bukan nasihat hukum.'}
        </p>

        <div className="mt-8 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-white">{i + 1}. {t(s.h)}</h2>
              <div className="mt-2 space-y-3 text-sm leading-relaxed">
                {s.p.map((para, j) => <p key={j}>{t(para)}</p>)}
              </div>
            </section>
          ))}
        </div>

        <nav className="mt-12 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-800 pt-6 text-sm text-slate-400" aria-label="Legal">
          <Link href="/terms" className="hover:text-white">{en ? 'Terms of Service' : 'Syarat & Ketentuan'}</Link>
          <Link href="/privacy" className="hover:text-white">{en ? 'Privacy Policy' : 'Kebijakan Privasi'}</Link>
          <a href="mailto:hello@grexion.ai" className="hover:text-white">hello@grexion.ai</a>
        </nav>
      </main>
    </div>
  );
}
