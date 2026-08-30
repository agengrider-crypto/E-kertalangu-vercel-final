import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, CalendarDays, ArrowUpRight, MapPin, Lock, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ACTIVITIES } from '@/constants/testIds/app';
import { activityStatus, StatusBadge } from '@/lib/activityStatus';
import { EmptyState } from '@/components/EmptyState';
import { toast } from 'sonner';

const ACTIVITY_TYPES = [
    { v: 'pengajian_rutin', label: 'Pengajian Rutin' },
    { v: 'pengajian_khusus', label: 'Pengajian Khusus' },
    { v: 'asad', label: 'Asad' },
];

function timeOptions() {
    const arr = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 10) {
            arr.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return arr;
}

function TimePickerWITA({ value, onChange, id, testId }) {
    return (
        <div className="flex items-center gap-2">
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger id={id} data-testid={testId} className="h-11 w-32"><SelectValue placeholder="--:--" /></SelectTrigger>
                <SelectContent className="max-h-72">
                    {timeOptions().map((t) => <SelectItem key={t} value={t} className="font-mono">{t}</SelectItem>)}
                </SelectContent>
            </Select>
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">WITA</span>
        </div>
    );
}

function ActivityForm({ open, onClose, onDone }) {
    const [form, setForm] = useState({
        name: '', type: 'pengajian_rutin', date: new Date().toISOString().slice(0, 10),
        start_time: '19:30', end_time: '21:00', location: 'Kertalangu',
        gps_lat: '', gps_lng: '', radius_m: 100, is_outside: false, is_secret: false,
        pengajar: '', materi_progress: '', notes: '',
    });
    const [saving, setSaving] = useState(false);
    const [recurring, setRecurring] = useState(false);
    const [weeks, setWeeks] = useState(4);

    const submit = async () => {
        setSaving(true);
        try {
            const body = {
                ...form,
                gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : null,
                gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : null,
                radius_m: parseInt(form.radius_m) || 100,
            };
            if (recurring) {
                const { data } = await api.post('/activities/recurring', { base: body, weeks });
                toast.success(`${data.count} kegiatan berulang dibuat`);
            } else {
                await api.post('/activities', body);
                toast.success('Kegiatan dibuat');
            }
            onDone();
            onClose();
        } catch (e) {
            toast.error(formatApiError(e));
        } finally { setSaving(false); }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 pt-6 pb-3 border-b border-border"><DialogTitle className="font-display">Kegiatan Baru</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 overflow-y-auto px-6 py-4 flex-1">
                    <div className="col-span-2 space-y-2">
                        <Label className="tick-label">Nama Kegiatan</Label>
                        <Input data-testid={ACTIVITIES.formName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" placeholder="Pengajian Rutin Malam Ahad" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Jenis</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                            <SelectTrigger data-testid={ACTIVITIES.formType} className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {ACTIVITY_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Tanggal</Label>
                        <Input data-testid={ACTIVITIES.formDate} type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="h-11" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Jam Mulai</Label>
                        <TimePickerWITA testId={ACTIVITIES.formStart} value={form.start_time} onChange={(v) => setForm({ ...form, start_time: v })} />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Jam Selesai</Label>
                        <TimePickerWITA testId={ACTIVITIES.formEnd} value={form.end_time} onChange={(v) => setForm({ ...form, end_time: v })} />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Pengisi / Pengajar</Label>
                        <Input value={form.pengajar} onChange={(e) => setForm({ ...form, pengajar: e.target.value })} className="h-11" placeholder="Contoh: Ust. Angga" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Materi (Sampai Mana)</Label>
                        <Input value={form.materi_progress} onChange={(e) => setForm({ ...form, materi_progress: e.target.value })} className="h-11" placeholder="Al-Baqarah ayat 221" />
                    </div>
                    <div className="col-span-2 flex items-center justify-between rounded-xl border border-dashed border-accent/60 p-3">
                        <div>
                            <p className="font-medium text-sm">Undangan Khusus (Rahasia)</p>
                            <p className="text-xs text-muted-foreground">Hanya peserta bertag rahasia yang boleh melihat.</p>
                        </div>
                        <Switch checked={form.is_secret} onCheckedChange={(v) => setForm({ ...form, is_secret: v })} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label className="tick-label">Catatan</Label>
                        <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>
                    <div className="col-span-2 flex items-center justify-between rounded-xl border border-dashed border-primary/40 p-3">
                        <div>
                            <p className="font-medium text-sm">Kegiatan Berulang (Weekly)</p>
                            <p className="text-xs text-muted-foreground">Otomatis buat kegiatan yang sama untuk beberapa minggu ke depan.</p>
                        </div>
                        <Switch checked={recurring} onCheckedChange={setRecurring} />
                    </div>
                    {recurring && (
                        <div className="col-span-2 space-y-2">
                            <Label className="tick-label">Berapa Minggu?</Label>
                            <Input type="number" min="1" max="52" value={weeks} onChange={(e) => setWeeks(parseInt(e.target.value) || 1)} className="h-11 w-32 font-mono" />
                            <p className="text-xs text-muted-foreground">Akan membuat {weeks} kegiatan (mulai dari tanggal di atas, +7 hari setiap minggu).</p>
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
                    <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
                    <Button data-testid={ACTIVITIES.formSubmit} disabled={saving || !form.name.trim()} onClick={submit} className="rounded-full">
                        {saving ? 'Menyimpan…' : 'Buat Kegiatan'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function CalendarView({ items }) {
    const today = new Date();
    const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [selected, setSelected] = useState(today.toISOString().slice(0, 10));

    const byDate = useMemo(() => {
        const m = {};
        items.forEach((a) => {
            if (!a.date) return;
            (m[a.date] = m[a.date] || []).push(a);
        });
        return m;
    }, [items]);

    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    // Monday-based leading offset
    const lead = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }

    const selectedActs = byDate[selected] || [];
    const todayStr = today.toISOString().slice(0, 10);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display font-bold text-xl">{MONTHS[month]} {year}</h3>
                    <div className="flex gap-1">
                        <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="h-9 w-9 rounded-full border border-border grid place-items-center hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
                        <button onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))} className="h-9 px-3 rounded-full border border-border text-xs hover:bg-muted">Hari ini</button>
                        <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="h-9 w-9 rounded-full border border-border grid place-items-center hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center">
                    {WEEKDAYS.map((w) => <div key={w} className="text-[10px] uppercase tracking-widest text-muted-foreground py-1">{w}</div>)}
                    {cells.map((dateStr, i) => {
                        if (!dateStr) return <div key={`b${i}`} />;
                        const day = parseInt(dateStr.slice(-2), 10);
                        const acts = byDate[dateStr] || [];
                        const isSel = dateStr === selected;
                        const isToday = dateStr === todayStr;
                        return (
                            <button
                                key={dateStr}
                                onClick={() => setSelected(dateStr)}
                                className={`aspect-square rounded-xl border text-sm flex flex-col items-center justify-center gap-1 transition-colors ${
                                    isSel ? 'bg-primary text-primary-foreground border-primary' : isToday ? 'border-accent bg-accent/10' : 'border-transparent hover:bg-muted'
                                }`}
                            >
                                <span className={isToday && !isSel ? 'font-bold text-accent' : ''}>{day}</span>
                                {acts.length > 0 && (
                                    <span className={`h-1.5 w-1.5 rounded-full ${isSel ? 'bg-primary-foreground' : 'bg-accent'}`} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
                <p className="tick-label text-muted-foreground">Kegiatan pada</p>
                <h4 className="font-display font-bold text-lg mt-1">{selected}</h4>
                <div className="mt-4 space-y-2">
                    {selectedActs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Tidak ada kegiatan di tanggal ini.</p>
                    ) : selectedActs.map((a) => (
                        <Link key={a.id} to={`/app/activities/${a.id}`} className="block rounded-xl border border-border p-3 hover:bg-muted transition-colors">
                            <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{a.name}</p>
                                {a.is_secret && <Lock className="h-3.5 w-3.5 text-accent" />}
                            </div>
                            <p className="font-mono text-xs text-muted-foreground mt-1">{a.start_time} – {a.end_time} WITA</p>
                            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1"><MapPin className="h-3 w-3" /> {a.location}</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Activities() {
    const { user } = useAuth();
    const canEdit = ['admin', 'pengurus'].includes(user.role);
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [type, setType] = useState('all');
    const [formOpen, setFormOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list');

    const load = async () => {
        setLoading(true);
        try {
            const params = {};
            if (q) params.q = q;
            if (type !== 'all') params.type = type;
            const { data } = await api.get('/activities', { params });
            setItems(data.items);
        } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
    };

    useEffect(() => {
        const t = setTimeout(load, 200);
        return () => clearTimeout(t);
        // eslint-disable-next-line
    }, [q, type]);

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <p className="tick-label text-muted-foreground">Jadwal Pengajian</p>
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Kegiatan</h1>
                    <p className="text-muted-foreground mt-2">{items.length} tercatat</p>
                </div>
                {canEdit && (
                    <Button data-testid={ACTIVITIES.addBtn} onClick={() => setFormOpen(true)} className="rounded-full h-11">
                        <Plus className="h-4 w-4 mr-2" /> Kegiatan Baru
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-3 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama kegiatan…" className="pl-10 h-12 rounded-xl bg-card" />
                </div>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="h-12 rounded-xl bg-card"><SelectValue placeholder="Jenis" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Semua Jenis</SelectItem>
                        {ACTIVITY_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex items-center rounded-full bg-muted p-1 gap-1">
                    <button
                        data-testid="view-list"
                        onClick={() => setView('list')}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <List className="h-4 w-4" /> List Kegiatan
                    </button>
                    <button
                        data-testid="view-calendar"
                        onClick={() => setView('calendar')}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium rounded-full px-4 py-2 transition-colors ${view === 'calendar' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        <CalendarDays className="h-4 w-4" /> Kalender Kegiatan
                    </button>
                </div>
            </div>

            {view === 'calendar' ? (
                <CalendarView items={items} />
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <p className="text-muted-foreground">Memuat…</p> : items.length === 0 ? (
                    <div className="col-span-full">
                        <EmptyState
                            icon={CalendarDays}
                            title="Belum ada kegiatan"
                            description="Buat kegiatan pertama untuk mulai mencatat kehadiran jamaah."
                            actionLabel={canEdit ? 'Kegiatan Baru' : undefined}
                            onAction={canEdit ? () => setFormOpen(true) : undefined}
                            actionTestId="activities-add-empty"
                            testId="activities-empty"
                        />
                    </div>
                ) : items.map((a) => (
                    <Link key={a.id} to={`/app/activities/${a.id}`} data-testid={ACTIVITIES.row} className="rounded-2xl border border-border bg-card p-5 hover:-translate-y-0.5 transition-transform group">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono tracking-widest uppercase text-muted-foreground">{a.code}</span>
                            <div className="flex items-center gap-2">
                                <StatusBadge status={activityStatus(a)} testId={`${ACTIVITIES.row}-status`} />
                                {a.is_secret && <Lock className="h-3.5 w-3.5 text-accent" />}
                            </div>
                        </div>
                        <h3 className="mt-3 font-display font-bold text-xl leading-tight">{a.name}</h3>
                        <p className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{a.type.replace(/_/g, ' ')}</p>
                        <div className="mt-4 text-sm space-y-1">
                            <p className="font-mono">{a.date}</p>
                            <p className="font-mono text-muted-foreground">{a.start_time} – {a.end_time} WITA</p>
                            <p className="flex items-center gap-1 text-muted-foreground text-xs mt-2">
                                <MapPin className="h-3 w-3" /> {a.location}
                            </p>
                        </div>
                        <div className="mt-4 flex items-center gap-1 text-xs text-accent">
                            Detail & Absen <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>
            )}

            <ActivityForm open={formOpen} onClose={() => setFormOpen(false)} onDone={load} />
        </div>
    );
}
