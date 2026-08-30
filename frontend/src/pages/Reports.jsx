import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, formatApiError, API_BASE } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    FileText, FileSpreadsheet, CloudUpload, Search, RefreshCw, Users, CheckCircle2, Clock, XCircle,
    Percent, MessageCircle, CalendarRange, Notebook, ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildDriveFolderPath, buildReportFileName, saveToGoogleDrive } from '@/lib/googleDrive';
import { loadLogoDataUrl, buildAttendancePdf, buildMonthlyPdf, buildMusyawarahPdf } from '@/lib/reportPdf';
import { TableSkeleton } from '@/components/skeletons';
import { EmptyState } from '@/components/EmptyState';

const STATUS_LABELS = { hadir: 'Hadir', izin: 'Izin', alpha: 'Alpha' };
const KIND_LABELS = { '4S': 'Musyawarah 4S', TIM7: 'Tim 7' };
const todayStr = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);
const monthLabelOf = (m) => {
    if (!m) return '';
    const [y, mo] = m.split('-');
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};
const openWhatsApp = (text) => window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');

function StatCard({ icon: Icon, label, value, tone, testid }) {
    return (
        <div className="rounded-2xl border border-border bg-card p-4" data-testid={testid}>
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className={`h-4 w-4 ${tone || ''}`} />
                <span className="tick-label">{label}</span>
            </div>
            <p className="mt-2 text-3xl font-display font-black">{value}</p>
        </div>
    );
}

export default function Reports() {
    const [view, setView] = useState('kehadiran');
    const logoRef = useRef(null);
    useEffect(() => { loadLogoDataUrl().then((d) => { logoRef.current = d; }); }, []);

    return (
        <div className="animate-fade-in-up space-y-6" data-testid="reports-page">
            <div>
                <p className="tick-label text-muted-foreground">Laporan</p>
                <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Laporan</h1>
                <p className="text-muted-foreground mt-2">Cari, cetak, bagikan, dan simpan laporan dari data yang sudah ada.</p>
            </div>

            <Tabs value={view} onValueChange={setView}>
                <TabsList>
                    <TabsTrigger value="kehadiran" data-testid="tab-kehadiran"><ClipboardList className="h-4 w-4 mr-2" /> Kehadiran</TabsTrigger>
                    <TabsTrigger value="bulanan" data-testid="tab-bulanan"><CalendarRange className="h-4 w-4 mr-2" /> Rekap Bulanan</TabsTrigger>
                    <TabsTrigger value="musyawarah" data-testid="tab-musyawarah"><Notebook className="h-4 w-4 mr-2" /> Musyawarah</TabsTrigger>
                </TabsList>
            </Tabs>

            {view === 'kehadiran' && <AttendanceReport logoRef={logoRef} />}
            {view === 'bulanan' && <MonthlyReport logoRef={logoRef} />}
            {view === 'musyawarah' && <MusyawarahReport logoRef={logoRef} />}
        </div>
    );
}

/* ------------------------- KEHADIRAN ------------------------- */
function AttendanceReport({ logoRef }) {
    const [mode, setMode] = useState('today');
    const [singleDate, setSingleDate] = useState(todayStr());
    const [rangeFrom, setRangeFrom] = useState(todayStr());
    const [rangeTo, setRangeTo] = useState(todayStr());
    const [activityId, setActivityId] = useState('all');
    const [status, setStatus] = useState('all');
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [activities, setActivities] = useState([]);
    const [rows, setRows] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => { const t = setTimeout(() => setDebouncedQ(q.trim()), 400); return () => clearTimeout(t); }, [q]);
    useEffect(() => { api.get('/activities').then(({ data }) => setActivities(data.items || [])).catch(() => {}); }, []);

    const period = useMemo(() => {
        if (mode === 'today') return { date_from: todayStr(), date_to: todayStr() };
        if (mode === 'single') return { date_from: singleDate, date_to: singleDate };
        return { date_from: rangeFrom, date_to: rangeTo };
    }, [mode, singleDate, rangeFrom, rangeTo]);

    const buildParams = useCallback(() => {
        const p = { ...period };
        if (activityId !== 'all') p.activity_id = activityId;
        if (status !== 'all') p.status = status;
        if (debouncedQ) p.q = debouncedQ;
        return p;
    }, [period, activityId, status, debouncedQ]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/attendance', { params: buildParams() });
            setRows(data.rows || []); setStats(data.stats || null);
        } catch (e) { toast.error(formatApiError(e)); setRows([]); setStats(null); }
        finally { setLoading(false); }
    }, [buildParams]);
    useEffect(() => { load(); }, [load]);

    const activityName = activityId !== 'all' ? (activities.find((a) => a.id === activityId)?.name || '') : '';
    const statusLabel = status !== 'all' ? STATUS_LABELS[status] : '';
    const periodLabel = period.date_from === period.date_to
        ? new Date(period.date_from).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : `${new Date(period.date_from).toLocaleDateString('id-ID')} – ${new Date(period.date_to).toLocaleDateString('id-ID')}`;

    const downloadExcel = async () => {
        if (rows.length === 0) { toast.error('Tidak ada data.'); return; }
        setExporting(true);
        try {
            const qs = new URLSearchParams(buildParams()).toString();
            const res = await fetch(`${API_BASE}/reports/attendance/export/xlsx?${qs}`, { headers: { Authorization: `Bearer ${localStorage.getItem('ektl_token') || ''}` } });
            if (!res.ok) throw new Error('Gagal');
            const blob = await res.blob(); const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = buildReportFileName('harian', 'xlsx', new Date(period.date_from)); a.click();
            URL.revokeObjectURL(url); toast.success('Excel diunduh');
        } catch { toast.error('Gagal mengunduh Excel.'); } finally { setExporting(false); }
    };

    const downloadPDF = () => {
        if (rows.length === 0) { toast.error('Tidak ada data.'); return; }
        try {
            const doc = buildAttendancePdf({ rows, stats, periodLabel, activityName, statusLabel, logo: logoRef.current });
            doc.save(buildReportFileName('harian', 'pdf', new Date(period.date_from)));
            toast.success('PDF dibuat');
        } catch { toast.error('Gagal membuat laporan.'); }
    };

    const shareWA = () => {
        if (rows.length === 0) { toast.error('Tidak ada data.'); return; }
        const t = [
            '*Laporan Kehadiran E-Kertalangu*',
            `Periode: ${periodLabel}`,
            activityName ? `Kegiatan: ${activityName}` : 'Kegiatan: Semua',
            statusLabel ? `Status: ${statusLabel}` : null,
            '--------------------',
            `Total Peserta: ${stats?.total_peserta ?? 0}`,
            `Hadir: ${stats?.hadir ?? 0} | Izin: ${stats?.izin ?? 0} | Alpha: ${stats?.alpha ?? 0}`,
            `Kehadiran: ${stats?.rate_hadir ?? 0}%`,
        ].filter(Boolean).join('\n');
        openWhatsApp(t);
    };

    const handleDrive = async () => {
        const res = await saveToGoogleDrive({ fileName: buildReportFileName('harian', 'pdf', new Date(period.date_from)), folderPath: buildDriveFolderPath(new Date(period.date_from)) });
        if (!res.ok && res.reason === 'not_configured') toast.info(res.message);
        else if (res.ok) toast.success('Tersimpan ke Google Drive');
        else toast.error(res.message || 'Gagal menyimpan ke Google Drive.');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button onClick={downloadPDF} className="rounded-full bg-primary" data-testid="report-pdf-btn"><FileText className="h-4 w-4 mr-2" /> Download PDF</Button>
                <Button onClick={downloadExcel} disabled={exporting} variant="outline" className="rounded-full" data-testid="report-excel-btn"><FileSpreadsheet className="h-4 w-4 mr-2" /> {exporting ? 'Menyiapkan…' : 'Download Excel'}</Button>
                <Button onClick={shareWA} variant="outline" className="rounded-full text-success border-success/30" data-testid="report-wa-btn"><MessageCircle className="h-4 w-4 mr-2" /> Kirim ke WhatsApp</Button>
                <Button onClick={handleDrive} variant="outline" className="rounded-full" data-testid="report-drive-btn"><CloudUpload className="h-4 w-4 mr-2" /> Simpan ke Google Drive</Button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5" data-testid="report-filters">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="tick-label">Tanggal</Label>
                        <Select value={mode} onValueChange={setMode}>
                            <SelectTrigger className="h-11" data-testid="report-date-mode"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Hari Ini</SelectItem>
                                <SelectItem value="single">Pilih Tanggal</SelectItem>
                                <SelectItem value="range">Rentang Tanggal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {mode === 'single' && (
                        <div className="space-y-1"><Label className="tick-label">Tanggal</Label><Input type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} className="h-11" data-testid="report-single-date" /></div>
                    )}
                    {mode === 'range' && (<>
                        <div className="space-y-1"><Label className="tick-label">Dari</Label><Input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} className="h-11" data-testid="report-range-from" /></div>
                        <div className="space-y-1"><Label className="tick-label">Sampai</Label><Input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} className="h-11" data-testid="report-range-to" /></div>
                    </>)}
                    <div className="space-y-1">
                        <Label className="tick-label">Kegiatan</Label>
                        <Select value={activityId} onValueChange={setActivityId}>
                            <SelectTrigger className="h-11" data-testid="report-activity"><SelectValue placeholder="Semua kegiatan" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kegiatan</SelectItem>
                                {activities.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name} · {a.date}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="tick-label">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="h-11" data-testid="report-status"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="hadir">Hadir</SelectItem>
                                <SelectItem value="izin">Izin</SelectItem>
                                <SelectItem value="alpha">Alpha</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="tick-label">Cari Nama Peserta</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ketik nama…" className="h-11 pl-9" data-testid="report-search" />
                        </div>
                    </div>
                    <div className="flex items-end"><Button onClick={load} variant="outline" className="rounded-full w-full" data-testid="report-refresh"><RefreshCw className="h-4 w-4 mr-2" /> Muat Ulang</Button></div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3" data-testid="report-stats">
                <StatCard testid="stat-total-peserta" icon={Users} label="Total Peserta" value={stats?.total_peserta ?? 0} />
                <StatCard testid="stat-hadir" icon={CheckCircle2} label="Hadir" value={stats?.hadir ?? 0} tone="text-success" />
                <StatCard testid="stat-izin" icon={Clock} label="Izin" value={stats?.izin ?? 0} tone="text-warning" />
                <StatCard testid="stat-alpha" icon={XCircle} label="Alpha" value={stats?.alpha ?? 0} tone="text-destructive" />
                <StatCard testid="stat-rate" icon={Percent} label="% Kehadiran" value={`${stats?.rate_hadir ?? 0}%`} tone="text-accent" />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5" data-testid="report-table">
                <div className="flex items-center justify-between mb-3">
                    <p className="tick-label text-muted-foreground">Rincian ({rows.length})</p>
                    <span className="text-xs text-muted-foreground">{periodLabel}</span>
                </div>
                {loading ? <TableSkeleton rows={6} cols={6} />
                    : rows.length === 0 ? <EmptyState compact icon={ClipboardList} title="Belum ada data laporan" description="Sesuaikan filter tanggal atau kegiatan untuk melihat rekap kehadiran." testId="report-empty" />
                    : (
                        <div className="overflow-auto max-h-[560px]">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-card z-10 shadow-sm">
                                    <tr className="text-left text-muted-foreground border-b border-border">
                                        <th className="py-2 pr-3 font-medium">Tanggal</th><th className="py-2 pr-3 font-medium">Kegiatan</th><th className="py-2 pr-3 font-medium">Peserta</th><th className="py-2 pr-3 font-medium">Kode</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Jam (WITA)</th><th className="py-2 pr-3 font-medium">Metode</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} className="border-b border-border/60 odd:bg-muted/10 hover:bg-primary/5 transition-colors">
                                            <td className="py-2 pr-3 font-mono text-xs">{r.activity_date}</td>
                                            <td className="py-2 pr-3">{r.activity_name}</td>
                                            <td className="py-2 pr-3 font-medium">{r.participant_name}</td>
                                            <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{r.participant_code}</td>
                                            <td className="py-2 pr-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === 'hadir' ? 'bg-success/10 text-success border-success/20' : r.status === 'izin' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                                            <td className="py-2 pr-3 font-mono text-xs">{r.time_in ? `${r.time_in} WITA` : '—'}</td>
                                            <td className="py-2 pr-3 text-xs text-muted-foreground">{r.method || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
            </div>
        </div>
    );
}

/* ------------------------- REKAP BULANAN ------------------------- */
function MonthlyReport({ logoRef }) {
    const [month, setMonth] = useState(thisMonth());
    const [byActivity, setByActivity] = useState([]);
    const [totals, setTotals] = useState(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/reports/monthly', { params: { month } });
            setByActivity(data.by_activity || []); setTotals(data.totals || null);
        } catch (e) { toast.error(formatApiError(e)); setByActivity([]); setTotals(null); }
        finally { setLoading(false); }
    }, [month]);
    useEffect(() => { load(); }, [load]);

    const label = monthLabelOf(month);
    const downloadPDF = () => {
        if (byActivity.length === 0) { toast.error('Tidak ada data.'); return; }
        try {
            const doc = buildMonthlyPdf({ monthLabel: label, byActivity, totals, logo: logoRef.current });
            doc.save(buildReportFileName('bulanan', 'pdf', new Date(`${month}-01`)));
            toast.success('PDF dibuat');
        } catch { toast.error('Gagal membuat laporan.'); }
    };
    const shareWA = () => {
        if (byActivity.length === 0) { toast.error('Tidak ada data.'); return; }
        const head = [
            '*Rekap Bulanan Kehadiran E-Kertalangu*',
            `Bulan: ${label}`,
            `Jumlah Kegiatan: ${totals?.activities ?? 0}`,
            '--------------------',
        ];
        const lines = byActivity.map((r) => `• ${r.activity_date} ${r.activity_name}: H${r.hadir}/I${r.izin}/A${r.alpha} (${r.rate}%)`);
        const foot = ['--------------------', `Total: Hadir ${totals?.hadir ?? 0} | Izin ${totals?.izin ?? 0} | Alpha ${totals?.alpha ?? 0}`, `Kehadiran: ${totals?.rate_hadir ?? 0}%`];
        openWhatsApp([...head, ...lines, ...foot].join('\n'));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="space-y-1">
                    <Label className="tick-label">Bulan</Label>
                    <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 w-52" data-testid="monthly-month" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={downloadPDF} className="rounded-full bg-primary" data-testid="monthly-pdf-btn"><FileText className="h-4 w-4 mr-2" /> Download Rekap Bulanan (PDF)</Button>
                    <Button onClick={shareWA} variant="outline" className="rounded-full text-success border-success/30" data-testid="monthly-wa-btn"><MessageCircle className="h-4 w-4 mr-2" /> Kirim ke WhatsApp</Button>
                    <Button onClick={load} variant="outline" className="rounded-full" data-testid="monthly-refresh"><RefreshCw className="h-4 w-4 mr-2" /> Muat Ulang</Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="monthly-stats">
                <StatCard testid="mstat-kegiatan" icon={CalendarRange} label="Kegiatan" value={totals?.activities ?? 0} />
                <StatCard testid="mstat-peserta" icon={Users} label="Total Peserta" value={totals?.total_peserta ?? 0} />
                <StatCard testid="mstat-hadir" icon={CheckCircle2} label="Hadir" value={totals?.hadir ?? 0} tone="text-success" />
                <StatCard testid="mstat-izin" icon={Clock} label="Izin" value={totals?.izin ?? 0} tone="text-warning" />
                <StatCard testid="mstat-alpha" icon={XCircle} label="Alpha" value={totals?.alpha ?? 0} tone="text-destructive" />
                <StatCard testid="mstat-rate" icon={Percent} label="% Kehadiran" value={`${totals?.rate_hadir ?? 0}%`} tone="text-accent" />
            </div>

            <div className="rounded-2xl border border-border bg-card p-5" data-testid="monthly-table">
                <div className="flex items-center justify-between mb-3">
                    <p className="tick-label text-muted-foreground">Ringkasan per Kegiatan ({byActivity.length})</p>
                    <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                {loading ? <TableSkeleton rows={6} cols={6} />
                    : byActivity.length === 0 ? <EmptyState compact icon={CalendarRange} title="Belum ada data bulanan" description="Pilih bulan lain atau pastikan ada kegiatan pada periode ini." testId="monthly-empty" />
                    : (
                        <div className="overflow-auto max-h-[560px]">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-card z-10 shadow-sm">
                                    <tr className="text-left text-muted-foreground border-b border-border">
                                        <th className="py-2 pr-3 font-medium">Tanggal</th><th className="py-2 pr-3 font-medium">Kegiatan</th><th className="py-2 pr-3 font-medium text-center">Hadir</th><th className="py-2 pr-3 font-medium text-center">Izin</th><th className="py-2 pr-3 font-medium text-center">Alpha</th><th className="py-2 pr-3 font-medium text-center">Total</th><th className="py-2 pr-3 font-medium text-center">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {byActivity.map((r, i) => (
                                        <tr key={i} className="border-b border-border/60 odd:bg-muted/10 hover:bg-primary/5 transition-colors">
                                            <td className="py-2 pr-3 font-mono text-xs">{r.activity_date}</td>
                                            <td className="py-2 pr-3 font-medium">{r.activity_name}</td>
                                            <td className="py-2 pr-3 text-center text-success">{r.hadir}</td>
                                            <td className="py-2 pr-3 text-center text-warning">{r.izin}</td>
                                            <td className="py-2 pr-3 text-center text-destructive">{r.alpha}</td>
                                            <td className="py-2 pr-3 text-center">{r.total}</td>
                                            <td className="py-2 pr-3 text-center font-semibold">{r.rate}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
            </div>
        </div>
    );
}

/* ------------------------- MUSYAWARAH ------------------------- */
function MusyawarahReport({ logoRef }) {
    const [kind, setKind] = useState('4S');
    const [month, setMonth] = useState(thisMonth());
    const [all, setAll] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/musyawarah', { params: { kind } });
            setAll(data.items || []);
        } catch (e) { toast.error(formatApiError(e)); setAll([]); }
        finally { setLoading(false); }
    }, [kind]);
    useEffect(() => { load(); }, [load]);

    const notes = useMemo(() => all.filter((n) => (n.date || '').startsWith(month)), [all, month]);
    const label = monthLabelOf(month);
    const kindLabel = KIND_LABELS[kind] || kind;

    const downloadPDF = () => {
        if (notes.length === 0) { toast.error('Tidak ada data.'); return; }
        try {
            const doc = buildMusyawarahPdf({ kindLabel, monthLabel: label, notes, logo: logoRef.current });
            doc.save(`Laporan_Musyawarah_${kind}_${month}.pdf`);
            toast.success('PDF dibuat');
        } catch { toast.error('Gagal membuat laporan.'); }
    };
    const shareWA = () => {
        if (notes.length === 0) { toast.error('Tidak ada data.'); return; }
        const head = [`*Laporan Musyawarah — ${kindLabel}*`, `Periode: ${label}`, `Jumlah Catatan: ${notes.length}`, '--------------------'];
        const lines = notes.map((n, i) => `${i + 1}. ${n.title || '(tanpa judul)'} — ${n.date || '-'}`);
        openWhatsApp([...head, ...lines].join('\n'));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end gap-3 justify-between">
                <div className="flex items-end gap-3">
                    <div className="space-y-1">
                        <Label className="tick-label">Jenis</Label>
                        <Select value={kind} onValueChange={setKind}>
                            <SelectTrigger className="h-11 w-48" data-testid="musyawarah-kind"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="4S">Musyawarah 4S</SelectItem>
                                <SelectItem value="TIM7">Tim 7</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="tick-label">Bulan</Label>
                        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-11 w-52" data-testid="musyawarah-month" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={downloadPDF} className="rounded-full bg-primary" data-testid="musyawarah-pdf-btn"><FileText className="h-4 w-4 mr-2" /> Download PDF</Button>
                    <Button onClick={shareWA} variant="outline" className="rounded-full text-success border-success/30" data-testid="musyawarah-wa-btn"><MessageCircle className="h-4 w-4 mr-2" /> Kirim ke WhatsApp</Button>
                    <Button onClick={load} variant="outline" className="rounded-full" data-testid="musyawarah-refresh"><RefreshCw className="h-4 w-4 mr-2" /> Muat Ulang</Button>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5" data-testid="musyawarah-list">
                <div className="flex items-center justify-between mb-3">
                    <p className="tick-label text-muted-foreground">Hasil Musyawarah {kindLabel} ({notes.length})</p>
                    <span className="text-xs text-muted-foreground">{label}</span>
                </div>
                {loading ? <TableSkeleton rows={6} cols={6} />
                    : notes.length === 0 ? <EmptyState compact icon={Notebook} title="Belum ada catatan musyawarah" description="Catatan musyawarah akan tampil di sini setelah dibuat." testId="musyawarah-empty" />
                    : (
                        <div className="space-y-3 max-h-[560px] overflow-auto">
                            {notes.map((n) => (
                                <div key={n.id} className="rounded-xl border border-border p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-semibold">{n.title || '(tanpa judul)'}</p>
                                        <span className="text-xs font-mono text-muted-foreground">{n.date}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">Oleh: {n.created_by_name || '-'}</p>
                                    {n.content && <p className="text-sm mt-2 whitespace-pre-wrap line-clamp-4 text-foreground/90">{n.content}</p>}
                                </div>
                            ))}
                        </div>
                    )}
            </div>
        </div>
    );
}
