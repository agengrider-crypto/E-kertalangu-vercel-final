import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Check } from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ATTENDANCE } from '@/constants/testIds/app';
import { toast } from 'sonner';

const STATUS_BTNS = [
    { v: 'hadir', label: 'Hadir', testId: ATTENDANCE.quickHadir, cls: 'bg-success/10 text-success border-success/30 hover:bg-success/20', active: 'bg-success text-white border-success' },
    { v: 'izin', label: 'Izin', testId: ATTENDANCE.quickIzin, cls: 'bg-warning/10 text-warning border-warning/40 hover:bg-warning/20', active: 'bg-warning text-white border-warning' },
    { v: 'alpha', label: 'Alpha', testId: ATTENDANCE.quickAlpha, cls: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20', active: 'bg-destructive text-white border-destructive' },
];

function AccountBadge({ p }) {
    if (p.status === 'non-aktif') return <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> Nonaktif</span>;
    if (p.account_status === 'belum_aktivasi') return <span className="inline-flex items-center gap-1 text-[11px] text-warning"><span className="h-1.5 w-1.5 rounded-full bg-warning" /> Belum Aktivasi</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] text-success"><span className="h-1.5 w-1.5 rounded-full bg-success" /> Aktif</span>;
}

export default function QuickAttendance({ activityId, rows, locked, onChanged }) {
    const [participants, setParticipants] = useState([]);
    const [q, setQ] = useState('');
    const [debounced, setDebounced] = useState('');
    const [showBelum, setShowBelum] = useState(false);
    const [showNonaktif, setShowNonaktif] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const searchRef = useRef(null);

    useEffect(() => {
        api.get('/participants').then(({ data }) => setParticipants(data.items)).catch((e) => toast.error(formatApiError(e)));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => setDebounced(q.trim()), 300);
        return () => clearTimeout(t);
    }, [q]);

    useEffect(() => {
        const t = setTimeout(() => searchRef.current?.focus(), 150);
        return () => clearTimeout(t);
    }, []);

    const attMap = useMemo(() => {
        const m = {};
        (rows || []).forEach((r) => { m[r.participant_id] = r; });
        return m;
    }, [rows]);

    const filtered = useMemo(() => {
        let list = participants.filter((p) => {
            if (p.status === 'non-aktif') return showNonaktif;
            if (p.account_status === 'belum_aktivasi') return showBelum;
            return true; // aktif
        });
        if (debounced.length >= 2) {
            const s = debounced.toLowerCase();
            list = list.filter((p) => (p.name || '').toLowerCase().includes(s) || (p.code || '').toLowerCase().includes(s));
        }
        return list.slice().sort((a, b) => {
            const aa = attMap[a.id] ? 1 : 0;
            const bb = attMap[b.id] ? 1 : 0;
            if (aa !== bb) return aa - bb; // belum absen dulu
            return (a.name || '').localeCompare(b.name || '');
        });
    }, [participants, debounced, showBelum, showNonaktif, attMap]);

    const counts = useMemo(() => {
        const c = { hadir: 0, izin: 0, alpha: 0 };
        (rows || []).forEach((r) => { if (c[r.status] !== undefined) c[r.status] += 1; });
        return c;
    }, [rows]);

    const mark = async (p, status) => {
        if (locked) { toast.error('Kegiatan sudah selesai. Absensi ditutup.'); return; }
        const cur = attMap[p.id];
        if (cur && cur.status === status) {
            toast.info(`${p.name} sudah tercatat "${status}" pada kegiatan ini.`);
            return;
        }
        setBusyId(p.id);
        try {
            await api.post('/attendance/manual', { activity_id: activityId, participant_id: p.id, status });
            toast.success('Absensi berhasil disimpan.');
            await onChanged();
        } catch (e) { toast.error(formatApiError(e)); } finally { setBusyId(null); }
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="font-display font-black text-2xl text-success" data-testid="quick-count-hadir">{counts.hadir}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Hadir</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="font-display font-black text-2xl text-warning">{counts.izin}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Izin</p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="font-display font-black text-2xl text-destructive">{counts.alpha}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-widest">Alpha</p>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    ref={searchRef}
                    data-testid={ATTENDANCE.quickSearch}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari peserta (ketik minimal 2 huruf)…"
                    className="pl-10 h-12 rounded-xl"
                />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" data-testid="quick-filter-belum" checked={showBelum} onChange={(e) => setShowBelum(e.target.checked)} className="h-4 w-4 rounded" />
                    Tampilkan Belum Aktivasi
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" data-testid="quick-filter-nonaktif" checked={showNonaktif} onChange={(e) => setShowNonaktif(e.target.checked)} className="h-4 w-4 rounded" />
                    Tampilkan Nonaktif
                </label>
            </div>

            {locked && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm px-4 py-3">
                    Kegiatan sudah selesai. Absensi ditutup — buka kembali kegiatan untuk mengubah.
                </div>
            )}

            <div className="space-y-2">
                {filtered.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Tidak ada peserta yang cocok.</p>}
                {filtered.map((p) => {
                    const att = attMap[p.id];
                    const done = !!att;
                    return (
                        <div
                            key={p.id}
                            data-testid={ATTENDANCE.quickCard}
                            className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${done && att.status === 'hadir' ? 'bg-success/5 border-success/30' : done && att.status === 'izin' ? 'bg-warning/5 border-warning/30' : done ? 'bg-destructive/5 border-destructive/30' : 'bg-card border-border'}`}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{p.name}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                                    <AccountBadge p={p} />
                                </div>
                                {done && (
                                    <p className="mt-1 text-xs font-medium inline-flex items-center gap-1.5">
                                        <Check className="h-3.5 w-3.5" />
                                        <span className="uppercase">{att.status}</span>
                                        {att.status === 'hadir' && att.time_in && <span className="text-muted-foreground font-mono">· {att.time_in} WITA</span>}
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                {STATUS_BTNS.map((b) => {
                                    const isActive = att && att.status === b.v;
                                    return (
                                        <button
                                            key={b.v}
                                            data-testid={`${b.testId}-${p.id}`}
                                            disabled={locked || busyId === p.id}
                                            onClick={() => mark(p, b.v)}
                                            className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isActive ? b.active : b.cls}`}
                                        >
                                            {b.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
