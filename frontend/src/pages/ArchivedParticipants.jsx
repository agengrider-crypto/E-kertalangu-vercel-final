import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowLeft, RotateCcw, Trash2, ArrowUpRight } from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { useConfirm } from '@/lib/confirm';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function ArchivedParticipants() {
    const confirm = useConfirm();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/participants', { params: { status: 'arsip' } });
            setItems(data.items);
        } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const restore = async (p) => {
        setBusy(true);
        try { await api.patch(`/participants/${p.id}/restore`); toast.success('Peserta dikembalikan ke Aktif'); load(); }
        catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
    };
    const del = async (p) => {
        if (!(await confirm({
            title: 'Hapus Permanen',
            description: `Hapus data "${p.name}" secara permanen? Tindakan ini tidak dapat dibatalkan.`,
            confirmText: 'Hapus Permanen',
        }))) return;
        setBusy(true);
        try { await api.delete(`/participants/${p.id}`); toast.success('Peserta dihapus permanen'); load(); }
        catch (e) { toast.error(formatApiError(e)); } finally { setBusy(false); }
    };

    return (
        <div className="animate-fade-in-up space-y-6" data-testid="archive-page">
            <div className="flex items-end justify-between gap-4 flex-wrap">
                <div>
                    <p className="tick-label text-muted-foreground">Manajemen Data</p>
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Data Arsip</h1>
                    <p className="text-muted-foreground mt-2">{items.length} peserta diarsipkan · Kembalikan ke aktif atau hapus permanen.</p>
                </div>
                <Link to="/app/participants"><Button variant="outline" className="rounded-full h-11"><ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Peserta</Button></Link>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">Memuat…</div>
                ) : items.length === 0 ? (
                    <div className="p-12 text-center">
                        <Archive className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground" data-testid="archive-empty">Belum ada peserta di arsip.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/40">
                                <tr className="text-left">
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Kode</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Nama</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">HP</th>
                                    <th className="px-4 py-3 tick-label text-muted-foreground">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((p) => (
                                    <tr key={p.id} data-testid="archive-row" className="border-t border-border hover:bg-muted/30">
                                        <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                                        <td className="px-4 py-3 font-medium">{p.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{p.phone || '—'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <Link to={`/app/participants/${p.id}`} className="inline-flex items-center gap-1 text-accent hover:underline text-xs">Detail <ArrowUpRight className="h-3 w-3" /></Link>
                                                <button onClick={() => restore(p)} disabled={busy} className="text-xs inline-flex items-center gap-1 text-success hover:underline" data-testid={`restore-${p.id}`}>
                                                    <RotateCcw className="h-3 w-3" /> Kembalikan ke Aktif
                                                </button>
                                                <button onClick={() => del(p)} disabled={busy} className="text-xs inline-flex items-center gap-1 text-destructive hover:underline" data-testid={`perm-delete-${p.id}`}>
                                                    <Trash2 className="h-3 w-3" /> Hapus Permanen
                                                </button>
                                            </div>
                                        </td>
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
