import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles, Download, Copy, Check, MessageCircle } from 'lucide-react';
import { API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ShareRecap() {
    const { token } = useParams();
    const [data, setData] = useState(null);
    const [err, setErr] = useState('');
    const [copied, setCopied] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        fetch(`${API_BASE}/share/attendance/${token}`)
            .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
            .then(({ ok, body }) => {
                if (ok) setData(body);
                else setErr(body.detail || 'Link tidak valid');
            })
            .catch(() => setErr('Gagal memuat'));
    }, [token]);

    const shareUrl = window.location.href;

    const copyLink = async () => {
        try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); toast.success('Link disalin'); }
        catch { toast.error('Gagal menyalin'); }
    };

    const shareToWA = () => {
        const label = data?.kind === 'activity'
            ? `*${data.activity_name}* (${data.activity_date})`
            : `${data?.kind === 'monthly' ? 'Bulanan' : data?.kind === 'weekly' ? 'Mingguan' : 'Harian'} — ${data?.date}`;
        const t = `📋 *Laporan Kegiatan Rutin*\n${label}\n\nHadir: ${data?.counts?.hadir || 0} · Izin: ${data?.counts?.izin || 0} · Alpha: ${data?.counts?.alpha || 0}\n\nLihat laporan lengkap (tanpa login):\n${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank');
    };

    const download = async () => {
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2 });
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = `rekap-kehadiran-${data?.date || 'ektl'}.png`;
            link.click();
        } catch (e) {
            toast.error('Gagal menyimpan gambar. Screenshot manual saja.');
        }
    };

    if (err) return (
        <div className="min-h-screen grid place-items-center bg-background p-6 text-center">
            <div>
                <p className="tick-label text-muted-foreground">ERROR</p>
                <h1 className="mt-2 font-display font-black text-3xl">{err}</h1>
                <p className="text-muted-foreground mt-2 text-sm">Link mungkin kadaluarsa. Minta link baru dari admin.</p>
                <Link to="/login"><Button className="rounded-full mt-4">Ke Login</Button></Link>
            </div>
        </div>
    );
    if (!data) return <div className="min-h-screen grid place-items-center text-muted-foreground">Memuat…</div>;

    const total = (data.counts?.hadir || 0) + (data.counts?.izin || 0) + (data.counts?.alpha || 0);
    const rate = total ? Math.round(((data.counts?.hadir || 0) / total) * 100) : 0;

    return (
        <div className="min-h-screen bg-background text-foreground py-8 print:py-0">
            <div className="max-w-3xl mx-auto p-4">
                <div className="flex items-center justify-between mb-6 print:hidden">
                    <Link to="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                        <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center">
                            <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                        E-Kertalangu
                    </Link>
                    <div className="flex gap-2">
                        <Button onClick={copyLink} variant="outline" size="sm" className="rounded-full">
                            {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />} Salin Link
                        </Button>
                        <Button onClick={download} variant="outline" size="sm" className="rounded-full">
                            <Download className="h-3.5 w-3.5 mr-1" /> PNG
                        </Button>
                        <Button onClick={shareToWA} size="sm" className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground">
                            <MessageCircle className="h-3.5 w-3.5 mr-1" /> WA
                        </Button>
                    </div>
                </div>

                <div ref={cardRef} className="rounded-3xl border border-border bg-card p-8 sm:p-10 relative noise">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-2xl bg-primary grid place-items-center">
                                <Sparkles className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div>
                                <p className="tick-label text-muted-foreground">Laporan Kegiatan Rutin</p>
                                <p className="font-display font-black leading-none">E-KERTALANGU</p>
                            </div>
                        </div>
                        <span className="tick-label text-muted-foreground">{data.kind === 'monthly' ? 'BULANAN' : data.kind === 'weekly' ? 'MINGGUAN' : data.kind === 'activity' ? 'KEGIATAN' : 'HARIAN'}</span>
                    </div>

                    {data.kind === 'activity' ? (
                        <div>
                            <p className="tick-label text-muted-foreground">{data.activity_date}</p>
                            <h1 className="font-display font-black text-4xl tracking-tighter mt-1">{data.activity_name}</h1>
                            <p className="text-sm text-muted-foreground mt-1 font-mono">{data.start_time}–{data.end_time} WITA</p>
                            {(data.pengajar || data.materi_progress) && (
                                <div className="mt-4 rounded-xl bg-muted p-3 space-y-1 text-sm">
                                    {data.pengajar && <p>👤 <span className="text-muted-foreground">Pengajar:</span> <span className="font-medium">{data.pengajar}</span></p>}
                                    {data.materi_progress && <p>📖 <span className="text-muted-foreground">Materi:</span> <span className="font-medium">{data.materi_progress}</span></p>}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div>
                            <p className="tick-label text-muted-foreground">
                                {data.kind === 'weekly'
                                    ? `Pekan ${data.range_start} — ${data.range_end}`
                                    : data.kind === 'monthly'
                                    ? `Bulan ${data.range_start} — ${data.range_end}`
                                    : data.date}
                            </p>
                            <h1 className="font-display font-black text-4xl tracking-tighter mt-1">
                                Laporan {data.kind === 'weekly' ? 'Mingguan' : data.kind === 'monthly' ? 'Bulanan' : 'Harian'}
                            </h1>
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-3 mt-8">
                        <div className="rounded-2xl bg-success/10 border border-success/30 p-5 text-center">
                            <p className="tick-label text-success">Hadir</p>
                            <p className="font-display font-black text-5xl text-success mt-1">{data.counts?.hadir || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-warning/10 border border-warning/30 p-5 text-center">
                            <p className="tick-label text-warning">Izin</p>
                            <p className="font-display font-black text-5xl text-warning mt-1">{data.counts?.izin || 0}</p>
                        </div>
                        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-5 text-center">
                            <p className="tick-label text-destructive">Alpha</p>
                            <p className="font-display font-black text-5xl text-destructive mt-1">{data.counts?.alpha || 0}</p>
                        </div>
                    </div>

                    <div className="mt-6 rounded-2xl bg-primary text-primary-foreground p-5 flex items-center justify-between">
                        <div>
                            <p className="tick-label opacity-70">Rasio Hadir</p>
                            <p className="font-display font-black text-5xl mt-1">{rate}%</p>
                        </div>
                        <p className="text-sm opacity-80">dari {total} absensi</p>
                    </div>

                    {data.rows && data.rows.length > 0 && (
                        <div className="mt-6">
                            <p className="tick-label text-muted-foreground mb-2">Daftar Peserta ({data.rows.length})</p>
                            <div className="max-h-80 overflow-auto divide-y divide-border text-sm">
                                {data.rows.map((r, i) => (
                                    <div key={i} className="flex items-center justify-between gap-3 py-2">
                                        <div className="min-w-0">
                                            <p className="truncate">{i + 1}. {r.name}</p>
                                            {r.activity_name && <p className="text-xs text-muted-foreground truncate">{r.activity_name}</p>}
                                        </div>
                                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${r.status === 'hadir' ? 'bg-success/10 text-success border-success/20' : r.status === 'izin' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>{r.status} {r.time_in && `· ${r.time_in} WITA`}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.activities && data.activities.length > 0 && (
                        <div className="mt-6">
                            <p className="tick-label text-muted-foreground mb-2">Per Kegiatan</p>
                            <div className="divide-y divide-border text-sm">
                                {data.activities.map((a, i) => (
                                    <div key={i} className="py-2 flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{a.name}</p>
                                            <p className="text-xs font-mono text-muted-foreground">{a.date}</p>
                                        </div>
                                        <p className="text-xs font-mono">H {a.hadir} · I {a.izin} · A {a.alpha}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <p className="mt-8 text-xs text-center text-muted-foreground font-mono">
                        Dibuat oleh {data.created_by_name || 'E-Kertalangu'} · {new Date().toLocaleString('id-ID')}
                    </p>
                </div>
            </div>
        </div>
    );
}
