import { useEffect, useMemo, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { API_BASE } from '@/lib/api';
import { useConfirm } from '@/lib/confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, ShieldCheck, Power, Check, X, Clock, KeyRound, MessageCircle } from 'lucide-react';
import { USERS } from '@/constants/testIds/app';
import { toast } from 'sonner';

export default function Users() {
    const confirm = useConfirm();
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', username: '', phone: '', password: '', role: 'peserta', participant_id: '' });
    const [participants, setParticipants] = useState([]);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');
    const [resetReqs, setResetReqs] = useState([]);
    const [tempPw, setTempPw] = useState(null); // {name, pw} setelah approve
    const [pwDialog, setPwDialog] = useState(null); // user to change pw
    const [pwValue, setPwValue] = useState('');

    const loadResets = async () => {
        try {
            const { data } = await api.get('/auth/reset-requests');
            setResetReqs(data.items);
        } catch {}
    };

    const load = async () => {
        try {
            const { data } = await api.get('/users');
            setItems(data.users);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => {
        load();
        loadResets();
        api.get('/participants').then(({ data }) => setParticipants(data.items));
    }, []);

    const filtered = useMemo(() => {
        if (filter === 'pending') return items.filter((u) => u.pending_approval && !u.active);
        if (filter === 'active') return items.filter((u) => u.active !== false && !u.pending_approval);
        if (filter === 'inactive') return items.filter((u) => u.active === false && !u.pending_approval);
        return items;
    }, [items, filter]);

    const pendingCount = items.filter((u) => u.pending_approval && !u.active).length;

    const submit = async () => {
        setSaving(true);
        try {
            const body = { ...form };
            if (!body.participant_id) delete body.participant_id;
            await api.post('/users', body);
            toast.success('Pengguna dibuat');
            setOpen(false);
            setForm({ name: '', email: '', username: '', phone: '', password: '', role: 'peserta', participant_id: '' });
            load();
        } catch (e) { toast.error(formatApiError(e)); } finally { setSaving(false); }
    };

    const changeRole = async (uid, roles) => {
        if (!roles.length) { toast.error('Minimal satu role harus dipilih'); return; }
        try { await api.patch(`/users/${uid}/role`, { roles }); toast.success('Role diperbarui'); load(); }
        catch (e) { toast.error(formatApiError(e)); }
    };

    const toggleRole = (u, role) => {
        const cur = (u.roles && u.roles.length) ? u.roles : [u.role];
        const next = cur.includes(role) ? cur.filter((r) => r !== role) : [...cur, role];
        changeRole(u.id, next);
    };

    const toggleActive = async (uid) => {
        try { await api.patch(`/users/${uid}/toggle-active`); load(); toast.success('Status diubah'); }
        catch (e) { toast.error(formatApiError(e)); }
    };

    const approve = async (uid) => {
        try { await api.post(`/users/${uid}/approve`); toast.success('Approved'); load(); }
        catch (e) { toast.error(formatApiError(e)); }
    };

    const reject = async (uid) => {
        if (!(await confirm({ title: 'Tolak Pendaftaran', description: 'Tolak dan hapus pendaftaran ini?', confirmText: 'Tolak' }))) return;
        try { await api.post(`/users/${uid}/reject`); toast.success('Pendaftaran ditolak'); load(); }
        catch (e) { toast.error(formatApiError(e)); }
    };

    const setPw = async () => {
        if (!pwDialog || pwValue.length < 4) { toast.error('Minimal 4 karakter'); return; }
        try {
            await api.post(`/users/${pwDialog.id}/set-password`, { new_password: pwValue });
            toast.success('Password direset');
            setPwDialog(null);
            setPwValue('');
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const applyReset = async (rid, name) => {
        try {
            const { data } = await api.post(`/auth/reset-requests/${rid}/apply`);
            setTempPw({ name: data.user_name || name || '', pw: data.temp_password });
            toast.success('Password sementara dibuat');
            loadResets();
        } catch (e) { toast.error(formatApiError(e)); }
    };
    const rejectReset = async (rid) => {
        try { await api.post(`/auth/reset-requests/${rid}/reject`); loadResets(); }
        catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <p className="tick-label text-muted-foreground">RBAC & Approval</p>
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Pengguna & Hak</h1>
                    <p className="text-muted-foreground mt-2">{items.length} akun · {pendingCount > 0 && (
                        <span className="text-accent font-semibold"> {pendingCount} menunggu approval</span>
                    )}</p>
                </div>
                <Button data-testid={USERS.addBtn} onClick={() => setOpen(true)} className="rounded-full h-11"><Plus className="h-4 w-4 mr-2" /> Tambah Pengguna</Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { v: 'all', label: `Semua (${items.length})` },
                    { v: 'pending', label: `Menunggu (${pendingCount})`, alert: pendingCount > 0 },
                    { v: 'active', label: 'Aktif' },
                    { v: 'inactive', label: 'Nonaktif' },
                ].map((t) => (
                    <button
                        key={t.v}
                        onClick={() => setFilter(t.v)}
                        className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${filter === t.v ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'} ${t.alert ? 'ring-2 ring-accent/40' : ''}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {resetReqs.length > 0 && (
                <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <KeyRound className="h-4 w-4 text-warning" />
                        <p className="tick-label text-warning">{resetReqs.length} Permintaan Reset Password</p>
                    </div>
                    <div className="divide-y divide-border">
                        {resetReqs.map((r) => (
                            <div key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                                <div>
                                    <p className="font-medium text-sm">{r.user_name || '(user tidak ditemukan)'}</p>
                                    <p className="text-xs font-mono text-muted-foreground">Ident: {r.identifier}</p>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                        {new Date(r.created_at).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => applyReset(r.id, r.user_name)} disabled={!r.user_id} className="rounded-full bg-success hover:bg-success/90 text-white">
                                        <Check className="h-3 w-3 mr-1" /> Buat Password Sementara
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => rejectReset(r.id)} className="rounded-full text-destructive border-destructive/30">
                                        Tolak
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tempPw && (
                <div className="rounded-2xl border border-success/40 bg-success/10 p-5" data-testid="temp-pw-banner">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <p className="tick-label text-success">Password Sementara Dibuat</p>
                            <p className="text-sm mt-1">Untuk: <span className="font-medium">{tempPw.name || '-'}</span></p>
                            <p className="text-xs text-muted-foreground mt-1">Salin & kirim ke peserta. Password ini <b>tidak disimpan</b> dan hanya tampil sekali. Minta peserta segera menggantinya setelah masuk.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <code className="px-3 py-2 rounded-lg bg-card border border-border font-mono text-lg tracking-wider" data-testid="temp-pw-value">{tempPw.pw}</code>
                            <Button size="sm" variant="outline" className="rounded-full" data-testid="temp-pw-copy" onClick={() => { navigator.clipboard?.writeText(tempPw.pw); toast.success('Password disalin'); }}>Salin</Button>
                            <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setTempPw(null)}>Tutup</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40">
                            <tr className="text-left">
                                <th className="px-4 py-3 tick-label text-muted-foreground">Nama</th>
                                <th className="px-4 py-3 tick-label text-muted-foreground">Identifier</th>
                                <th className="px-4 py-3 tick-label text-muted-foreground">Role</th>
                                <th className="px-4 py-3 tick-label text-muted-foreground">Status</th>
                                <th className="px-4 py-3 tick-label text-muted-foreground">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data.</td></tr>
                            )}
                            {filtered.map((u) => (
                                <tr key={u.id} data-testid={USERS.row} className="border-t border-border">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{u.name}</span>
                                            {u.pending_approval && (
                                                <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest bg-accent/10 text-accent border border-accent/30 px-1.5 py-0.5 rounded-full">
                                                    <Clock className="h-2.5 w-2.5" /> pending
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                                        {[u.email, u.username, u.phone].filter(Boolean).join(' · ') || '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {['admin', 'pengurus', 'peserta'].map((r) => {
                                                const roles = (u.roles && u.roles.length) ? u.roles : [u.role];
                                                const on = roles.includes(r);
                                                const labels = { admin: 'Admin', pengurus: 'Pengurus', peserta: 'Peserta' };
                                                return (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        data-testid={`role-chip-${r}`}
                                                        disabled={u.pending_approval}
                                                        onClick={() => toggleRole(u, r)}
                                                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                                            on
                                                                ? 'bg-primary text-primary-foreground border-primary'
                                                                : 'bg-transparent text-muted-foreground border-border hover:bg-muted'
                                                        } ${u.pending_approval ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        {labels[r]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${u.active !== false ? 'bg-success/10 text-success border-success/20' : u.pending_approval ? 'bg-accent/10 text-accent border-accent/30' : 'bg-muted text-muted-foreground border-border'}`}>
                                            {u.active !== false ? 'aktif' : u.pending_approval ? 'menunggu' : 'nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {u.pending_approval ? (
                                            <div className="flex gap-1">
                                                <Button variant="outline" size="sm" onClick={() => approve(u.id)} className="rounded-full h-8 bg-success/10 text-success border-success/30 hover:bg-success/20">
                                                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => reject(u.id)} className="rounded-full h-8 text-destructive border-destructive/30">
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1">
                                                <Button variant="outline" size="sm" onClick={() => toggleActive(u.id)} className="rounded-full h-8">
                                                    <Power className="h-3 w-3 mr-1" /> Toggle
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => { setPwDialog(u); setPwValue(''); }} className="rounded-full h-8">
                                                    <KeyRound className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle className="font-display">Tambah Pengguna</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1"><Label className="tick-label">Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" /></div>
                        <div className="space-y-1"><Label className="tick-label">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" /></div>
                        <div className="space-y-1"><Label className="tick-label">Username</Label><Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="h-11" /></div>
                        <div className="space-y-1"><Label className="tick-label">No. HP</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="h-11" /></div>
                        <div className="space-y-1"><Label className="tick-label">Password</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" /></div>
                        <div className="space-y-1">
                            <Label className="tick-label">Role</Label>
                            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="pengurus">Pengurus</SelectItem>
                                    <SelectItem value="peserta">Peserta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {form.role === 'peserta' && (
                            <div className="col-span-2 space-y-1">
                                <Label className="tick-label">Kaitkan dengan Peserta (opsional)</Label>
                                <Select value={form.participant_id} onValueChange={(v) => setForm({ ...form, participant_id: v })}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="—" /></SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {participants.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} · {p.code}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full">Batal</Button>
                        <Button disabled={saving || !form.name || !form.password} onClick={submit} className="rounded-full"><ShieldCheck className="h-4 w-4 mr-2" /> Buat</Button>
                    </div>
                </DialogContent>
            </Dialog>
            <Dialog open={!!pwDialog} onOpenChange={(v) => !v && setPwDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-display">Reset Password</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Set password baru untuk <span className="font-medium text-foreground">{pwDialog?.name}</span></p>
                    <div className="space-y-2">
                        <Label className="tick-label">Password Baru</Label>
                        <Input type="text" value={pwValue} onChange={(e) => setPwValue(e.target.value)} className="h-11 font-mono" placeholder="Minimal 4 karakter" />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setPwDialog(null)} className="rounded-full">Batal</Button>
                        <Button onClick={setPw} disabled={pwValue.length < 4} className="rounded-full"><KeyRound className="h-4 w-4 mr-2" /> Set Password</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
