import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users as UsersIcon, ShieldAlert, ArrowUpRight, X, Upload, FileSpreadsheet, Trash2, Archive, KeyRound } from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { TableSkeleton } from '@/components/skeletons';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { PARTICIPANTS } from '@/constants/testIds/app';
import { toast } from 'sonner';

function ParticipantForm({ open, onClose, onCreated }) {
    const [form, setForm] = useState({
        name: '', gender: 'L', birth_place: '', birth_date: '', phone: '', email: '', education: '', status: 'aktif', is_secret_tag: false, duplicate_action: 'append',
    });
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        try {
            await api.post('/participants', form);
            toast.success('Peserta berhasil ditambahkan');
            onCreated();
            onClose();
            setForm({ name: '', gender: 'L', birth_place: '', birth_date: '', phone: '', email: '', education: '', status: 'aktif', is_secret_tag: false, duplicate_action: 'append' });
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle className="font-display">Tambah Peserta</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                        <Label className="tick-label">Nama Lengkap</Label>
                        <Input data-testid={PARTICIPANTS.formName} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: Ahmad Fauzi" className="h-11" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Jenis Kelamin</Label>
                        <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                            <SelectTrigger data-testid={PARTICIPANTS.formGender} className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="L">Laki-laki</SelectItem>
                                <SelectItem value="P">Perempuan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="aktif">Aktif</SelectItem>
                                <SelectItem value="non-aktif">Non-Aktif</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Tempat Lahir</Label>
                        <Input value={form.birth_place} onChange={(e) => setForm({ ...form, birth_place: e.target.value })} className="h-11" placeholder="Denpasar" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Tanggal Lahir</Label>
                        <Input type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} className="h-11" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">No. HP</Label>
                        <Input data-testid={PARTICIPANTS.formPhone} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" placeholder="0812…" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Email</Label>
                        <Input data-testid={PARTICIPANTS.formEmail} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label className="tick-label">Pendidikan</Label>
                        <Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} className="h-11" placeholder="Contoh: S1 Teknik" />
                    </div>
                    <div className="col-span-2 flex items-center justify-between rounded-xl border border-border p-3">
                        <div>
                            <p className="font-medium text-sm">Tag Rahasia (Undangan Khusus)</p>
                            <p className="text-xs text-muted-foreground">Peserta ini bisa dijadikan target undangan rahasia.</p>
                        </div>
                        <Switch data-testid={PARTICIPANTS.secretToggle} checked={form.is_secret_tag} onCheckedChange={(v) => setForm({ ...form, is_secret_tag: v })} />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label className="tick-label">Jika Nama Sudah Ada</Label>
                        <Select value={form.duplicate_action} onValueChange={(v) => setForm({ ...form, duplicate_action: v })}>
                            <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="append">Tambahkan penanda (Nama (2), (3)…)</SelectItem>
                                <SelectItem value="allow">Izinkan nama sama persis</SelectItem>
                                <SelectItem value="reject">Tolak jika ada duplikat</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
                    <Button data-testid={PARTICIPANTS.formSubmit} disabled={saving || !form.name.trim()} onClick={submit} className="rounded-full">
                        {saving ? 'Menyimpan…' : 'Simpan'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function BulkForm({ open, onClose, onDone }) {
    const [text, setText] = useState('Nama;L/P;No HP;Email\nContoh: Ahmad;L;081234;ahmad@mail.com');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        setSaving(true);
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        // skip header if present
        const rows = lines.slice(1);
        const items = rows.map((r) => {
            const parts = r.split(/[;,\t]/).map((x) => x.trim());
            return {
                name: parts[0] || '',
                gender: (parts[1] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
                phone: parts[2] || '',
                email: parts[3] || '',
                birth_place: '', birth_date: '', education: '', status: 'aktif', is_secret_tag: false, duplicate_action: 'append',
            };
        }).filter((x) => x.name);
        if (!items.length) {
            toast.error('Tidak ada baris valid');
            setSaving(false);
            return;
        }
        try {
            const { data } = await api.post('/participants/bulk', items);
            const ok = data.results.filter((r) => r.ok).length;
            toast.success(`${ok} dari ${data.results.length} peserta berhasil ditambahkan`);
            onDone();
            onClose();
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle className="font-display">Tambah Peserta (Bulk)</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">Tempel data dengan pemisah <span className="font-mono">;</span> atau <span className="font-mono">,</span>. Header di baris pertama akan dilewati.</p>
                <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="font-mono text-xs" />
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} className="rounded-full">Batal</Button>
                    <Button disabled={saving} onClick={submit} className="rounded-full"><Upload className="h-4 w-4 mr-2" /> Impor</Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function Participants() {
    const { user } = useAuth();
    const confirm = useConfirm();
    const canEdit = ['admin', 'pengurus'].includes(user.role);
    const isAdmin = user.role === 'admin';
    const [items, setItems] = useState([]);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [formOpen, setFormOpen] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [tempPw, setTempPw] = useState(null);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const params = q && q.length >= 2 ? { q } : {};
            const { data } = await api.get('/participants', { params });
            setItems(data.items);
            setSelected(new Set());
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const t = setTimeout(load, q ? 200 : 0);
        return () => clearTimeout(t);
        // eslint-disable-next-line
    }, [q]);

    const toggleOne = (id) => {
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    };
    const allSelected = items.length > 0 && selected.size === items.length;
    const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((p) => p.id)));

    const archive = async (p) => {
        if (!(await confirm({
            title: 'Arsipkan Peserta',
            description: `Arsipkan peserta "${p.name}"? Peserta tidak akan muncul di daftar aktif, tidak bisa login, dan tidak bisa absensi. Data tetap tersimpan.`,
            confirmText: 'Arsipkan',
        }))) return;
        setBusy(true);
        try { await api.patch(`/participants/${p.id}/archive`); toast.success('Peserta diarsipkan'); load(); }
        catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
    };

    const resetPw = async (p) => {
        if (p.account_status !== 'aktif') { toast.error('Peserta belum memiliki akun (belum aktivasi)'); return; }
        if (!(await confirm({
            title: 'Reset Password',
            description: `Reset password untuk "${p.name}"? Password sementara baru akan dibuat.`,
            confirmText: 'Reset',
            danger: false,
        }))) return;
        setBusy(true);
        try {
            const { data } = await api.post(`/participants/${p.id}/reset-password`);
            setTempPw({ name: data.participant_name || p.name, pw: data.temp_password });
            toast.success('Password peserta berhasil diperbarui.');
        } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
    };

    const bulkDelete = async () => {
        if (selected.size === 0) return;
        if (!(await confirm({
            title: `Hapus ${selected.size} Peserta`,
            description: 'Apakah Anda yakin ingin menghapus data ini secara permanen? Tindakan ini tidak dapat dibatalkan.',
            confirmText: 'Hapus Permanen',
        }))) return;
        setBusy(true);
        try {
            const { data } = await api.post('/participants/bulk-delete', { ids: Array.from(selected) });
            toast.success(`${data.deleted} peserta dihapus permanen`);
            load();
        } catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                    <p className="tick-label text-muted-foreground">Data Jamaah</p>
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Peserta</h1>
                    <p className="text-muted-foreground mt-2">{items.length} aktif · Ketik minimal 2 huruf untuk pencarian cepat.</p>
                </div>
                {canEdit && (
                    <div className="flex gap-2 flex-wrap">
                        {isAdmin && (
                            <Link to="/app/archive">
                                <span className="inline-flex items-center rounded-full h-11 px-4 border border-border bg-background hover:bg-muted text-sm" data-testid="participants-archive-link">
                                    <Archive className="h-4 w-4 mr-2" /> Data Arsip
                                </span>
                            </Link>
                        )}
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const fd = new FormData();
                                    fd.append('file', f);
                                    try {
                                        const { data } = await api.post('/participants/import-xlsx', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                                        toast.success(`${data.count}/${data.total} peserta diimpor`);
                                        load();
                                    } catch (err) { toast.error(formatApiError(err)); }
                                    e.target.value = '';
                                }}
                            />
                            <span className="inline-flex items-center rounded-full h-11 px-4 border border-border bg-background hover:bg-muted text-sm">
                                <FileSpreadsheet className="h-4 w-4 mr-2" /> Import .xlsx
                            </span>
                        </label>
                        <Button data-testid={PARTICIPANTS.bulkBtn} onClick={() => setBulkOpen(true)} variant="outline" className="rounded-full h-11">
                            <Upload className="h-4 w-4 mr-2" /> Bulk
                        </Button>
                        <Button data-testid={PARTICIPANTS.addBtn} onClick={() => setFormOpen(true)} className="rounded-full h-11">
                            <Plus className="h-4 w-4 mr-2" /> Peserta Baru
                        </Button>
                    </div>
                )}
            </div>

            {tempPw && (
                <div className="rounded-2xl border border-success/40 bg-success/10 p-4 flex items-center justify-between gap-3 flex-wrap" data-testid="participant-temp-pw">
                    <div>
                        <p className="tick-label text-success">Password Sementara — {tempPw.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Salin & kirim ke peserta. Hanya tampil sekali; minta peserta segera mengganti setelah masuk.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="px-3 py-2 rounded-lg bg-card border border-border font-mono text-lg tracking-wider" data-testid="participant-temp-pw-value">{tempPw.pw}</code>
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => { navigator.clipboard?.writeText(tempPw.pw); toast.success('Disalin'); }}>Salin</Button>
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setTempPw(null)}>Tutup</Button>
                    </div>
                </div>
            )}

            {isAdmin && selected.size > 0 && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center justify-between gap-3">
                    <p className="text-sm">{selected.size} peserta dipilih</p>
                    <Button size="sm" disabled={busy} onClick={bulkDelete} className="rounded-full bg-destructive hover:bg-destructive/90 text-white" data-testid="bulk-delete-btn">
                        <Trash2 className="h-4 w-4 mr-2" /> Hapus Data Terpilih
                    </Button>
                </div>
            )}

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    data-testid={PARTICIPANTS.searchInput}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Cari nama, kode, HP, email…"
                    className="pl-10 h-12 rounded-xl bg-card"
                />
                {q && (
                    <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <TableSkeleton rows={6} cols={5} />
                ) : items.length === 0 ? (
                    q.trim() ? (
                        <EmptyState icon={UsersIcon} title="Tidak ada hasil" description={`Tidak ada peserta yang cocok dengan "${q}".`} testId="participants-empty" />
                    ) : (
                        <EmptyState
                            icon={UsersIcon}
                            title="Belum ada peserta"
                            description="Mulai dengan menambahkan peserta baru atau impor dari file."
                            actionLabel={canEdit ? 'Peserta Baru' : undefined}
                            onAction={canEdit ? () => setFormOpen(true) : undefined}
                            actionTestId={PARTICIPANTS.addBtn ? `${PARTICIPANTS.addBtn}-empty` : 'participants-add-empty'}
                            testId="participants-empty"
                        />
                    )
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-card sticky top-0 z-10 shadow-sm">
                                <tr className="text-left border-b border-border">
                                    {isAdmin && (
                                        <th className="px-4 py-3 w-10">
                                            <Checkbox checked={allSelected} onCheckedChange={toggleAll} data-testid="select-all-checkbox" />
                                        </th>
                                    )}
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Kode</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Nama</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Kelamin</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">HP</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Status</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Akun</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((p) => (
                                    <tr key={p.id} data-testid={PARTICIPANTS.row} className="border-t border-border odd:bg-muted/10 hover:bg-primary/5 transition-colors">
                                        {isAdmin && (
                                            <td className="px-4 py-3">
                                                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} data-testid={`row-checkbox-${p.id}`} />
                                            </td>
                                        )}
                                        <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{p.name}</span>
                                                {p.is_secret_tag && (
                                                    <span title="Tag rahasia" className="inline-flex items-center text-[10px] uppercase tracking-widest border border-dashed border-accent text-accent px-1.5 py-0.5 rounded-full">
                                                        <ShieldAlert className="h-3 w-3 mr-1" /> tag
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{p.gender}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{p.phone || '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === 'aktif' ? 'bg-success/10 text-success border border-success/20' : 'bg-muted text-muted-foreground border border-border'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${p.account_status === 'aktif' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-warning/10 text-warning border-warning/30'}`}>
                                                {p.account_status === 'aktif' ? 'Aktif' : 'Belum Aktivasi'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Link to={`/app/participants/${p.id}`} className="inline-flex items-center gap-1 text-accent hover:underline text-xs">
                                                    Detail <ArrowUpRight className="h-3 w-3" />
                                                </Link>
                                                {isAdmin && (
                                                    <>
                                                        <button title="Reset Password" onClick={() => resetPw(p)} disabled={busy} className="text-xs inline-flex items-center gap-1 text-warning hover:underline" data-testid={`reset-pw-${p.id}`}>
                                                            <KeyRound className="h-3 w-3" /> Reset PW
                                                        </button>
                                                        <button title="Arsipkan" onClick={() => archive(p)} disabled={busy} className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground" data-testid={`archive-${p.id}`}>
                                                            <Archive className="h-3 w-3" /> Arsip
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ParticipantForm open={formOpen} onClose={() => setFormOpen(false)} onCreated={load} />
            <BulkForm open={bulkOpen} onClose={() => setBulkOpen(false)} onDone={load} />
        </div>
    );
}
