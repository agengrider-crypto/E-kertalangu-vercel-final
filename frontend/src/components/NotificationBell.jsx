import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { api } from '@/lib/api';

export default function NotificationBell({ direction = 'up' }) {
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const nav = useNavigate();
    const boxRef = useRef(null);

    const load = async () => {
        try {
            const { data } = await api.get('/notifications');
            setItems(data.items || []);
            setUnread(data.unread || 0);
        } catch { /* ignore */ }
    };

    useEffect(() => {
        load();
        const iv = setInterval(load, 30000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        const onDoc = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const openItem = async (n) => {
        if (!n.read) {
            try { await api.post(`/notifications/${n.id}/read`); } catch { /* ignore */ }
            load();
        }
        setOpen(false);
        if (n.activity_id) nav(`/app/activities/${n.activity_id}`);
    };

    const markAll = async () => {
        try { await api.post('/notifications/read-all'); } catch { /* ignore */ }
        load();
    };

    return (
        <div className="relative" ref={boxRef}>
            <button
                data-testid="notif-bell"
                onClick={() => setOpen((v) => !v)}
                className="relative h-8 w-8 rounded-full border border-border grid place-items-center hover:bg-muted"
                aria-label="Notifikasi"
            >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 text-[9px] font-bold rounded-full bg-accent text-accent-foreground min-w-[16px] h-4 px-1 grid place-items-center">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className={`absolute ${direction === 'down' ? 'top-full mt-2' : 'bottom-full mb-2'} right-0 w-80 max-h-96 overflow-auto rounded-2xl border border-border bg-card shadow-xl z-50`}>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card">
                        <p className="font-display font-bold text-sm">Notifikasi</p>
                        {unread > 0 && (
                            <button onClick={markAll} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                                <Check className="h-3 w-3" /> Tandai semua
                            </button>
                        )}
                    </div>
                    {items.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-muted-foreground text-center">Belum ada notifikasi.</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {items.map((n) => (
                                <button
                                    key={n.id}
                                    onClick={() => openItem(n)}
                                    className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors ${n.read ? '' : 'bg-accent/5'}`}
                                >
                                    <div className="flex items-start gap-2">
                                        {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />}
                                        <div className={n.read ? 'opacity-70' : ''}>
                                            <p className="text-sm font-medium">{n.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
