import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Trash2, MessageCircle, Save, ShieldCheck, Power } from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
    BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
} from 'recharts';
import { toast } from 'sonner';

export default function ParticipantDetail() {
    const { pid } = useParams();
    const { user } = useAuth();
    const confirm = useConfirm();
    const canEdit = ['admin', 'pengurus'].includes(user.role);
    const isAdmin = user.role === 'admin';
    const [p, setP] = useState(null);
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [saving, setSaving] = useState(false);
    const [account, setAccount] = useState(null);
    const [isPengurus, setIsPengurus] = useState(false);
    const [savingRole, setSavingRole] = useState(false);
    const [togglingActive, setTogglingActive] = useState(false);

    const load = async () => {
        try {
            const calls = [
                api.get(`/participants/${pid}`),
                api.get(`/participants/${pid}/stats`),
                api.get(`/participants/${pid}/attendance`),
            ];
            if (isAdmin) calls.push(api.get(`/participants/${pid}/account`));
            const [pr, st, h, acc] = await Promise.all(calls);
            setP(pr.data);
            setStats(st.data);
            setHistory(h.data.items);
            if (isAdmin && acc) {
                setAccount(acc.data);
                setIsPengurus((acc.data.roles || []).includes('pengurus'));
            }
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); }, [pid]);

    const saveRole = async (nextPengurus) => {
        if (!account?.user_id) return;
        setSavingRole(true);
        const prev = isPengurus;
        setIsPengurus(nextPengurus);
        try {
            const roles = nextPengurus ? ['peserta', 'pengurus'] : ['peserta'];
            await api.patch(`/users/${account.user_id}/role`, { roles });
            toast.success('Hak akses diperbarui');
        } catch (e) {
            setIsPengurus(prev);
            toast.error(formatApiError(e));
        } finally { setSavingRole(false); }
    };

    const toggleActive = async () => {
        if (!account?.user_id) return;
        const willDeactivate = account.active;
        if (willDeactivate && !(await confirm({
            title: 'Nonaktifkan Akun',
            description: 'Nonaktifkan akun peserta ini? Peserta tidak akan bisa login sampai diaktifkan kembali.',
            confirmText: 'Nonaktifkan',
        }))) return;
        setTogglingActive(true);
        try {
            const { data } = await api.patch(`/users/${account.user_id}/toggle-active`);
            setAccount({ ...account, active: data.active });
            toast.success(data.active ? 'Akun diaktifkan' : 'Akun dinonaktifkan');
        } catch (e) { toast.error(formatApiError(e)); } finally { setTogglingActive(false); }
    };

    const save = async () => {
        setSaving(true);
        try {
            await api.patch(`/participants/${pid}`, {
                name: p.name, gender: p.gender, birth_place: p.birth_place, birth_date: p.birth_date,
                phone: p.phone, email: p.email, education: p.education, status: p.status, is_secret_tag: p.is_secret_tag,
            });
            toast.success('Peserta tersimpan');
            load();
        } catch (e) { toast.error(formatApiError(e)); } finally { setSaving(false); }
    };

    const del = async () => {
        if (!(await confirm({
            title: 'Hapus Peserta',
            description: 'Hapus peserta ini secara permanen? Akun login tertaut akan dihapus, riwayat absensi tetap tersimpan.',
            confirmText: 'Hapus',
        }))) return;
        try {
            await api.delete(`/participants/${pid}`);
            toast.success('Peserta dihapus');
            window.history.back();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const chartData = useMemo(() => ([
        { label: 'Hadir', v: stats?.counts?.hadir || 0, fill: 'hsl(var(--success))' },
        { label: 'Izin', v: stats?.counts?.izin || 0, fill: 'hsl(var(--warning))' },
        { label: 'Alpha', v: stats?.counts?.alpha || 0, fill: 'hsl(var(--destructive))' },
    ]), [stats]);

    if (!p) return <div className="text-muted-foreground">Memuat…</div>;

    const waHref = p.phone
        ? `https://wa.me/${p.phone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`Assalamu'alaikum ${p.name}, mohon informasinya.`)}`
        : null;

    return (
        <div className="animate-fade-in-up space-y-6">
            <Link to="/app/participants" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Kembali</Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Info */}
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="tick-label text-muted-foreground">{p.code}</p>
                            <h1 className="font-display font-black text-3xl tracking-tight mt-1">{p.name}</h1>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border ${p.status === 'aktif' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border'}`}>{p.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="tick-label">Nama</Label>
                            <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} disabled={!canEdit} className="h-11" />
                        </div>
                        <div className="space-y-1">
                            <Label className="tick-label">Jenis Kelamin</Label>
                            <Select value={p.gender} onValueChange={(v) => setP({ ...p, gender: v })} disabled={!canEdit}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="L">Laki-laki</SelectItem>
                                    <SelectItem value="P">Perempuan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label className="tick-label">Tempat Lahir</Label>
                            <Input value={p.birth_place || ''} onChange={(e) => setP({ ...p, birth_place: e.target.value })} disabled={!canEdit} className="h-11" />
                        </div>
                        <div className="space-y-1">
                            <Label className="tick-label">Tanggal Lahir</Label>
                            <Input type="date" value={p.birth_date || ''} onChange={(e) => setP({ ...p, birth_date: e.target.value })} disabled={!canEdit} className="h-11" />
                        </div>
                        <div className="space-y-1">
                            <Label className="tick-label">No. HP</Label>
                            <Input value={p.phone || ''} onChange={(e) => setP({ ...p, phone: e.target.value })} disabled={!canEdit} className="h-11" />
                        </div>
                        <div className="space-y-1">
                            <Label className="tick-label">Email</Label>
                            <Input value={p.email || ''} onChange={(e) => setP({ ...p, email: e.target.value })} disabled={!canEdit} className="h-11" />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="tick-label">Pendidikan</Label>
                            <Input value={p.education || ''} onChange={(e) => setP({ ...p, education: e.target.value })} disabled={!canEdit} className="h-11" />
                        </div>
                        <div className="col-span-2 flex items-center justify-between rounded-xl border border-border p-3">
                            <div>
                                <p className="font-medium text-sm">Tag Rahasia</p>
                                <p className="text-xs text-muted-foreground">Untuk undangan khusus.</p>
                            </div>
                            <Switch checked={!!p.is_secret_tag} onCheckedChange={(v) => setP({ ...p, is_secret_tag: v })} disabled={!canEdit} />
                        </div>
                        <div className="col-span-2 space-y-1">
                            <Label className="tick-label">Status</Label>
                            <Select value={p.status} onValueChange={(v) => setP({ ...p, status: v })} disabled={!canEdit}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="aktif">Aktif</SelectItem>
                                    <SelectItem value="non-aktif">Non-Aktif</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className="rounded-xl border border-border p-4 space-y-3" data-testid="account-access-section">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-accent" />
                                <p className="font-semibold text-sm">Hak Akses Akun</p>
                            </div>
                            {account?.has_account ? (
                                <>
                                    <p className="text-xs text-muted-foreground">Atur peran akun tertaut peserta ini.</p>
                                    <div className="flex flex-col gap-3 pt-1">
                                        <label className="flex items-center gap-3 opacity-70 cursor-not-allowed">
                                            <Checkbox checked disabled data-testid="role-peserta-checkbox" />
                                            <span className="text-sm">Peserta <span className="text-xs text-muted-foreground">(bawaan, tidak dapat diubah)</span></span>
                                        </label>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <Checkbox
                                                checked={isPengurus}
                                                disabled={savingRole}
                                                onCheckedChange={(v) => saveRole(!!v)}
                                                data-testid="role-pengurus-checkbox"
                                            />
                                            <span className="text-sm">Pengurus <span className="text-xs text-muted-foreground">(dapat mengelola kegiatan & kehadiran)</span></span>
                                        </label>
                                    </div>
                                    <div className="flex items-center justify-between pt-3 mt-1 border-t border-border">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm">Status Akun:</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full border ${account.active ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/30'}`} data-testid="account-status-badge">
                                                {account.active ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={togglingActive}
                                            onClick={toggleActive}
                                            className={`rounded-full ${account.active ? 'text-destructive border-destructive/30' : 'text-success border-success/30'}`}
                                            data-testid="toggle-account-active-btn"
                                        >
                                            <Power className="h-4 w-4 mr-2" /> {account.active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground" data-testid="account-access-empty">Peserta belum memiliki akun (belum aktivasi). Hak akses dapat diatur setelah peserta melakukan aktivasi.</p>
                            )}
                        </div>
                    )}

                    {canEdit && (
                        <div className="flex justify-between pt-3 border-t border-border">
                            {user.role === 'admin' ? (
                                <Button onClick={del} variant="outline" className="rounded-full text-destructive border-destructive/30"><Trash2 className="h-4 w-4 mr-2" /> Hapus</Button>
                            ) : <span />}
                            <div className="flex gap-2">
                                {waHref && (
                                    <a href={waHref} target="_blank" rel="noreferrer">
                                        <Button variant="outline" className="rounded-full"><MessageCircle className="h-4 w-4 mr-2" /> Chat</Button>
                                    </a>
                                )}
                                <Button disabled={saving} onClick={save} className="rounded-full"><Save className="h-4 w-4 mr-2" /> Simpan</Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* QR */}
                <div className="rounded-3xl border border-border bg-card p-6 text-center">
                    <p className="tick-label text-muted-foreground">QR Peserta</p>
                    <div className="mt-4 mx-auto w-56 h-56 bg-white rounded-2xl grid place-items-center p-3 shadow-sm">
                        {p.qr_datauri && <img src={p.qr_datauri} alt="QR" className="w-full h-full object-contain" />}
                    </div>
                    <p className="font-mono text-xs text-muted-foreground mt-3">{p.qr_payload}</p>
                    <a href={p.qr_datauri} download={`${p.code}.png`} className="inline-block mt-3 text-xs text-accent hover:underline">Download QR</a>
                </div>
            </div>

            {/* Stats + History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-border bg-card p-5">
                    <p className="tick-label text-muted-foreground">Rekap Kehadiran</p>
                    <p className="mt-2 text-3xl font-display font-black">{stats?.rate_hadir ?? 0}%</p>
                    <p className="text-xs text-muted-foreground">Rasio hadir dari {stats?.total ?? 0} kegiatan</p>
                    <div className="h-40 mt-3">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                                <Bar dataKey="v" radius={[6, 6, 0, 0]}>
                                    {chartData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5">
                    <p className="tick-label text-muted-foreground mb-3">Riwayat Kehadiran</p>
                    <div className="divide-y divide-border max-h-96 overflow-auto">
                        {history.length === 0 && <p className="text-sm text-muted-foreground py-4">Belum ada riwayat.</p>}
                        {history.map((h) => (
                            <div key={h.id} className="flex items-center justify-between py-2.5">
                                <div>
                                    <p className="font-medium text-sm">{h.activity?.name}</p>
                                    <p className="text-xs text-muted-foreground font-mono">{h.activity?.date} · {h.time_in || '—'} · {h.method}</p>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${h.status === 'hadir' ? 'bg-success/10 text-success border-success/20' : h.status === 'izin' ? 'bg-warning/10 text-warning border-warning/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                                    {h.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
