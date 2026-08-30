import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users, CalendarDays, ScanLine, Notebook, Download, MessageCircle, ArrowUpRight,
    Activity, UserCheck, UserX, Clock, TrendingUp, QrCode, Megaphone, Share2,
    FileText, FileSpreadsheet, ShieldCheck,
} from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { DASH } from '@/constants/testIds/app';
import WhatsAppSender from '@/components/WhatsAppSender';
import QRScanner from '@/components/QRScanner';
import { buildStatsPdf, loadLogoDataUrl } from '@/lib/reportPdf';
import CountUp from '@/components/CountUp';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell,
    LineChart, Line, CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';

function Kpi({ label, value, sublabel, testId, accent, tone }) {
    const toneClass = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-destructive' : tone === 'accent' ? 'text-accent' : '';
    return (
        <div
            data-testid={testId}
            className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between h-32 hover:-translate-y-0.5 transition-transform"
        >
            <p className="tick-label text-muted-foreground">{label}</p>
            <div>
                <p className={`font-display font-black text-4xl leading-none ${toneClass}`}><CountUp value={value} /></p>
                <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
            </div>
        </div>
    );
}

function Stat({ label, value, testId, icon: Icon, tone }) {
    const toneClass = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-destructive' : tone === 'accent' ? 'text-accent' : 'text-foreground';
    const iconWrap = tone === 'success' ? 'bg-success/10 text-success' : tone === 'warning' ? 'bg-warning/10 text-warning' : tone === 'danger' ? 'bg-destructive/10 text-destructive' : tone === 'accent' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary';
    return (
        <div data-testid={testId} className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4 hover:-translate-y-0.5 transition-transform">
            {Icon && <div className={`h-11 w-11 rounded-xl grid place-items-center flex-shrink-0 ${iconWrap}`}><Icon className="h-5 w-5" /></div>}
            <div className="min-w-0">
                <p className={`font-display font-black text-3xl leading-none ${toneClass}`}><CountUp value={value} /></p>
                <p className="mt-1 text-xs text-muted-foreground truncate">{label}</p>
            </div>
        </div>
    );
}

function SystemStatus({ online }) {
    const qrOk = typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const rows = [
        { label: 'Database', tone: online ? 'ok' : 'warn', text: online ? 'Normal' : 'Perlu perhatian' },
        { label: 'Aplikasi / Server', tone: online ? 'ok' : 'warn', text: online ? 'Normal' : 'Perlu perhatian' },
        { label: 'QR Scanner', tone: qrOk ? 'ok' : 'err', text: qrOk ? 'Tersedia' : 'Tidak tersedia' },
        { label: 'Backup Terakhir', tone: 'muted', text: 'Tidak tersedia' },
        { label: 'Versi Aplikasi', tone: 'ok', text: 'V2.0' },
    ];
    const dotCls = { ok: 'bg-success', warn: 'bg-warning', err: 'bg-destructive', muted: 'bg-muted-foreground/40' };
    return (
        <div className="rounded-2xl border border-border bg-card p-5" data-testid="system-status">
            <p className="tick-label text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Status Sistem</p>
            <div className="mt-3 divide-y divide-border">
                {rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="text-muted-foreground">{r.label}</span>
                        <span className="inline-flex items-center gap-2 font-medium">
                            <span className={`h-2 w-2 rounded-full ${dotCls[r.tone]} ${r.tone === 'ok' ? 'animate-pulse' : ''}`} />
                            {r.text}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Action({ to, label, icon: Icon, testId, onClick, tone }) {
    const cls = `group rounded-2xl border border-border bg-card p-5 h-full text-left flex items-start justify-between hover:-translate-y-0.5 transition-transform ${
        tone === 'accent' ? 'bg-accent text-accent-foreground border-accent' : ''
    }`;
    const content = (
        <>
            <div className="flex flex-col gap-3">
                <Icon className={`h-6 w-6 ${tone === 'accent' ? '' : 'text-primary'}`} />
                <span className="font-display font-bold text-lg leading-tight">{label}</span>
            </div>
            <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
        </>
    );
    if (onClick) return <button data-testid={testId} onClick={onClick} className={cls}>{content}</button>;
    return <Link data-testid={testId} to={to} className={cls}>{content}</Link>;
}

export default function Dashboard() {
    const { user } = useAuth();
    const [kpi, setKpi] = useState(null);
    const [stats, setStats] = useState(null);
    const [wa, setWa] = useState(false);
    const [scan, setScan] = useState(false);
    const [tomorrow, setTomorrow] = useState(null);
    const [activities, setActivities] = useState([]);
    const [recentLog, setRecentLog] = useState([]);
    const [waTargets, setWaTargets] = useState([]);
    const [waTpl, setWaTpl] = useState('reminder');
    const [announcements, setAnnouncements] = useState([]);
    const [alphaAlerts, setAlphaAlerts] = useState([]);

    const load = async () => {
        try {
            const promises = [
                api.get('/dashboard/kpi'),
                api.get('/dashboard/stats'),
                api.get('/activities', { params: { upcoming: true } }),
            ];
            if (user.role !== 'peserta') {
                promises.push(api.get('/activity-log', { params: { limit: 8 } }));
                promises.push(api.get('/reminders/tomorrow'));
                promises.push(api.get('/analytics/alpha-alert'));
            }
            promises.push(api.get('/announcements'));
            const results = await Promise.all(promises);
            setKpi(results[0].data);
            setStats(results[1].data);
            setActivities(results[2].data.items.slice(0, 5));
            if (user.role !== 'peserta') {
                setRecentLog(results[3].data.items);
                setTomorrow(results[4].data);
                setAlphaAlerts(results[5].data.items || []);
                setAnnouncements(results[6].data.items.slice(0, 3));
            } else {
                setAnnouncements(results[3].data.items.slice(0, 3));
            }
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

    const openReminder = () => {
        if (!tomorrow || tomorrow.participants.length === 0) {
            toast.error('Belum ada peserta dengan nomor HP');
            return;
        }
        setWaTargets(tomorrow.participants);
        setWaTpl('reminder');
        setWa(true);
    };

    const createReport = async (kind) => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const { data } = await api.post('/share/attendance', { kind, date: today, ttl_hours: 720 });
            const url = `${window.location.origin}/share/${data.token}`;
            await navigator.clipboard.writeText(url).catch(() => {});
            toast.success(`Link Laporan ${kind === 'monthly' ? 'Bulanan' : 'Harian'} dibuat & disalin`);
            window.open(url, '_blank');
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    if (user.role === 'peserta') return <PesertaDashboard user={user} kpi={kpi} stats={stats} activities={activities} />;

    const scopeLabel = user.role === 'admin' ? 'Menyeluruh (Admin)' : 'Kepengurusan (Pengurus)';

    const exportStatsPdf = async () => {
        if (!stats?.overview) { toast.error('Statistik belum siap'); return; }
        try {
            const logo = await loadLogoDataUrl();
            const doc = buildStatsPdf({
                scopeLabel, overview: stats.overview, gender: stats.gender,
                last30: stats.last30, today: stats.today, generatedBy: user.name, logo,
            });
            doc.save(`statistik-e-kertalangu-${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success('Statistik PDF diunduh');
        } catch (e) { toast.error('Gagal membuat PDF'); }
    };

    const exportStatsExcel = () => {
        if (!stats?.overview) { toast.error('Statistik belum siap'); return; }
        const o = stats.overview, g = stats.gender || {}, l = stats.last30 || {}, t = stats.today || {};
        const rows = [
            ['Ringkasan Statistik Dashboard — E-Kertalangu'],
            ['Cakupan', scopeLabel],
            ['Dibuat oleh', user.name],
            ['Dibuat', new Date().toLocaleString('id-ID')],
            [],
            ['Statistik Menyeluruh', 'Nilai'],
        ];
        if (o.total_participants !== undefined) rows.push(['Total Peserta', o.total_participants]);
        if (o.activated_participants !== undefined) rows.push(['Akun Teraktivasi', o.activated_participants]);
        if (o.unactivated_participants !== undefined) rows.push(['Belum Aktivasi', o.unactivated_participants]);
        if (o.total_activities !== undefined) rows.push(['Total Kegiatan', o.total_activities]);
        rows.push(['Kegiatan Bulan Ini', o.monthly_activities ?? 0]);
        rows.push(['Total Absensi', o.total_attendance ?? 0]);
        rows.push(['Rasio Kehadiran (%)', o.attendance_rate ?? 0]);
        rows.push([], ['Rekap Jamaah & Kehadiran', 'Nilai']);
        rows.push(['Jamaah Aktif — Laki-laki', g.L ?? 0]);
        rows.push(['Jamaah Aktif — Perempuan', g.P ?? 0]);
        rows.push(['Hadir Hari Ini', t.hadir ?? 0]);
        rows.push(['Izin Hari Ini', t.izin ?? 0]);
        rows.push(['Alpha Hari Ini', t.alpha ?? 0]);
        rows.push(['Hadir (30 Hari)', l.counts?.hadir ?? 0]);
        rows.push(['Izin (30 Hari)', l.counts?.izin ?? 0]);
        rows.push(['Alpha (30 Hari)', l.counts?.alpha ?? 0]);
        rows.push(['Rasio Hadir 30 Hari (%)', l.rate_hadir ?? 0]);
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 32 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Statistik');
        XLSX.writeFile(wb, `statistik-e-kertalangu-${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success('Statistik Excel diunduh');
    };

    const attCounts = stats?.today || { hadir: 0, izin: 0, alpha: 0 };
    const last30 = stats?.last30 || { counts: { hadir: 0, izin: 0, alpha: 0 }, total: 0, rate_hadir: 0 };
    const gender = stats?.gender || { L: 0, P: 0, total: 0 };
    const ov = stats?.overview;
    const isAdmin = user.role === 'admin';

    const attChart = [
        { label: 'Hadir', v: last30.counts.hadir, fill: 'hsl(var(--success))' },
        { label: 'Izin', v: last30.counts.izin, fill: 'hsl(var(--warning))' },
        { label: 'Alpha', v: last30.counts.alpha, fill: 'hsl(var(--destructive))' },
    ];

    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <p className="tick-label text-muted-foreground">Halo, {user.name}</p>
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Dashboard</h1>
                    <p className="text-muted-foreground mt-2">Ringkasan real-time kegiatan & kehadiran jamaah.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button onClick={() => setScan(true)} className="rounded-full h-11 bg-accent hover:bg-accent/90 text-accent-foreground">
                        <ScanLine className="h-4 w-4 mr-2" /> Scan QR
                    </Button>
                    <Button onClick={() => createReport('daily')} variant="outline" className="rounded-full h-11">
                        <Share2 className="h-4 w-4 mr-2" /> Laporan Harian
                    </Button>
                    <Button onClick={() => createReport('monthly')} variant="outline" className="rounded-full h-11">
                        <Share2 className="h-4 w-4 mr-2" /> Laporan Bulanan
                    </Button>
                    <Button onClick={() => setWa(true)} variant="outline" className="rounded-full h-11">
                        <MessageCircle className="h-4 w-4 mr-2" /> Kirim WA
                    </Button>
                </div>
            </div>

            {/* Approval pending banner */}
            {user.role === 'admin' && stats?.pending_users > 0 && (
                <Link to="/app/users" className="block rounded-2xl border border-accent/40 bg-accent/10 p-4 hover:bg-accent/15 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-accent grid place-items-center text-accent-foreground">
                                <Clock className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-medium">{stats.pending_users} pendaftaran menunggu approval</p>
                                <p className="text-xs text-muted-foreground">Klik untuk membuka daftar dan approve.</p>
                            </div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-accent" />
                    </div>
                </Link>
            )}

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Kpi testId={DASH.kpiPeserta} label="Peserta Aktif" value={kpi?.peserta_aktif ?? '—'} sublabel={`L: ${gender.L} · P: ${gender.P}`} />
                <Kpi testId={DASH.kpiKegiatan} label="Kegiatan Mendatang" value={kpi?.kegiatan_upcoming ?? '—'} sublabel={`dari ${kpi?.kegiatan_total ?? 0} kegiatan`} />
                <Kpi testId={DASH.kpiHadirToday} label="Hadir Hari Ini" value={attCounts.hadir} sublabel={`Izin ${attCounts.izin} · Alpha ${attCounts.alpha}`} tone="accent" />
                <Kpi label="Rasio Hadir 30 Hari" value={`${last30.rate_hadir}%`} sublabel={`Total ${last30.total} absensi`} tone={last30.rate_hadir >= 70 ? 'success' : last30.rate_hadir >= 40 ? 'warning' : 'danger'} />
            </div>

            {/* Role-based overview stats */}
            {ov && (
                <div data-testid="dashboard-overview">
                    <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                        <p className="tick-label text-muted-foreground">
                            {isAdmin ? 'Statistik Menyeluruh' : 'Statistik Kepengurusan'}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button data-testid="export-stats-pdf" onClick={exportStatsPdf} variant="outline" size="sm" className="rounded-full h-9">
                                <FileText className="h-4 w-4 mr-2" /> Statistik PDF
                            </Button>
                            <Button data-testid="export-stats-excel" onClick={exportStatsExcel} variant="outline" size="sm" className="rounded-full h-9">
                                <FileSpreadsheet className="h-4 w-4 mr-2" /> Statistik Excel
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {isAdmin && (
                            <>
                                <Stat testId="stat-total-participants" label="Total Peserta" value={ov.total_participants} icon={Users} />
                                <Stat testId="stat-activated" label="Akun Teraktivasi" value={ov.activated_participants} icon={UserCheck} tone="success" />
                                <Stat testId="stat-unactivated" label="Belum Aktivasi" value={ov.unactivated_participants} icon={UserX} tone="warning" />
                                <Stat testId="stat-total-activities" label="Total Kegiatan" value={ov.total_activities} icon={CalendarDays} />
                            </>
                        )}
                        {!isAdmin && (
                            <Stat testId="stat-active-participants" label="Peserta Aktif" value={ov.total_participants} icon={Users} />
                        )}
                        <Stat testId="stat-monthly-activities" label="Kegiatan Bulan Ini" value={ov.monthly_activities} icon={CalendarDays} tone="accent" />
                        <Stat testId="stat-total-attendance" label="Total Absensi" value={ov.total_attendance} icon={Activity} />
                        <Stat testId="stat-attendance-rate" label="Rasio Kehadiran" value={`${ov.attendance_rate}%`} icon={TrendingUp} tone={ov.attendance_rate >= 70 ? 'success' : ov.attendance_rate >= 40 ? 'warning' : 'danger'} />
                    </div>
                </div>
            )}

            {/* Rekap gender + kehadiran */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="rounded-2xl border border-border bg-card p-5">
                    <p className="tick-label text-muted-foreground">Rekap Jamaah (Aktif)</p>
                    <div className="mt-4 flex items-center gap-6">
                        <div>
                            <p className="text-3xl font-display font-black">{gender.L}</p>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Laki-laki</p>
                        </div>
                        <div className="h-12 w-px bg-border" />
                        <div>
                            <p className="text-3xl font-display font-black">{gender.P}</p>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground">Perempuan</p>
                        </div>
                    </div>
                    {gender.total > 0 && (
                        <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden flex">
                            <div className="h-full bg-primary" style={{ width: `${(gender.L / gender.total) * 100}%` }} />
                            <div className="h-full bg-accent" style={{ width: `${(gender.P / gender.total) * 100}%` }} />
                        </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 font-mono">
                        L {gender.total ? Math.round((gender.L / gender.total) * 100) : 0}% · P {gender.total ? Math.round((gender.P / gender.total) * 100) : 0}%
                    </p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                    <p className="tick-label text-muted-foreground">Rekap Kehadiran 30 Hari</p>
                    <p className="mt-2 text-3xl font-display font-black text-success">{last30.rate_hadir}%</p>
                    <p className="text-xs text-muted-foreground">Rasio hadir dari {last30.total} absensi</p>
                    <div className="h-32 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attChart}>
                                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                                <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                                    {attChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs mt-1">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-success" /> Hadir {last30.counts.hadir}</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> Izin {last30.counts.izin}</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" /> Alpha {last30.counts.alpha}</span>
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                    <p className="tick-label text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Tren Hadir 14 Hari</p>
                    <div className="h-40 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats?.series_hadir_14d || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={9} tickFormatter={(v) => v.slice(-5)} />
                                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                                <Line type="monotone" dataKey="hadir" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Status Sistem (admin) */}
            {isAdmin && <SystemStatus online={!!stats} />}

            {/* Alpha Alert */}
            {alphaAlerts.length > 0 && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <UserX className="h-4 w-4 text-destructive" />
                            <p className="tick-label text-destructive">{alphaAlerts.length} Peserta Sering Alpha (30 hari)</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {alphaAlerts.slice(0, 6).map((p) => (
                            <div key={p.participant_id} className="rounded-xl bg-card border border-border p-3 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">{p.name}</p>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{p.code} · {p.alpha_count}x alpha</p>
                                </div>
                                {p.phone && (
                                    <a
                                        href={`https://wa.me/${p.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Assalamu'alaikum ${p.name}, semoga sehat selalu. Kami perhatikan Anda beberapa kali tidak hadir pada kegiatan pengajian. Semoga bisa hadir kembali di kegiatan berikutnya. Jazakumullah khoiro.`)}`}
                                        target="_blank" rel="noreferrer"
                                    >
                                        <Button size="sm" variant="outline" className="rounded-full h-8">
                                            <MessageCircle className="h-3 w-3 mr-1" /> WA
                                        </Button>
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Announcements strip */}
            {announcements.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <p className="tick-label text-muted-foreground">Pengumuman Terbaru</p>
                        <Link to="/app/announcements" className="text-xs text-accent hover:underline">Semua →</Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {announcements.map((a) => (
                            <div key={a.id} className={`rounded-2xl border p-4 ${a.pinned ? 'border-accent bg-accent/5' : 'border-border bg-card'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    {a.priority === 'penting' && <span className="text-[9px] uppercase tracking-widest bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">Penting</span>}
                                    {a.pinned && <span className="text-[9px] uppercase tracking-widest text-accent">📌 Pinned</span>}
                                </div>
                                <h4 className="font-display font-bold text-base leading-tight">{a.title}</h4>
                                {a.body && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{a.body}</p>}
                                {(a.pengajar || a.materi_progress) && (
                                    <div className="mt-2 pt-2 border-t border-border text-[11px] space-y-0.5">
                                        {a.pengajar && <p className="text-muted-foreground">👤 <span className="text-foreground">{a.pengajar}</span></p>}
                                        {a.materi_progress && <p className="text-muted-foreground">📖 <span className="text-foreground">{a.materi_progress}</span></p>}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Reminder H-1 for admin/pengurus */}
            {tomorrow && (tomorrow.activities?.length > 0 || tomorrow.participants?.length > 0) && (
                <div className="rounded-2xl border border-border bg-primary text-primary-foreground p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <p className="tick-label opacity-70">Reminder H-1 · {tomorrow.date}</p>
                            <h3 className="font-display font-bold text-xl mt-1">
                                {tomorrow.activities.length > 0
                                    ? `${tomorrow.activities.length} Kegiatan Besok`
                                    : 'Tidak ada kegiatan besok'}
                            </h3>
                            {tomorrow.activities.length > 0 && (
                                <p className="text-sm opacity-80 mt-1">
                                    {tomorrow.activities.map((a) => `${a.name} (${a.start_time})`).join(' · ')}
                                </p>
                            )}
                        </div>
                        {tomorrow.activities.length > 0 && (
                            <Button
                                onClick={openReminder}
                                variant="secondary"
                                className="rounded-full"
                            >
                                <MessageCircle className="h-4 w-4 mr-2" /> Kirim ke {tomorrow.participants.length} peserta
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <p className="tick-label text-muted-foreground mb-3">Quick Actions</p>
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <Action testId={DASH.qaScan} onClick={() => setScan(true)} label="Scan QR" icon={ScanLine} tone="accent" />
                    <Action testId={DASH.qaAddParticipant} to="/app/participants" label="Peserta" icon={Users} />
                    <Action testId={DASH.qaAddActivity} to="/app/activities" label="Kegiatan" icon={CalendarDays} />
                    <Action testId={DASH.qaMusyawarah} to="/app/musyawarah" label="Musyawarah" icon={Notebook} />
                    <Action to="/qr-daftar" label="QR Publik" icon={QrCode} />
                    <Action testId={DASH.qaBackup} to="/app/backup" label="Backup .xlsx" icon={Download} />
                </div>
            </div>

            {/* Upcoming activities + Log */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                        <p className="tick-label text-muted-foreground">Kegiatan Mendatang</p>
                        <Link to="/app/activities" className="text-xs text-accent hover:underline">Semua →</Link>
                    </div>
                    <div className="divide-y divide-border">
                        {activities.length === 0 && (
                            <p className="py-6 text-sm text-muted-foreground">Belum ada kegiatan mendatang.</p>
                        )}
                        {activities.map((a) => (
                            <Link key={a.id} to={`/app/activities/${a.id}`} className="flex items-center justify-between py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition-colors">
                                <div>
                                    <p className="font-medium">{a.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">
                                        {a.date} · {a.start_time}–{a.end_time} WITA · {a.type}
                                    </p>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                            </Link>
                        ))}
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity className="h-4 w-4 text-accent" />
                        <p className="tick-label text-muted-foreground">Log Terbaru</p>
                    </div>
                    <ul className="space-y-3 text-sm">
                        {recentLog.length === 0 && <p className="text-muted-foreground text-sm">Belum ada aktivitas.</p>}
                        {recentLog.map((l) => (
                            <li key={l.id} className="flex gap-3">
                                <span className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                                <div>
                                    <p className="leading-snug">
                                        <span className="font-medium">{l.actor_name || 'Sistem'}</span>{' '}
                                        <span className="text-muted-foreground">{l.action}</span>
                                    </p>
                                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                                        {new Date(l.timestamp).toLocaleString('id-ID')}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {wa && <WhatsAppSender open={wa} onClose={() => setWa(false)} defaultTemplate={waTpl} recipients={waTargets} activityName={tomorrow?.activities?.[0]?.name || ''} />}
            {scan && <QRScanner open={scan} onClose={() => setScan(false)} onScanned={load} />}
        </div>
    );
}

function PesertaDashboard({ user, kpi, stats, activities }) {
    const [scan, setScan] = useState(false);
    const last30 = stats?.last30 || { rate_hadir: 0, total: 0 };
    return (
        <div className="animate-fade-in-up space-y-8">
            <div>
                <p className="tick-label text-muted-foreground">Assalamu'alaikum</p>
                <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">{user.name}</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
                <button
                    onClick={() => setScan(true)}
                    className="md:col-span-5 rounded-3xl border border-border bg-accent text-accent-foreground p-8 hover:-translate-y-0.5 transition-transform text-left"
                >
                    <p className="tick-label opacity-80">Absen Mandiri</p>
                    <h2 className="font-display font-black text-3xl mt-2 tracking-tighter">Scan QR Kegiatan</h2>
                    <p className="mt-2 opacity-90 text-sm">Buka kamera dan arahkan ke QR kegiatan untuk absen otomatis. Berlaku hanya di hari kegiatan.</p>
                    <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-foreground text-accent px-4 py-2 text-sm font-semibold">
                        <ScanLine className="h-4 w-4" /> Buka Scanner
                    </div>
                </button>
                <Link to="/app/me" className="md:col-span-3 rounded-3xl border border-border bg-primary text-primary-foreground p-6 hover:-translate-y-0.5 transition-transform">
                    <p className="tick-label opacity-70">QR Peserta</p>
                    <h3 className="font-display font-black text-2xl mt-2">QR Saya</h3>
                    <p className="mt-2 opacity-80 text-sm">Perlihatkan ke pengurus jika absen manual.</p>
                    <div className="mt-6 flex items-center gap-2 text-sm">
                        Lihat <ArrowUpRight className="h-4 w-4" />
                    </div>
                </Link>
                <div className="md:col-span-4 rounded-3xl border border-border bg-card p-6">
                    <p className="tick-label text-muted-foreground">Rasio Kehadiran Saya (30 Hari)</p>
                    <p className="font-display font-black text-5xl mt-2 text-success">{last30.rate_hadir}%</p>
                    <p className="text-sm text-muted-foreground">Dari {last30.total} kegiatan diikuti.</p>
                </div>
                <div className="md:col-span-4 rounded-3xl border border-border bg-card p-6">
                    <p className="tick-label text-muted-foreground">Kegiatan Mendatang</p>
                    <div className="divide-y divide-border mt-2">
                        {activities.length === 0 && <p className="py-4 text-sm text-muted-foreground">Belum ada jadwal.</p>}
                        {activities.slice(0, 3).map((a) => (
                            <div key={a.id} className="py-2.5">
                                <p className="font-medium text-sm">{a.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{a.date} · {a.start_time} WITA</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {scan && <QRScanner open={scan} onClose={() => setScan(false)} selfMode onScanned={() => window.location.reload()} />}
        </div>
    );
}
