import { Link } from 'react-router-dom';
import { ChevronRight, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { NAV_BY_ROLE } from '@/pages/AppShell';
import { Button } from '@/components/ui/button';

// Halaman "More" (mobile) — kumpulan menu tambahan sesuai hak akses role.
// Menu utama (Dashboard/Kegiatan/Peserta/Musyawarah) tidak diulang di sini.
const PRIMARY = new Set(['/app/dashboard', '/app/activities', '/app/participants', '/app/musyawarah']);

export default function MorePage() {
    const { user, logout } = useAuth();
    const all = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.peserta;
    const items = all.filter((i) => !PRIMARY.has(i.to));

    return (
        <div className="animate-fade-in-up space-y-5">
            <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 grid place-items-center text-primary font-display font-black text-lg">
                    {(user?.name || 'U').slice(0, 1)}
                </div>
                <div className="min-w-0">
                    <p className="font-display font-black text-xl truncate">{user?.name}</p>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{user?.role}</p>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {items.map((it) => (
                    <Link
                        key={it.to}
                        to={it.to}
                        data-testid={`more-item-${it.to.split('/').pop()}`}
                        className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 active:bg-muted transition-colors"
                    >
                        <span className="h-9 w-9 rounded-xl bg-primary/10 grid place-items-center text-primary flex-shrink-0">
                            <it.icon className="h-5 w-5" />
                        </span>
                        <span className="flex-1 text-sm font-medium">{it.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                ))}
            </div>

            <Button
                data-testid="more-logout"
                onClick={logout}
                variant="outline"
                className="w-full justify-center gap-2 rounded-xl text-destructive border-destructive/30"
            >
                <LogOut className="h-4 w-4" /> Keluar
            </Button>

            <p className="text-center text-[11px] font-mono uppercase tracking-widest text-muted-foreground/70">
                E-Kertalangu · Version V2.0
            </p>
        </div>
    );
}
