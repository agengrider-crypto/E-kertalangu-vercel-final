// Persiapan integrasi Google Drive (BELUM terhubung OAuth/Drive API).
// Modul ini hanya menyiapkan struktur folder, penamaan file, alur & validasi.

const BULAN_ID = [
    '01 Januari', '02 Februari', '03 Maret', '04 April', '05 Mei', '06 Juni',
    '07 Juli', '08 Agustus', '09 September', '10 Oktober', '11 November', '12 Desember',
];

// Menghasilkan path folder tujuan: E-Kertalangu/Laporan/<Tahun>/<Bulan>
export function buildDriveFolderPath(date = new Date()) {
    const tahun = String(date.getFullYear());
    const bulan = BULAN_ID[date.getMonth()];
    return ['E-Kertalangu', 'Laporan', tahun, bulan];
}

// Nama file laporan sesuai konvensi
export function buildReportFileName(kind, ext, date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    if (kind === 'bulanan') {
        return `Rekap_Bulanan_${BULAN_ID[date.getMonth()].split(' ')[1]}_${y}.${ext}`;
    }
    return `Laporan_Absensi_${y}-${m}-${d}.${ext}`;
}

// Status konfigurasi Google Drive (nanti dibaca dari backend/env). Saat ini selalu false.
export function isGoogleDriveConfigured() {
    return false;
}

// Alur simpan ke Google Drive. Sebelum terhubung, kembalikan status not_configured
// tanpa menyebabkan error / mengganggu export lain.
export async function saveToGoogleDrive({ fileName, folderPath }) {
    if (!isGoogleDriveConfigured()) {
        return {
            ok: false,
            reason: 'not_configured',
            message: 'Google Drive belum dikonfigurasi oleh Administrator.',
            plan: { folderPath, fileName },
        };
    }
    // TODO: implementasi upload saat OAuth + Drive API sudah tersedia.
    return { ok: false, reason: 'not_implemented', message: 'Integrasi belum diaktifkan.' };
}
