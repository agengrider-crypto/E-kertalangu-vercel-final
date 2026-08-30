import { useEffect, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useConfirm } from '@/lib/confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Megaphone, Plus, Pin, Trash2, MessageCircle, BookOpen, User, Edit3 } from 'lucide-react';
import { toast } from 'sonner';

const EMPTY = { title: '', body: '', pengajar: '', materi_progress: '', activity_id: '', priority: 'normal', pinned: false };

export default function Announcements() {
    const { user } = useAuth();
    const confirm = useConfirm();
    const canEdit = ['admin', 'pengurus'].includes(user.role);
    const [items, setItems] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [activities, setActivities] = useState([]);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const [an, ac] = await Promise.all([api.get('/announcements'), api.get('/activities', { params: { upcoming: true } })]);
            setItems(an.data.items);
            setActivities(ac.data.items);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); }, []);

    const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
    const openEdit = (a) => {
        setEditing(a);
        setForm({
            title: a.title || '', body: a.body || '', pengajar: a.pengajar || '',
            materi_progress: a.materi_progress || '', activity_id: a.activity_id || '',
            priority: a.priority || 'normal', pinned: !!a.pinned,
        });
        setOpen(true);
    };

    const submit = async () => {
        if (!form.title.trim()) { toast.error('Judul wajib diisi'); return; }
        setSaving(true);
        try {
            const body = { ...form };
            if (!body.activity_id) body.activity_id = null;
            if (editing) await api.patch(`/announcements/${editing.id}`, body);
            else await api.post('/announcements', body);
            toast.success('Tersimpan');
            setOpen(false);
            setForm(EMPTY);
            setEditing(null);
            load();
        } catch (e) { toast.error(formatApiError(e)); } finally { setSaving(false); }
    };

    const del = async (id) => {
        if (!(await confirm({ title: 'Hapus Pengumuman', description: 'Hapus pengumuman ini?', confirmText: 'Hapus' }))) return;
        try { await api.delete(`/announcements/${id}`); load(); toast.success('Dihapus'); }
        catch (e) { toast.error(formatApiError(e)); }
    };

    const shareWA = (a) => {
        const lines = [
            `📢 *${a.title}*`,
            '',
            a.body || '',
        ];
        if (a.pengajar) lines.push(`\n👤 Pengajar: ${a.pengajar}`);
        if (a.materi_progress) lines.push(`📖 Materi: ${a.materi_progress}`);
        lines.push('\n_E-Kertalangu_');
        const text = encodeURIComponent(lines.join('\n'));
        window.open(`https://wa.me/?text=${text}`, '_blank');
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div>
                    <p className="tick-label text-muted-foreground">Broadcast</p>
                    <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Pengumuman</h1>
                    <p className="text-muted-foreground mt-2">{items.length} pengumuman aktif</p>
                </div>
                {canEdit && <Button onClick={openNew} className="rounded-full h-11"><Plus className="h-4 w-4 mr-2" /> Pengumuman Baru</Button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.length === 0 && (
                    <div className="col-span-full text-center py-16 border border-dashed border-border rounded-2xl">
                        <Megaphone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">Belum ada pengumuman.</p>
                    </div>
                )}
                {items.map((a) => (
                    <div key={a.id} className={`rounded-2xl border p-5 relative ${a.pinned ? 'border-accent bg-accent/5' : 'border-border bg-card'}`}>
                        {a.pinned && (
                            <span className="absolute -top-2 left-4 text-[10px] uppercase tracking-widest bg-accent text-accent-foreground px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <Pin className="h-3 w-3" /> Pinned
                            </span>
                        )}
                        {a.priority === 'penting' && (
                            <span className="absolute -top-2 right-4 text-[10px] uppercase tracking-widest bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full">
                                Penting
                            </span>
                        )}
                        <h3 className="font-display font-bold text-xl leading-tight">{a.title}</h3>
                        {a.body && <p className="mt-2 text-sm whitespace-pre-wrap">{a.body}</p>}
                        <div className="mt-3 space-y-1 text-xs">
                            {a.pengajar && (
                                <p className="flex items-center gap-2 text-muted-foreground"><User className="h-3 w-3" /> Pengajar: <span className="text-foreground font-medium">{a.pengajar}</span></p>
                            )}
                            {a.materi_progress && (
                                <p className="flex items-center gap-2 text-muted-foreground"><BookOpen className="h-3 w-3" /> Materi: <span className="text-foreground font-medium">{a.materi_progress}</span></p>
                            )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                                {a.created_by_name} · {new Date(a.created_at).toLocaleDateString('id-ID')}
                            </p>
                            <div className="flex gap-1">
                                <Button variant="outline" size="sm" onClick={() => shareWA(a)} className="rounded-full h-8">
                                    <MessageCircle className="h-3 w-3 mr-1" /> Share
                                </Button>
                                {canEdit && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => openEdit(a)} className="rounded-full h-8">
                                            <Edit3 className="h-3 w-3" />
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => del(a.id)} className="rounded-full h-8 text-destructive border-destructive/30">
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle className="font-display">{editing ? 'Edit Pengumuman' : 'Pengumuman Baru'}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1"><Label className="tick-label">Judul *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-11" /></div>
                        <div className="space-y-1"><Label className="tick-label">Isi Pengumuman</Label><Textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1"><Label className="tick-label">Pengajar</Label><Input value={form.pengajar} onChange={(e) => setForm({ ...form, pengajar: e.target.value })} placeholder="Contoh: Ust. Angga" className="h-11" /></div>
                            <div className="space-y-1"><Label className="tick-label">Materi (sampai mana)</Label><Input value={form.materi_progress} onChange={(e) => setForm({ ...form, materi_progress: e.target.value })} placeholder="Contoh: Al-Baqarah ayat 221" className="h-11" /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="tick-label">Kaitkan ke Kegiatan</Label>
                                <Select value={form.activity_id || 'none'} onValueChange={(v) => setForm({ ...form, activity_id: v === 'none' ? '' : v })}>
                                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        <SelectItem value="none">— Tidak Terkait —</SelectItem>
                                        {activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} · {a.date}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="tick-label">Prioritas</Label>
                                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="penting">Penting</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border p-3">
                            <div>
                                <p className="text-sm font-medium">Pin ke Atas</p>
                                <p className="text-xs text-muted-foreground">Pengumuman ini akan muncul paling atas.</p>
                            </div>
                            <Switch checked={form.pinned} onCheckedChange={(v) => setForm({ ...form, pinned: v })} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)} className="rounded-full">Batal</Button>
                        <Button disabled={saving} onClick={submit} className="rounded-full">{saving ? 'Menyimpan…' : 'Simpan'}</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
