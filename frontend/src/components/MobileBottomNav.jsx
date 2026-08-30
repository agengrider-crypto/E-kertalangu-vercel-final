import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, Users, Notebook, MoreHorizontal } from 'lucide-react';

// Bottom navigation khusus mobile. Urutan wajib: Dashboard | Kegiatan | Peserta | Musyawarah | More.
// Item disaring sesuai hak akses (allowedRoutes dari NAV_BY_ROLE); "More" selalu tampil.
const ITEMS = [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/activities', label: 'Kegiatan', icon: CalendarDays },
    { to: '/app/participants', label: 'Peserta', icon: Users },
    { to: '/app/musyawarah', label: 'Musyawarah', icon: Notebook },
    { to: '/app/more', label: 'More', icon: MoreHorizontal, always: true },
];

export default function MobileBottomNav({ allowedRoutes }) {
    const { pathname } = useLocation();
    const items = ITEMS.filter((i) => i.always || allowedRoutes.has(i.to));
    return (
        <nav
            data-testid="mobile-bottom-nav"
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.15)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
            <div className="flex items-stretch justify-around px-1">
                {items.map((it) => {
                    const active = it.to === '/app/more' ? pathname === '/app/more' : pathname.startsWith(it.to);
                    return (
                        <NavLink
                            key={it.to}
                            to={it.to}
                            data-testid={`bottomnav-${it.label.toLowerCase()}`}
                            className="flex-1 flex flex-col items-center gap-1 py-2 min-w-0 active:scale-95 transition-transform"
                        >
                            <span className={`flex items-center justify-center h-7 w-12 rounded-full transition-colors ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground'}`}>
                                <it.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 1.9} />
                            </span>
                            <span className={`text-[10px] leading-none truncate max-w-full ${active ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                {it.label}
                            </span>
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
