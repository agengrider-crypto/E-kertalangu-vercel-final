import { useEffect, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { toast } from 'sonner';
import { ScrollText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACTION_LABELS = {
    login: 'Login', logout: 'Logout', register: 'Daftar akun', activate: 'Aktivasi akun',
    change_password: 'Ganti password', password_reset: 'Reset password', admin_set_password: 'Set password (admin)',
    approve_user: 'Setujui pengguna', reject_user: 'Tolak pengguna', create_user: 'Buat pengguna',
    update_role: 'Ubah hak akses', toggle_active: 'Ubah status akun',
    create_participant: 'Tambah peserta', update_participant: 'Ubah peserta', delete_participant: 'Hapus peserta',
    archive_participant: 'Arsipkan peserta', restore_participant: 'Kembalikan peserta', reset_participant_password: 'Reset password peserta',
    import_participants: 'Import data peserta',
    create_activity: 'Tambah kegiatan', update_activity: 'Ubah kegiatan', delete_activity: 'Hapus kegiatan',
    create_recurring: 'Buat kegiatan berulang', attendance: 'Absensi', create_musyawarah: 'Buat musyawarah',
    create_announcement: 'Buat pengumuman',
};

function describe(l) {
    const m = l.meta || {};
    if (l.action === 'update_role') {
        const roles = Array.isArray(m.roles) ? m.roles.join(', ') : '';
        return `${m.target || 'pengguna'} → hak akses: ${roles}`;
    }
    if (l.action === 'toggle_active') {
        return `${m.target || 'pengguna'} → akun ${m.active ? 'diaktifkan' : 'dinonaktifkan'}`;
    }
    if (l.action === 'import_participants') {
        const m2 = l.meta || {};
        return `${m2.count ?? 0}/${m2.total ?? 0} peserta`;
    }
    if (['archive_participant', 'restore_participant', 'reset_participant_password', 'delete_participant', 'create_participant'].includes(l.action)) {
        const m2 = l.meta || {};
        if (m2.bulk) return `${m2.count ?? 0} peserta (massal)`;
        return m2.name || m2.target || null;
    }
    const keys = Object.keys(m);
    if (keys.length === 0) return null;
    return JSON.stringify(m);
}

export default function ActivityLog() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all');

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/activity-log', { params: { limit: 300 } });
            setItems(data.items);
        } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const shown = filter === 'access'
        ? items.filter((l) => ['update_role', 'toggle_active'].includes(l.action))
        : filter === 'aktivasi'
            ? items.filter((l) => l.action === 'activate')
            : items;

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <p className="tick-label text-muted-foreground">Sistem</p>
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Log Aktivitas</h1>
                    <p className="text-muted-foreground mt-2">Notepad terhubung untuk audit trail.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setFilter('all')} variant={filter === 'all' ? 'default' : 'outline'} className="rounded-full" data-testid="log-filter-all">Semua</Button>
                    <Button onClick={() => setFilter('access')} variant={filter === 'access' ? 'default' : 'outline'} className="rounded-full" data-testid="log-filter-access">Hak Akses</Button>
                    <Button onClick={() => setFilter('aktivasi')} variant={filter === 'aktivasi' ? 'default' : 'outline'} className="rounded-full" data-testid="log-filter-aktivasi">Aktivasi</Button>
                    <Button onClick={load} variant="outline" className="rounded-full" data-testid="log-refresh"><RefreshCw className="h-4 w-4 mr-2" /> Muat Ulang</Button>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 font-mono text-xs" data-testid="activity-log-list">
                {loading && <p className="text-muted-foreground">Memuat…</p>}
                {!loading && shown.length === 0 && (
                    <div className="text-center py-8"><ScrollText className="h-8 w-8 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">Belum ada log.</p></div>
                )}
                <div className="space-y-2 max-h-[600px] overflow-auto">
                    {shown.map((l) => {
                        const desc = describe(l);
                        const isAccess = ['update_role', 'toggle_active'].includes(l.action);
                        return (
                            <div key={l.id} className="grid grid-cols-[160px_1fr] gap-3">
                                <span className="text-muted-foreground">{new Date(l.timestamp).toLocaleString('id-ID')}</span>
                                <div>
                                    <span className={isAccess ? 'text-warning font-semibold' : 'text-accent'}>[{ACTION_LABELS[l.action] || l.action}]</span>{' '}
                                    <span className="text-foreground">{l.actor_name || 'system'}</span>
                                    {desc && <span className="text-muted-foreground"> · {desc}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
