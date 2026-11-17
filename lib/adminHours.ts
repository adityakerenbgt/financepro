// Jam kerja admin untuk konfirmasi pembayaran (WIB, UTC+7, tanpa DST). Hanya informasi untuk user; tidak menahan apa pun.
export const ADMIN_HOURS = { startHour: 8, endHour: 21 } as const; // 08:00–21:00 WIB, setiap hari
export const ADMIN_HOURS_LABEL = '08.00–21.00 WIB';

export function isAdminHours(now: Date = new Date()): boolean {
  const wibHour = new Date(now.getTime() + 7 * 3600_000).getUTCHours();
  return wibHour >= ADMIN_HOURS.startHour && wibHour < ADMIN_HOURS.endHour;
}
