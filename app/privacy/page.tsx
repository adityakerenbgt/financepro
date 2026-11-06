import type { Metadata } from 'next';
import LegalPage, { isEnglish, type LegalSection } from '../components/legal/LegalPage';

export function generateMetadata(): Metadata {
  return { title: isEnglish() ? 'Privacy Policy — FinancePro' : 'Kebijakan Privasi — FinancePro' };
}

const sections: LegalSection[] = [
  {
    h: ['Data yang kami kumpulkan', 'Data we collect'],
    p: [
      ['Data akun: username, nama tampilan, email (opsional), dan password yang disimpan dalam bentuk hash (kami tidak menyimpan password aslimu). Kami juga mencatat waktu pembuatan akun, waktu login terakhir, paket, dan waktu persetujuan syarat.', 'Account data: username, display name, email (optional), and a hashed password (we do not store your actual password). We also record account creation time, last login time, plan, and the time you accepted our terms.'],
      ['Data keuangan yang kamu masukkan sendiri: transaksi, rekening, kategori, utang dan piutang, investasi, aset, budget, goals, serta pengaturan profil.', 'Financial data you enter yourself: transactions, accounts, categories, debts and receivables, investments, assets, budgets, goals and profile settings.'],
      ['Data teknis: alamat IP dipakai sementara untuk pembatasan percobaan login dan pendaftaran (rate limiting). Cookie sesi dipakai agar kamu tetap masuk, dan cookie preferensi menyimpan bahasa dan mata uang tampilan.', 'Technical data: your IP address is used temporarily to limit login and registration attempts (rate limiting). A session cookie keeps you signed in, and preference cookies store your display language and currency.'],
    ],
  },
  {
    h: ['Tujuan penggunaan', 'How we use data'],
    p: [
      ['Kami memakai data untuk menjalankan layanan (menampilkan dashboard dan laporan), mengamankan akun, mengelola paket dan pembayaran, serta memperbaiki layanan. Kami tidak menjual data pribadimu dan tidak memakainya untuk iklan pihak ketiga.', 'We use data to operate the service (showing dashboards and reports), secure accounts, manage plans and payments, and improve the service. We do not sell your personal data and do not use it for third-party advertising.'],
    ],
  },
  {
    h: ['Penyimpanan dan penyedia layanan', 'Storage and service providers'],
    p: [
      ['Data disimpan di basis data PostgreSQL yang dikelola Supabase. Aplikasi dijalankan pada infrastruktur hosting, dan pembatasan laju (rate limiting) dapat memakai layanan Upstash. Penyedia ini memproses data sebatas yang diperlukan untuk menjalankan layanan.', 'Data is stored in a PostgreSQL database managed by Supabase. The app runs on hosting infrastructure, and rate limiting may use the Upstash service. These providers process data only as needed to run the service.'],
      ['Untuk konversi mata uang, browser atau server kami mengambil kurs dari penyedia kurs publik. Permintaan itu tidak berisi data pribadi atau data keuanganmu.', 'For currency conversion, your browser or our server fetches rates from public rate providers. Those requests do not contain your personal or financial data.'],
      ['Bila kamu menghubungkan bot Telegram, pesan yang kamu kirim ke bot diproses melalui Telegram sesuai kebijakan Telegram.', 'If you connect the Telegram bot, messages you send to the bot are processed through Telegram under Telegram’s own policies.'],
    ],
  },
  {
    h: ['Keamanan', 'Security'],
    p: [
      ['Password disimpan sebagai hash, sesi memakai cookie httpOnly, dan data setiap pengguna dipisahkan. Tidak ada sistem yang sepenuhnya aman; gunakan password yang kuat dan unik, dan beri tahu kami bila kamu menduga ada penyalahgunaan.', 'Passwords are stored as hashes, sessions use httpOnly cookies, and each user’s data is kept separate. No system is completely secure; use a strong, unique password and tell us if you suspect misuse.'],
    ],
  },
  {
    h: ['Penyimpanan dan penghapusan data', 'Retention and deletion'],
    p: [
      ['Data disimpan selama akunmu aktif. Kamu dapat meminta penghapusan akun beserta datanya lewat kontak di bawah; kami akan memprosesnya dalam waktu yang wajar, kecuali ada kewajiban hukum untuk menyimpan data tertentu.', 'Data is kept while your account is active. You can request deletion of your account and its data via the contact below; we will process it within a reasonable time unless the law requires us to retain certain data.'],
    ],
  },
  {
    h: ['Hak kamu', 'Your rights'],
    p: [
      ['Sesuai Undang-Undang No. 27 Tahun 2022 tentang Pelindungan Data Pribadi, kamu berhak mengakses, memperbaiki, dan meminta penghapusan data pribadimu, menarik persetujuan, serta mengajukan keberatan atas pemrosesan tertentu. Ajukan permintaan lewat kontak di bawah.', 'Under Indonesia’s Personal Data Protection Law (Law No. 27 of 2022), you have the right to access, correct and request deletion of your personal data, withdraw consent, and object to certain processing. Make a request via the contact below.'],
    ],
  },
  {
    h: ['Anak-anak', 'Children'],
    p: [
      ['FinancePro tidak ditujukan untuk anak di bawah 17 tahun tanpa pendampingan orang tua atau wali.', 'FinancePro is not intended for children under 17 without the involvement of a parent or guardian.'],
    ],
  },
  {
    h: ['Perubahan dan kontak', 'Changes and contact'],
    p: [
      ['Kebijakan ini dapat diperbarui; versi terbaru selalu ada di halaman ini beserta tanggal pembaruannya. Pertanyaan atau permintaan terkait data pribadi: hello@grexion.ai.', 'This policy may be updated; the latest version is always on this page with its update date. Questions or personal-data requests: hello@grexion.ai.'],
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage title={['Kebijakan Privasi', 'Privacy Policy']} updated="24 Oktober 2026" sections={sections} />;
}
