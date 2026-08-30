import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Timer } from 'lucide-react';

export default function RotatingQrDisplay({ activityId }) {
    const [qr, setQr] = useState(null);
    const [remain, setRemain] = useState(0);

    const fetch = async () => {
        try {
            const { data } = await api.get(`/activities/${activityId}/qr-current`);
            setQr(data);
            setRemain(data.expires_in);
        } catch {}
    };

    useEffect(() => {
        fetch();
        const t = setInterval(fetch, 5000);
        return () => clearInterval(t);
        // eslint-disable-next-line
    }, [activityId]);

    useEffect(() => {
        const t = setInterval(() => setRemain((r) => Math.max(0, r - 1)), 1000);
        return () => clearInterval(t);
    }, [qr]);

    if (!qr) return <div className="text-muted-foreground text-sm">Memuat QR…</div>;

    return (
        <div className="text-center">
            <p className="tick-label text-muted-foreground">QR Rotating (self check-in)</p>
            <div className="mt-3 mx-auto w-64 h-64 bg-white rounded-2xl grid place-items-center p-3 shadow-sm">
                <img src={qr.datauri} alt="QR" className="w-full h-full object-contain" />
            </div>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-3 py-1 text-xs font-mono">
                <Timer className="h-3 w-3" /> Berganti dalam {remain}s
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-2">Peserta scan QR ini via menu Absen Mandiri</p>
        </div>
    );
}
