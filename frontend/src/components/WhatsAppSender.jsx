import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Send, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { WA } from '@/constants/testIds/app';
import { useAuth } from '@/lib/auth';

function normalizePhone(p) {
    if (!p) return '';
    let n = String(p).replace(/\D/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    return n;
}

export default function WhatsAppSender({ open, onClose, defaultTemplate = 'harian', recipients = [], activityName = '' }) {
    const { publicCfg } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [tplId, setTplId] = useState(defaultTemplate);
    const [phone, setPhone] = useState(recipients?.[0]?.phone || publicCfg.admin_wa);
    const [body, setBody] = useState('');
    const [customBody, setCustomBody] = useState(false);

    useEffect(() => {
        if (!open) return;
        api.get('/wa/templates').then(({ data }) => {
            setTemplates(data.templates);
            const t = data.templates.find((x) => x.id === defaultTemplate) || data.templates[0];
            if (t) {
                setTplId(t.id);
                setBody(activityName ? t.body.replace('kegiatan pengajian', `kegiatan "${activityName}"`) : t.body);
            }
        });
    }, [open, defaultTemplate, activityName]);

    const pickTemplate = (t) => {
        setTplId(t.id);
        if (!customBody) setBody(activityName ? t.body.replace('kegiatan pengajian', `kegiatan "${activityName}"`) : t.body);
    };

    const waLinks = useMemo(() => {
        const list = recipients && recipients.length ? recipients : [{ id: 'single', name: 'Kontak', phone: phone }];
        return list
            .filter((r) => r.phone)
            .map((r) => ({
                name: r.name,
                phone: normalizePhone(r.phone),
                url: `https://wa.me/${normalizePhone(r.phone)}?text=${encodeURIComponent(body || '')}`,
            }));
    }, [recipients, body, phone]);

    const sendAll = () => {
        // Open first two in sequence to avoid popup blocker
        waLinks.slice(0, 30).forEach((w, i) => {
            setTimeout(() => window.open(w.url, '_blank', 'noreferrer'), i * 250);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle className="font-display flex items-center gap-2"><MessageCircle className="h-5 w-5 text-accent" /> Kirim WhatsApp</DialogTitle></DialogHeader>

                <div>
                    <p className="tick-label text-muted-foreground mb-2">Template</p>
                    <div className="flex flex-wrap gap-2">
                        {templates.map((t) => (
                            <button
                                key={t.id}
                                data-testid={WA.templatePill}
                                onClick={() => pickTemplate(t)}
                                className={`rounded-full px-3 py-1.5 text-xs border transition-colors ${tplId === t.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                            >
                                {t.title}
                            </button>
                        ))}
                    </div>
                </div>

                {recipients && recipients.length > 0 ? (
                    <div className="rounded-xl border border-border p-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-widest"><Users className="h-3.5 w-3.5" /> {recipients.length} Penerima</div>
                        <p className="mt-1 text-xs">{recipients.slice(0, 6).map((r) => r.name).join(', ')}{recipients.length > 6 ? '…' : ''}</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label className="tick-label">No. Tujuan</Label>
                        <Input data-testid={WA.phoneInput} value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 font-mono" placeholder="6281..." />
                    </div>
                )}

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label className="tick-label">Pesan</Label>
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            <input type="checkbox" checked={customBody} onChange={(e) => setCustomBody(e.target.checked)} /> Custom (edit bebas)
                        </label>
                    </div>
                    <Textarea data-testid={WA.bodyInput} value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose} className="rounded-full">Tutup</Button>
                    <Button data-testid={WA.sendBtn} onClick={sendAll} className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground">
                        <Send className="h-4 w-4 mr-2" /> {recipients.length > 1 ? `Buka WhatsApp (${recipients.length})` : 'Buka WhatsApp'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
