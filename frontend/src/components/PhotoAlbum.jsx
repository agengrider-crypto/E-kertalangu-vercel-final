import { useEffect, useRef, useState } from 'react';
import { api, formatApiError, API_BASE, BACKEND_URL } from '@/lib/api';
import { useConfirm } from '@/lib/confirm';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Camera, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PhotoAlbum({ activityId, canEdit }) {
    const confirm = useConfirm();
    const [items, setItems] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [lightbox, setLightbox] = useState(null);
    const inputRef = useRef(null);

    const load = async () => {
        try {
            const { data } = await api.get(`/activities/${activityId}/photos`);
            setItems(data.items);
        } catch (e) { toast.error(formatApiError(e)); }
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [activityId]);

    const onUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        setUploading(true);
        for (const f of files) {
            try {
                const fd = new FormData();
                fd.append('file', f);
                fd.append('caption', '');
                await api.post(`/activities/${activityId}/photos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            } catch (e) { toast.error(`${f.name}: ${formatApiError(e)}`); }
        }
        setUploading(false);
        e.target.value = '';
        load();
        toast.success('Upload selesai');
    };

    const del = async (id) => {
        if (!(await confirm({ title: 'Hapus Foto', description: 'Hapus foto ini?', confirmText: 'Hapus' }))) return;
        try { await api.delete(`/photos/${id}`); load(); toast.success('Foto dihapus'); }
        catch (e) { toast.error(formatApiError(e)); }
    };

    const abs = (u) => u.startsWith('http') ? u : `${BACKEND_URL}${u}`;

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="tick-label text-muted-foreground">Album Foto ({items.length})</p>
                {canEdit && (
                    <>
                        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={onUpload} />
                        <Button onClick={() => inputRef.current?.click()} disabled={uploading} size="sm" variant="outline" className="rounded-full">
                            <Upload className="h-3.5 w-3.5 mr-1" /> {uploading ? 'Meng-upload…' : 'Upload Foto'}
                        </Button>
                    </>
                )}
            </div>
            {items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                    <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Belum ada foto dokumentasi.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {items.map((p) => (
                        <div key={p.id} className="relative group aspect-square rounded-xl overflow-hidden bg-muted">
                            <img
                                src={abs(p.url)}
                                alt={p.caption || ''}
                                className="w-full h-full object-cover cursor-pointer transition-transform group-hover:scale-105"
                                onClick={() => setLightbox(p)}
                            />
                            {canEdit && (
                                <button
                                    onClick={() => del(p.id)}
                                    className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-destructive text-destructive-foreground grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label="Delete"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {lightbox && (
                <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4 cursor-zoom-out">
                    <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                        <img src={abs(lightbox.url)} alt="" className="max-h-[90vh] max-w-full object-contain rounded-2xl" />
                        <button onClick={() => setLightbox(null)} className="absolute -top-3 -right-3 h-9 w-9 rounded-full bg-white text-black grid place-items-center">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
