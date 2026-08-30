import { useEffect, useMemo, useRef, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { useConfirm } from '@/lib/confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { MUSYAWARAH } from '@/constants/testIds/app';
import { API_BASE } from '@/lib/api';
import { toast } from 'sonner';

const KINDS = [
    { v: '4S', label: 'Musyawarah 4S' },
    { v: 'TIM7', label: 'Tim 7' },
];

export default function Musyawarah() {
    const confirm = useConfirm();
    const [kind, setKind] = useState('4S');
    const [items, setItems] = useState([]);
    const [sel, setSel] = useState(null);
    const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
    const timer = useRef(null);

    const load = async () => {
        try {
            const { data } = await api.get('/musyawarah', { params: { kind } });
            setItems(data.items);
            if (data.items.length && !sel) setSel(data.items[0]);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { setSel(null); load(); /* eslint-disable-next-line */ }, [kind]);

    const create = async () => {
        try {
            const { data } = await api.post('/musyawarah', { kind, title: 'Catatan Baru', content: '', date: new Date().toISOString().slice(0, 10) });
            setItems((s) => [data, ...s]);
            setSel(data);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const del = async () => {
        if (!sel) return;
        if (!(await confirm({ title: 'Hapus Catatan', description: 'Hapus catatan musyawarah ini?', confirmText: 'Hapus' }))) return;
        try {
            await api.delete(`/musyawarah/${sel.id}`);
            toast.success('Catatan dihapus');
            setSel(null);
            load();
        } catch (e) { toast.error(formatApiError(e)); }
    };

    const scheduleSave = (patch) => {
        setSel((s) => ({ ...s, ...patch }));
        setSaveState('saving');
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(async () => {
            try {
                const body = { title: patch.title ?? sel.title, content: patch.content ?? sel.content, date: patch.date ?? sel.date };
                const { data } = await api.patch(`/musyawarah/${sel.id}`, body);
                setSaveState('saved');
                setSel((s) => ({ ...s, updated_at: data.updated_at }));
                setTimeout(() => setSaveState('idle'), 1500);
                load();
            } catch (e) {
                setSaveState('idle');
                toast.error(formatApiError(e));
            }
        }, 700);
    };

    const exportUrl = sel ? `${API_BASE}/musyawarah/${sel.id}/export/xlsx` : '#';

    const doExport = async () => {
        if (!sel) return;
        try {
            const res = await fetch(exportUrl, { headers: { Authorization: `Bearer ${localStorage.getItem('ektl_token') || ''}` } });
            if (!res.ok) throw new Error('Gagal');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Musyawarah_${sel.kind}_${sel.date}.xlsx`;
            link.click();
            URL.revokeObjectURL(url);
        } catch (e) { toast.error('Gagal export'); }
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <div>
                <p className="tick-label text-muted-foreground">Catatan Rapat</p>
                <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">Musyawarah</h1>
                <p className="text-muted-foreground mt-2">Auto-save aktif · Ekspor .xlsx tersedia</p>
            </div>

            <Tabs value={kind} onValueChange={setKind}>
                <TabsList>
                    <TabsTrigger data-testid={MUSYAWARAH.tabs4S} value="4S">Musyawarah 4S</TabsTrigger>
                    <TabsTrigger data-testid={MUSYAWARAH.tabsTim7} value="TIM7">Tim 7</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* List */}
                <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-3 h-fit">
                    <Button data-testid={MUSYAWARAH.addBtn} onClick={create} className="w-full rounded-xl mb-3">
                        <Plus className="h-4 w-4 mr-2" /> Catatan Baru
                    </Button>
                    <div className="divide-y divide-border max-h-[500px] overflow-auto">
                        {items.length === 0 && <p className="p-3 text-sm text-muted-foreground">Belum ada catatan.</p>}
                        {items.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setSel(m)}
                                className={`w-full text-left p-3 rounded-lg my-1 hover:bg-muted/40 transition-colors ${sel?.id === m.id ? 'bg-muted' : ''}`}
                            >
                                <p className="font-medium text-sm truncate">{m.title || '(tanpa judul)'}</p>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">{m.date}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-6 min-h-[500px]">
                    {!sel ? (
                        <div className="h-full grid place-items-center text-center text-muted-foreground py-24">
                            <div>
                                <p>Pilih catatan atau buat baru.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs" data-testid={MUSYAWARAH.saveIndicator}>
                                    {saveState === 'saving' && <span className="inline-flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Menyimpan…</span>}
                                    {saveState === 'saved' && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" /> Tersimpan</span>}
                                    {saveState === 'idle' && <span className="text-muted-foreground">Auto-save aktif</span>}
                                </div>
                                <div className="flex gap-2">
                                    <Button data-testid={MUSYAWARAH.exportBtn} onClick={doExport} variant="outline" size="sm" className="rounded-full">
                                        <Download className="h-3.5 w-3.5 mr-1" /> Ekspor .xlsx
                                    </Button>
                                    <Button onClick={del} variant="outline" size="sm" className="rounded-full text-destructive border-destructive/30">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="tick-label">Judul</Label>
                                <Input
                                    data-testid={MUSYAWARAH.titleInput}
                                    value={sel.title}
                                    onChange={(e) => scheduleSave({ title: e.target.value })}
                                    className="h-14 text-xl font-display font-bold border-0 bg-transparent px-0 focus-visible:ring-0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="tick-label">Tanggal</Label>
                                <Input type="date" value={sel.date} onChange={(e) => scheduleSave({ date: e.target.value })} className="h-11 w-48" />
                            </div>
                            <div className="space-y-2">
                                <Label className="tick-label">Isi Catatan</Label>
                                <Textarea
                                    data-testid={MUSYAWARAH.contentInput}
                                    value={sel.content}
                                    onChange={(e) => scheduleSave({ content: e.target.value })}
                                    rows={16}
                                    className="font-mono text-sm resize-y"
                                    placeholder="Tulis catatan musyawarah di sini… mendukung baris kosong dan format teks bebas."
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
