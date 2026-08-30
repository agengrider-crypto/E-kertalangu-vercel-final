import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ScanLine, Trash2, MessageCircle, Users, MapPin, Save, Search, ShieldAlert, Share2, BookOpen, User as UserIcon, CheckCircle2, RotateCcw, Info, ClipboardList, Pencil, UserX } from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QRCodeCanvas } from 'qrcode.react';
import QRScanner from '@/components/QRScanner';
import QuickAttendance from '@/components/QuickAttendance';
import WhatsAppSender from '@/components/WhatsAppSender';
import PhotoAlbum from '@/components/PhotoAlbum';
import RotatingQrDisplay from '@/components/RotatingQrDisplay';
import { ATTENDANCE, ACTIVITIES } from '@/constants/testIds/app';
import { activityStatus, StatusBadge } from '@/lib/activityStatus';
import { toast } from 'sonner';

function timeOptions() {
    const arr = [];
    for (let h = 0; h < 24; h++)
        for (let m = 0; m < 60; m += 10)
            arr.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    return arr;
}

function ManualAttendance({ open, onClose, activityId, onDone }) {
    const [participants, setParticipants] = useState([]);
    const [participantId, setParticipantId] = useState('');
    const [status, setStatus] = useState('hadir');
    const [timeIn, setTimeIn] = useState('19:30');
    const [note, setNote] = useState('');
    const [q, setQ] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        api.get('/participants', { params: q ? { q } : {} }).then(({ data }) => setParticipants(data.items));
    }, [q, open]);

    const submit = async () => {
        if (!participantId) { toast.error('Pilih peserta'); return; }
        setBusy(true);
        try {
            await api.post('/attendance/manual', { activity_id: activityId, participant_id: participantId, status, time_in: timeIn, note });
            toast.success('Absensi dicatat');
            onDone();
            onClose();
        } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-display">Absensi Manual</DialogTitle></DialogHeader>
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari peserta (ketik 2 huruf)…" className="pl-10 h-11" />
                    </div>
                    <Select value={participantId} onValueChange={setParticipantId}>
                        <SelectTrigger data-testid={ATTENDANCE.manualParticipant} className="h-11"><SelectValue placeholder="Pilih peserta…" /></SelectTrigger>
                        <SelectContent className="max-h-72">
                            {participants.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name} <span className="text-muted-foreground font-mono ml-2">{p.code}</span></SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="tick-label">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger data-testid={ATTENDANCE.manualStatus} className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hadir">Hadir</SelectItem>
                                    <SelectItem value="izin">Izin</SelectItem>
                                    <SelectItem value="alpha">Alpha</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="tick-label">Waktu (WITA)</Label>
                            <Select value={timeIn} onValueChange={setTimeIn} disabled={status !== 'hadir'}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-72">
                                    {timeOptions().map((t) => <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="tick-label">Catatan</Label>
                        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opsional…" />
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
                    <Button data-testid={ATTENDANCE.manualSubmit} disabled={busy} onClick={submit} className="rounded-full">Simpan</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SecretAllowDialog({ open, onClose, activityId, initial }) {
    const [participants, setParticipants] = useState([]);
    const [ids, setIds] = useState(initial || []);
    useEffect(() => {
        if (!open) return;
        api.get('/participants').then(({ data }) => setParticipants(data.items.filter((p) => p.is_secret_tag)));
        setIds(initial || []);
    }, [open, initial]);
    const toggle = (id) => setIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
    const save = async () => {
        try {
            await api.post(`/activities/${activityId}/secret-allow`, { participant_ids: ids });
            toast.success('Undangan rahasia disimpan');
            onClose();
        } catch (e) { toast.error(formatApiError(e)); }
    };
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-display">Undangan Rahasia</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Hanya peserta bertag rahasia yang dapat dipilih.</p>
                <div className="max-h-80 overflow-auto divide-y divide-border">
                    {participants.length === 0 && <p className="text-sm text-muted-foreground py-4">Belum ada peserta bertag rahasia. Aktifkan tag di halaman peserta.</p>}
                    {participants.map((p) => (
                        <label key={p.id} className="flex items-center justify-between py-2.5 cursor-pointer">
                            <div>
                                <p className="font-medium text-sm">{p.name}</p>
                                <p className="font-mono text-xs text-muted-foreground">{p.code}</p>
                            </div>
                            <Switch checked={ids.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                        </label>
                    ))}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
                    <Button onClick={save} className="rounded-full">Simpan</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const EDIT_TYPES = [
    { v: 'pengajian_rutin', label: 'Pengajian Rutin' },
    { v: 'pengajian_khusus', label: 'Pengajian Khusus' },
    { v: 'asad', label: 'Asad' },
];

function EditActivityDialog({ open, onClose, activity, onDone }) {
    const [form, setForm] = useState({
        name: activity.name || '', type: activity.type || 'pengajian_rutin',
        date: activity.date || '', start_time: activity.start_time || '19:30', end_time: activity.end_time || '21:00',
        pengajar: activity.pengajar || '', materi_progress: activity.materi_progress || '', notes: activity.notes || '',
    });
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await api.patch(`/activities/${activity.id}`, form);
            toast.success('Kegiatan diperbarui.');
            onDone();
            onClose();
        } catch (e) { toast.error(formatApiError(e)); } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-3 border-b border-border"><DialogTitle className="font-display">Edit Kegiatan</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 overflow-y-auto px-6 py-4 flex-1">
                    <div className="col-span-2 space-y-2">
                        <Label className="tick-label">Nama Kegiatan</Label>
                        <Input data-testid="edit-activity-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Jenis</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>{EDIT_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Tanggal</Label>
                        <Input type="date" data-testid="edit-activity-date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-11" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Jam Mulai</Label>
                        <Select value={form.start_time} onValueChange={(v) => setForm({ ...form, start_time: v })}>
                            <SelectTrigger className="h-11 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-72">{timeOptions().map((t) => <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Jam Selesai</Label>
                        <Select value={form.end_time} onValueChange={(v) => setForm({ ...form, end_time: v })}>
                            <SelectTrigger className="h-11 w-32"><SelectValue /></SelectTrigger>
                            <SelectContent className="max-h-72">{timeOptions().map((t) => <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Pengisi / Pengajar</Label>
                        <Input data-testid="edit-activity-pengajar" value={form.pengajar} onChange={(e) => setForm({ ...form, pengajar: e.target.value })} className="h-11" placeholder="Contoh: Ust. Angga" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Materi (Sampai Mana)</Label>
                        <Input value={form.materi_progress} onChange={(e) => setForm({ ...form, materi_progress: e.target.value })} className="h-11" />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label className="tick-label">Catatan</Label>
                        <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
                    <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
                    <Button data-testid="edit-activity-save" disabled={saving || !form.name.trim()} onClick={save} className="rounded-full">
                        {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function ActivityDetail() {
    const { aid } = useParams();
    const { user } = useAuth();
    const confirm = useConfirm();
    const canEdit = ['admin', 'pengurus'].includes(user.role);
    const [a, setA] = useState(null);
    const [rows, setRows] = useState([]);
    const [absent, setAbsent] = useState([]);
    const [scan, setScan] = useState(false);
    const [manual, setManual] = useState(false);
    const [wa, setWa] = useState(false);
    const [waTargets, setWaTargets] = useState([]);
    const [secret, setSecret] = useState(false);
    const [edit, setEdit] = useState(false);

    const load = async () => {
        try {
            const [av, atd] = await Promise.all([
                api.get(`/activities/${aid}`),
                api.get(`/attendance/by-activity/${aid}`),
            ]);
            setA(av.data);
            setRows(atd.data.items);
            const present = new Set(atd.data.items.map((r) => r.participant_id));
            setAbsent(atd.data.all_participants.filter((p) => !present.has(p.id)));
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); }, [aid]);

    if (!a) return <div className="text-muted-foreground">Memuat…</div>;

    const del = async () => {
        if (!(await confirm({ title: 'Hapus Kegiatan', description: 'Hapus kegiatan ini? Data absensi terkait akan ikut terpengaruh.', confirmText: 'Hapus' }))) return;
        try {
            await api.delete(`/activities/${aid}`);
            toast.success('Kegiatan dihapus');
            window.history.back();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const remind = () => {
        const list = absent.filter((p) => p.phone).slice(0, 30);
        setWaTargets(list);
        setWa(true);
    };

    const status = activityStatus(a);
    const locked = status === 'selesai';

    const finishActivity = async () => {
        if (!(await confirm({ title: 'Selesaikan Kegiatan', description: 'Apakah Anda yakin ingin mengakhiri kegiatan ini? QR, Quick Attendance, dan Self Check-In akan ditutup. Rekap tetap tersedia.', confirmText: 'Selesaikan', danger: false }))) return;
        try {
            await api.patch(`/activities/${aid}`, { manual_finished: true });
            toast.success('Kegiatan ditandai selesai.');
            await load();
        } catch (e) { toast.error(formatApiError(e)); return; }
        // Tawarkan Auto-Alpha untuk peserta yang belum absen
        if (await confirm({ title: 'Tandai Sisa Peserta Alpha?', description: 'Tandai semua peserta aktif yang BELUM absen sebagai Alpha sekarang? Absensi yang sudah ada tidak diubah.', confirmText: 'Ya, Tandai Alpha', cancelText: 'Nanti Saja', danger: false })) {
            try {
                const { data } = await api.post(`/activities/${aid}/mark-remaining-alpha`);
                toast.success(`${data.count} peserta ditandai Alpha.`);
                load();
            } catch (e) { toast.error(formatApiError(e)); }
        }
    };

    const reopenActivity = async () => {
        if (!(await confirm({ title: 'Buka Kembali Kegiatan', description: 'Yakin membuka kembali kegiatan? Absensi akan aktif lagi.', confirmText: 'Buka Kembali', danger: false }))) return;
        try {
            await api.patch(`/activities/${aid}`, { manual_finished: false });
            toast.success('Kegiatan dibuka kembali.');
            load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const markAllAlpha = async () => {
        if (!(await confirm({ title: 'Tandai Semua Alpha', description: 'Semua peserta aktif yang BELUM absen akan ditandai Alpha. Absensi yang sudah ada tidak diubah. Lanjutkan?', confirmText: 'Tandai Alpha', danger: false }))) return;
        try {
            const { data } = await api.post(`/activities/${aid}/mark-remaining-alpha`);
            toast.success(`${data.count} peserta ditandai Alpha.`);
            load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const createShare = async () => {
        try {
            const { data } = await api.post('/share/attendance', { kind: 'activity', activity_id: aid, ttl_hours: 168 });
            const url = `${window.location.origin}/share/${data.token}`;
            await navigator.clipboard.writeText(url).catch(() => {});
            const text = encodeURIComponent(`*Laporan Kegiatan Rutin*\n*${a.name}* (${a.date})\n\nLihat laporan lengkap (tanpa login):\n${url}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
            toast.success('Link laporan dibuat & disalin');
        } catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <Link to="/app/activities" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Kembali</Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <p className="tick-label text-muted-foreground">{a.code} · {a.type.replace(/_/g, ' ')}</p>
                        <StatusBadge status={status} testId={ATTENDANCE.statusBadge} />
                        {a.is_secret && (
                            <span className="text-[10px] uppercase tracking-widest border border-dashed border-accent text-accent px-2 py-1 rounded-full inline-flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3" /> Rahasia
                            </span>
                        )}
                    </div>
                    <h1 className="font-display font-black text-3xl sm:text-4xl mt-1">{a.name}</h1>
                    <p className="mt-2 font-mono text-sm text-muted-foreground">{a.date} · {a.start_time}–{a.end_time} WITA</p>
                </div>
                {user.role === 'admin' && (
                    <div className="flex gap-2">
                        {locked ? (
                            <Button data-testid={ATTENDANCE.reopenBtn} onClick={reopenActivity} variant="outline" className="rounded-full">
                                <RotateCcw className="h-4 w-4 mr-2" /> Buka Kembali Kegiatan
                            </Button>
                        ) : (
                            <Button data-testid={ATTENDANCE.finishBtn} onClick={finishActivity} className="rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Selesaikan Kegiatan
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <Tabs defaultValue={canEdit && !locked ? 'quick' : 'info'} className="w-full">
                <TabsList className="h-auto p-1 rounded-full">
                    <TabsTrigger data-testid={ATTENDANCE.tabInfo} value="info" className="rounded-full px-4 py-2"><Info className="h-4 w-4 mr-2" /> Informasi</TabsTrigger>
                    {canEdit && <TabsTrigger data-testid={ATTENDANCE.tabQuick} value="quick" className="rounded-full px-4 py-2"><Users className="h-4 w-4 mr-2" /> Quick Attendance</TabsTrigger>}
                    <TabsTrigger data-testid={ATTENDANCE.tabRekap} value="rekap" className="rounded-full px-4 py-2"><ClipboardList className="h-4 w-4 mr-2" /> Rekap</TabsTrigger>
                </TabsList>

                {/* ---- Informasi ---- */}
                <TabsContent value="info" className="mt-5 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
                            {a.notes && <p className="text-sm">{a.notes}</p>}
                            {(a.pengajar || a.materi_progress) && (
                                <div className="mt-3 rounded-xl bg-muted p-3 space-y-1 text-sm">
                                    {a.pengajar && <p className="flex items-center gap-2"><UserIcon className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Pengisi:</span> <span className="font-medium">{a.pengajar}</span></p>}
                                    {a.materi_progress && <p className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-muted-foreground" /> <span className="text-muted-foreground">Materi:</span> <span className="font-medium">{a.materi_progress}</span></p>}
                                </div>
                            )}
                            {canEdit && (
                                <div className="flex flex-wrap gap-2 mt-6">
                                    <Button data-testid="activity-edit-btn" onClick={() => setEdit(true)} variant="outline" className="rounded-full">
                                        <Pencil className="h-4 w-4 mr-2" /> Edit Kegiatan
                                    </Button>
                                    <Button data-testid={ATTENDANCE.scanBtn} disabled={locked} onClick={() => setScan(true)} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-40">
                                        <ScanLine className="h-4 w-4 mr-2" /> Scan QR
                                    </Button>
                                    <Button onClick={remind} variant="outline" className="rounded-full">
                                        <MessageCircle className="h-4 w-4 mr-2" /> Kirim Reminder
                                    </Button>
                                    <Button onClick={createShare} variant="outline" className="rounded-full">
                                        <Share2 className="h-4 w-4 mr-2" /> Laporan Kegiatan Rutin
                                    </Button>
                                    {a.is_secret && (
                                        <Button onClick={() => setSecret(true)} variant="outline" className="rounded-full">
                                            <ShieldAlert className="h-4 w-4 mr-2" /> Atur Undangan Rahasia
                                        </Button>
                                    )}
                                    {user.role === 'admin' && (
                                        <Button onClick={del} variant="outline" className="rounded-full text-destructive border-destructive/30">
                                            <Trash2 className="h-4 w-4 mr-2" /> Hapus
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
                            <div className="text-center">
                                <p className="tick-label text-muted-foreground">QR Statis Kegiatan</p>
                                <div className={`mt-3 mx-auto w-56 h-56 bg-white rounded-2xl grid place-items-center p-3 shadow-sm relative ${locked ? 'opacity-40' : ''}`}>
                                    {a.code && (
                                        <QRCodeCanvas value={`${window.location.origin}/a/${a.code}`} size={200} includeMargin level="M" />
                                    )}
                                    {locked && <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-destructive bg-white/60 rounded-2xl">Kegiatan Selesai</span>}
                                </div>
                                <p className="font-mono text-[11px] text-muted-foreground mt-3 break-all">{`${window.location.origin}/a/${a.code}`}</p>
                                <p className="text-xs text-muted-foreground mt-1">Scan dengan kamera HP mana pun untuk absen mandiri.</p>
                            </div>
                            {canEdit && !locked && (
                                <div className="pt-4 border-t border-border">
                                    <RotatingQrDisplay activityId={aid} />
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5">
                        <PhotoAlbum activityId={aid} canEdit={canEdit} />
                    </div>
                </TabsContent>

                {/* ---- Quick Attendance ---- */}
                {canEdit && (
                    <TabsContent value="quick" className="mt-5 space-y-4">
                        <div className="flex justify-end">
                            <Button data-testid="mark-all-alpha-btn" onClick={markAllAlpha} variant="outline" className="rounded-full text-destructive border-destructive/30">
                                <UserX className="h-4 w-4 mr-2" /> Tandai Semua Alpha
                            </Button>
                        </div>
                        <QuickAttendance activityId={aid} rows={rows} locked={locked} onChanged={load} />
                    </TabsContent>
                )}

                {/* ---- Rekap ---- */}
                <TabsContent value="rekap" className="mt-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="tick-label text-muted-foreground">Hadir</p>
                            <p className="font-display font-black text-4xl mt-1 text-success">{rows.filter((r) => r.status === 'hadir').length}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="tick-label text-muted-foreground">Izin</p>
                            <p className="font-display font-black text-4xl mt-1 text-warning">{rows.filter((r) => r.status === 'izin').length}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card p-4">
                            <p className="tick-label text-muted-foreground">Alpha</p>
                            <p className="font-display font-black text-4xl mt-1 text-destructive">{rows.filter((r) => r.status === 'alpha').length}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card overflow-hidden">
                        <p className="tick-label text-muted-foreground p-4 border-b border-border">Daftar Absensi ({rows.length})</p>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/40">
                                    <tr className="text-left">
                                        <th className="px-4 py-3 tick-label text-muted-foreground">Peserta</th>
                                        <th className="px-4 py-3 tick-label text-muted-foreground">Status</th>
                                        <th className="px-4 py-3 tick-label text-muted-foreground">Waktu</th>
                                        <th className="px-4 py-3 tick-label text-muted-foreground">Metode</th>
                                        <th className="px-4 py-3 tick-label text-muted-foreground">Oleh</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr><td colSpan={5} className="px-4 py-6 text-muted-foreground text-center">Belum ada absensi.</td></tr>
                                    )}
                                    {rows.map((r) => (
                                        <tr key={r.id} data-testid={ATTENDANCE.row} className="border-t border-border">
                                            <td className="px-4 py-3"><span className="font-medium">{r.participant_name}</span> <span className="text-muted-foreground font-mono ml-1">{r.participant_code}</span></td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${r.status === 'hadir' ? 'bg-success/10 text-success border-success/20' : r.status === 'izin' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>{r.status}</span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">{r.time_in || '—'}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{r.method}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{r.recorded_by_name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {scan && <QRScanner open={scan} onClose={() => setScan(false)} activityId={aid} onScanned={load} />}
            {wa && <WhatsAppSender open={wa} onClose={() => setWa(false)} defaultTemplate="reminder" recipients={waTargets} activityName={a.name} />}
            {secret && <SecretAllowDialog open={secret} onClose={() => setSecret(false)} activityId={aid} initial={a.secret_allow || []} />}
            {edit && <EditActivityDialog open={edit} onClose={() => setEdit(false)} activity={a} onDone={load} />}
        </div>
    );
}
