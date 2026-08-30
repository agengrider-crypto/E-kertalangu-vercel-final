import { useState } from 'react';
import QRScanner from '@/components/QRScanner';
import { Button } from '@/components/ui/button';
import { ScanLine } from 'lucide-react';

export default function ScanPage() {
    const [open, setOpen] = useState(true);
    return (
        <div className="animate-fade-in-up space-y-6">
            <div>
                <p className="tick-label text-muted-foreground">Absen Mandiri</p>
                <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Scan QR Kegiatan</h1>
                <p className="text-muted-foreground mt-2">Arahkan kamera ke QR yang dipajang oleh pengurus di lokasi kegiatan. Hanya berlaku di tanggal kegiatan.</p>
            </div>
            <div className="rounded-3xl border border-border bg-card p-8 text-center">
                <ScanLine className="h-12 w-12 mx-auto text-accent" />
                <p className="mt-4 text-sm text-muted-foreground">Klik tombol di bawah untuk membuka scanner.</p>
                <Button onClick={() => setOpen(true)} className="mt-4 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <ScanLine className="h-4 w-4 mr-2" /> Buka Scanner
                </Button>
            </div>
            {open && <QRScanner open={open} onClose={() => setOpen(false)} selfMode onScanned={() => setOpen(false)} />}
        </div>
    );
}
