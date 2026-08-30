import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api, formatApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, ScanLine } from 'lucide-react';

const LOGO_IMG = '/assets/logo-ekertalangu.png';

export default function Checkin() {
    const { code } = useParams();
    const { user } = useAuth();
    const nav = useNavigate();
    const [status, setStatus] = useState('processing'); // processing | success | error
    const [message, setMessage] = useState('Memproses QR…');
    const submittedRef = useRef(false);

    const runCheckin = async () => {
        if (submittedRef.current) return;
        submittedRef.current = true;
        setStatus('processing');
        setMessage('Memproses QR…');
        let lat = null, lng = null;
        try {
            const pos = await new Promise((res, rej) =>
                navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true })
            );
            lat = pos.coords.latitude; lng = pos.coords.longitude;
        } catch { /* GPS opsional */ }
        try {
            const { data } = await api.post('/attendance/self-v2', {
                activity_qr: `EKTL:A:${code}`,
                lat,
                lng,
            });
            setStatus('success');
            setMessage(`Absen tercatat · ${data.activity_name || 'Kegiatan'}`);
        } catch (e) {
            setStatus('error');
            setMessage(formatApiError(e));
            submittedRef.current = false; // izinkan coba lagi
        }
    };

    useEffect(() => {
        if (!code) {
            setStatus('error');
            setMessage('QR tidak valid.');
            return;
        }
        if (user === null) return; // masih memeriksa sesi
        if (user === false) {
            // belum login → arahkan ke login, kembali ke halaman ini setelah login
            nav(`/login?next=${encodeURIComponent(`/a/${code}`)}`, { replace: true });
            return;
        }
        runCheckin();
        // eslint-disable-next-line
    }, [user, code]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100 dark:from-background dark:via-background dark:to-muted">
            <div className="w-full max-w-md text-center">
                <img src={LOGO_IMG} alt="E-Kertalangu" className="w-32 mx-auto object-contain" />
                <div className="mt-8 rounded-3xl bg-card border border-border/60 shadow-xl p-8">
                    {status === 'processing' && (
                        <>
                            <Loader2 className="h-12 w-12 mx-auto text-accent animate-spin" />
                            <p className="mt-4 font-medium">{message}</p>
                            <p className="text-sm text-muted-foreground mt-1">Mohon tunggu sebentar…</p>
                        </>
                    )}
                    {status === 'success' && (
                        <>
                            <CheckCircle2 className="h-14 w-14 mx-auto text-success" />
                            <h1 className="mt-4 font-display font-bold text-xl">Absen Berhasil</h1>
                            <p className="text-sm text-muted-foreground mt-1">{message}</p>
                            <Button onClick={() => nav('/app/dashboard')} className="mt-6 w-full h-12 rounded-xl">Ke Dashboard</Button>
                        </>
                    )}
                    {status === 'error' && (
                        <>
                            <XCircle className="h-14 w-14 mx-auto text-destructive" />
                            <h1 className="mt-4 font-display font-bold text-xl">Tidak Dapat Absen</h1>
                            <p className="text-sm text-muted-foreground mt-1">{message}</p>
                            <div className="mt-6 space-y-2">
                                <Button onClick={runCheckin} className="w-full h-12 rounded-xl gap-2">
                                    <ScanLine className="h-4 w-4" /> Coba Lagi
                                </Button>
                                <Link to="/app/dashboard" className="block text-sm text-muted-foreground hover:text-foreground">Ke Dashboard</Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
