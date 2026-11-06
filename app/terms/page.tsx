import type { Metadata } from 'next';
import LegalPage, { isEnglish, type LegalSection } from '../components/legal/LegalPage';

export function generateMetadata(): Metadata {
  return { title: isEnglish() ? 'Terms of Service — FinancePro' : 'Syarat & Ketentuan — FinancePro' };
}

const sections: LegalSection[] = [
  {
    h: ['Tentang layanan', 'About the service'],
    p: [
      ['FinancePro adalah aplikasi web untuk mencatat dan memantau keuangan pribadi: transaksi, rekening, utang dan piutang, investasi, aset, budget, dan target tabungan. Dengan mendaftar atau memakai FinancePro, kamu menyetujui syarat ini.', 'FinancePro is a web application for recording and monitoring personal finances: transactions, accounts, debts and receivables, investments, assets, budgets and savings goals. By signing up for or using FinancePro you agree to these terms.'],
      ['FinancePro adalah alat pencatatan. Kami bukan bank, bukan penasihat keuangan, dan tidak menyimpan atau memindahkan uang kamu. Angka, laporan, dan tips di aplikasi bersifat informasi umum, bukan nasihat investasi atau keuangan.', 'FinancePro is a record-keeping tool. We are not a bank or a financial advisor, and we do not hold or move your money. Figures, reports and tips in the app are general information, not investment or financial advice.'],
    ],
  },
  {
    h: ['Akun', 'Your account'],
    p: [
      ['Kamu bertanggung jawab menjaga kerahasiaan username dan password serta seluruh aktivitas di akunmu. Gunakan informasi yang benar dan jangan membagikan akun kepada orang lain. Hubungi kami segera bila kamu menduga akunmu disalahgunakan.', 'You are responsible for keeping your username and password confidential and for all activity under your account. Provide accurate information and do not share your account. Contact us promptly if you suspect misuse.'],
    ],
  },
  {
    h: ['Paket FREE dan PRO', 'FREE and PRO plans'],
    p: [
      ['Paket FREE tersedia tanpa biaya dengan batasan fitur, misalnya jumlah rekening. Paket PRO membuka fitur tambahan dan dikenai biaya berlangganan sesuai harga yang tampil di halaman harga saat kamu berlangganan.', 'The FREE plan is available at no cost with feature limits, such as the number of accounts. The PRO plan unlocks additional features and is charged at the price shown on the pricing page when you subscribe.'],
      ['Masa aktif PRO berakhir pada tanggal kedaluwarsa paket. Setelah itu akunmu kembali ke paket FREE; datamu tidak dihapus, tetapi fitur PRO tidak dapat diakses sampai kamu memperpanjang. Pembayaran saat ini diproses secara manual dan dikonfirmasi oleh admin.', 'PRO access ends on the plan expiry date. After that your account returns to the FREE plan; your data is not deleted, but PRO features are unavailable until you renew. Payments are currently processed manually and confirmed by an admin.'],
      ['Kami dapat mengubah harga dan fitur paket. Perubahan harga tidak berlaku surut untuk periode yang sudah kamu bayar.', 'We may change plan prices and features. Price changes do not apply retroactively to a period you have already paid for.'],
    ],
  },
  {
    h: ['Penggunaan yang dilarang', 'Acceptable use'],
    p: [
      ['Kamu tidak boleh: mengakses data pengguna lain, mencoba menembus atau mengganggu keamanan layanan, melakukan percobaan login massal, memakai layanan untuk kegiatan melanggar hukum, atau menyalahgunakan layanan sehingga mengganggu pengguna lain.', 'You must not: access other users’ data, attempt to breach or disrupt the security of the service, perform bulk login attempts, use the service for unlawful activity, or abuse the service in a way that affects other users.'],
      ['Kami dapat membatasi atau menangguhkan akun yang melanggar ketentuan ini.', 'We may restrict or suspend accounts that violate these terms.'],
    ],
  },
  {
    h: ['Data kamu', 'Your data'],
    p: [
      ['Data keuangan yang kamu masukkan tetap milikmu. Kamu memberi kami izin terbatas untuk menyimpan dan memprosesnya semata-mata untuk menjalankan layanan. Cara kami memperlakukan data pribadimu dijelaskan di Kebijakan Privasi.', 'The financial data you enter remains yours. You grant us a limited permission to store and process it solely to operate the service. How we handle your personal data is described in the Privacy Policy.'],
      ['Mata uang lain yang tampil di aplikasi hanya konversi tampilan memakai kurs referensi harian dari penyedia pihak ketiga; angka tersebut bukan kurs bank dan data tetap tersimpan dalam Rupiah.', 'Other currencies shown in the app are display conversions using daily reference rates from third-party providers; they are not bank rates and your data stays stored in Rupiah.'],
    ],
  },
  {
    h: ['Ketersediaan dan batasan tanggung jawab', 'Availability and limitation of liability'],
    p: [
      ['Kami berupaya menjaga layanan tetap berjalan dan akurat, tetapi layanan disediakan “apa adanya” tanpa jaminan bebas gangguan atau bebas kesalahan. Kamu bertanggung jawab memeriksa ketepatan data yang kamu catat.', 'We work to keep the service available and accurate, but it is provided “as is” without a guarantee that it will be uninterrupted or error-free. You are responsible for checking the accuracy of the data you record.'],
      ['Sejauh diizinkan hukum, FinancePro tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, atau keputusan keuangan yang kamu ambil berdasarkan informasi di aplikasi.', 'To the extent permitted by law, FinancePro is not liable for indirect losses, lost profits, or financial decisions you make based on information in the app.'],
    ],
  },
  {
    h: ['Penghentian', 'Termination'],
    p: [
      ['Kamu dapat berhenti memakai layanan kapan saja dan meminta penghapusan akun lewat kontak di bawah. Kami dapat menghentikan layanan atau akun bila ada pelanggaran ketentuan atau alasan keamanan.', 'You may stop using the service at any time and request account deletion via the contact below. We may terminate the service or an account for a violation of these terms or for security reasons.'],
    ],
  },
  {
    h: ['Perubahan, hukum yang berlaku, dan kontak', 'Changes, governing law and contact'],
    p: [
      ['Kami dapat memperbarui syarat ini; perubahan penting akan diinformasikan di aplikasi atau lewat email bila tersedia. Dengan terus memakai layanan setelah perubahan berlaku, kamu dianggap menyetujuinya. Syarat ini tunduk pada hukum Republik Indonesia.', 'We may update these terms; material changes will be announced in the app or by email where available. Continued use after a change takes effect means you accept it. These terms are governed by the laws of the Republic of Indonesia.'],
      ['Pertanyaan: hello@grexion.ai.', 'Questions: hello@grexion.ai.'],
    ],
  },
];

export default function TermsPage() {
  return <LegalPage title={['Syarat & Ketentuan', 'Terms of Service']} updated="24 Oktober 2026" sections={sections} />;
}
