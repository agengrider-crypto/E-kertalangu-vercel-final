import { useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';
import { BACKUP } from '@/constants/testIds/app';
import { toast } from 'sonner';

export default function Backup() {
    const [busy, setBusy] = useState(false);

    const download = async () => {
        setBusy(true);
        try {
            const res = await fetch(`${API_BASE}/backup/xlsx`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('ektl_token') || ''}` },
            });
            if (!res.ok) throw new Error('Gagal');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const today = new Date();
            const dd = String(today.getDate()).padStart(2, '0');
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const yyyy = today.getFullYear();
            const a = document.createElement('a');
            a.href = url;
            a.download = `e kertalangu ${dd}-${mm}-${yyyy}.xlsx`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Backup diunduh');
        } catch (e) { toast.error('Gagal mengunduh backup'); } finally { setBusy(false); }
    };

    return (
        <div className="animate-fade-in-up space-y-8">
            <div>
                <p className="tick-label text-muted-foreground">Keamanan Data</p>
                <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Backup & Ekspor</h1>
                <p className="text-muted-foreground mt-2">Unduh seluruh data (peserta, kegiatan, absensi, musyawarah) sebagai file .xlsx.</p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-8 max-w-2xl">
                <div className="flex items-start gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground grid place-items-center">
                        <FileSpreadsheet className="h-7 w-7" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-display font-bold text-2xl">Backup Penuh (.xlsx)</h2>
                        <p className="text-sm text-muted-foreground mt-1">Format nama file: <span className="font-mono">e kertalangu [DD-MM-YYYY].xlsx</span></p>
                        <ul className="text-sm mt-4 space-y-1 list-disc list-inside text-muted-foreground">
                            <li>Sheet <span className="text-foreground">Peserta</span> — data jamaah lengkap</li>
                            <li>Sheet <span className="text-foreground">Kegiatan</span> — semua jadwal</li>
                            <li>Sheet <span className="text-foreground">Absensi</span> — riwayat kehadiran</li>
                            <li>Sheet <span className="text-foreground">Musyawarah</span> — catatan 4S & Tim 7</li>
                        </ul>
                        <Button data-testid={BACKUP.downloadBtn} disabled={busy} onClick={download} className="mt-6 rounded-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Download className="h-4 w-4 mr-2" /> {busy ? 'Menyiapkan…' : 'Unduh Backup Sekarang'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-dashed border-border bg-card p-6 max-w-2xl text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Catatan</p>
                <p>Integrasi Google Sheets / Drive dapat diaktifkan lanjut dengan menyediakan Service Account. Untuk saat ini, backup dilakukan on-demand via file .xlsx.</p>
            </div>
        </div>
    );
}
