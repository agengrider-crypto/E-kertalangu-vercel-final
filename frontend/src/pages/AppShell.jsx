import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth, ROLE_LABELS } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { api } from '@/lib/api';
import {
    LayoutDashboard, Users, CalendarDays, ScanLine, ClipboardList, ScrollText, Download,
    LogOut, Moon, Sun, Sparkles, Menu, X, Notebook, UserRound, ShieldCheck, Megaphone, Eye, FileBarChart, Archive,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { APP } from '@/constants/testIds/app';
import NotificationBell from '@/components/NotificationBell';
import MobileBottomNav from '@/components/MobileBottomNav';
import { toast } from 'sonner';

const APP_VERSION = 'V2.0';

export const NAV_BY_ROLE = {
    admin: [
        { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/app/participants', label: 'Peserta', icon: Users },
        { to: '/app/archive', label: 'Data Arsip', icon: Archive },
        { to: '/app/activities', label: 'Kegiatan', icon: CalendarDays },
        { to: '/app/announcements', label: 'Pengumuman', icon: Megaphone },
        { to: '/app/musyawarah', label: 'Musyawarah', icon: Notebook },
        { to: '/app/reports', label: 'Laporan', icon: FileBarChart },
        { to: '/app/activity-log', label: 'Log Aktivitas', icon: ScrollText },
        { to: '/app/users', label: 'Pengguna & Hak', icon: ShieldCheck },
        { to: '/app/backup', label: 'Backup', icon: Download },
        { to: '/app/me', label: 'Profil Saya', icon: UserRound },
    ],
    pengurus: [
        { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/app/participants', label: 'Peserta', icon: Users },
        { to: '/app/activities', label: 'Kegiatan', icon: CalendarDays },
        { to: '/app/announcements', label: 'Pengumuman', icon: Megaphone },
        { to: '/app/musyawarah', label: 'Musyawarah', icon: Notebook },
        { to: '/app/reports', label: 'Laporan', icon: FileBarChart },
        { to: '/app/backup', label: 'Ekspor', icon: Download },
        { to: '/app/me', label: 'Profil Saya', icon: UserRound },
    ],
    peserta: [
        { to: '/app/dashboard', label: 'Beranda', icon: LayoutDashboard },
        { to: '/app/activities', label: 'Jadwal', icon: CalendarDays },
        { to: '/app/announcements', label: 'Pengumuman', icon: Megaphone },
        { to: '/app/scan', label: 'Absen Mandiri', icon: ScanLine },
        { to: '/app/me', label: 'QR & Profil', icon: UserRound },
    ],
};

function RoleSwitcher({ realRole, effectiveRole, allowedPreviews, onSelect, compact = false }) {
    if (!realRole || allowedPreviews.length === 0) return null;
    const roles = [realRole, ...allowedPreviews];
    return (
        <div className={compact ? 'w-full' : 'w-full'}>
            <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <Eye className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Lihat sebagai</span>
            </div>
            <div className="flex items-center rounded-full bg-muted p-1 gap-1">
                {roles.map((r) => {
                    const active = effectiveRole === r;
                    return (
                        <button
                            key={r}
                            data-testid={`role-switch-${r}`}
                            onClick={() => onSelect(r)}
                            className={`flex-1 text-xs font-medium rounded-full px-2 py-1.5 transition-colors ${
                                active
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {ROLE_LABELS[r] || r}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default function AppShell() {
    const { user, logout, realRole, previewRole, allowedPreviews, setPreviewRole } = useAuth();
    const { theme, toggle } = useTheme();
    const nav = useNavigate();
    const [pending, setPending] = useState(0);

    const handlePreview = (role) => {
        setPreviewRole(role);
        nav('/app/dashboard');
    };

    useEffect(() => {
        if (user?.role !== 'admin') return;
        const fetch = () => api.get('/auth/pending-count').then(({ data }) => setPending(data.count || 0)).catch(() => {});
        fetch();
        const iv = setInterval(fetch, 30000);
        return () => clearInterval(iv);
    }, [user]);

    const items = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.peserta;
    const todayLabel = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const shortDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

    const handleLogout = async () => {
        await logout();
        toast.success('Berhasil keluar. Sampai jumpa!');
        nav('/login', { replace: true });
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Sidebar (desktop) */}
            <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-card z-30">
                <div className="p-5 flex items-center gap-3">
                    <img src="/assets/logo-ekertalangu.png" alt="E-Kertalangu" className="h-11 w-11 rounded-2xl object-contain bg-primary/5 p-1" />
                    <div>
                        <p className="tick-label text-muted-foreground">Jamaah OS</p>
                        <p className="font-display font-black leading-none">E-KERTALANGU</p>
                    </div>
                </div>
                <div className="px-5 -mt-2 mb-1">
                    <p className="text-[11px] text-muted-foreground capitalize">{todayLabel}</p>
                </div>
                <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
                    {items.map((it) => {
                        const badge = it.to === '/app/users' && pending > 0 ? pending : null;
                        return (
                            <NavLink
                                key={it.to}
                                to={it.to}
                                data-testid={`nav-${it.to.split('/').pop()}`}
                                className={({ isActive }) =>
                                    `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                                            : 'text-foreground/80 hover:bg-muted hover:text-foreground hover:translate-x-1'
                                    }`
                                }
                            >
                                <it.icon className="h-4 w-4 transition-transform group-hover:scale-110" />
                                <span className="flex-1">{it.label}</span>
                                {badge && (
                                    <span className="text-[10px] font-bold rounded-full bg-accent text-accent-foreground px-1.5 py-0.5 min-w-[20px] text-center">
                                        {badge}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
                <div className="p-3 border-t border-border">
                    <div className="mb-3">
                        <RoleSwitcher
                            realRole={realRole}
                            effectiveRole={user?.role}
                            allowedPreviews={allowedPreviews}
                            onSelect={handlePreview}
                        />
                    </div>
                    <div className="flex items-center justify-between mb-3 px-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button data-testid="profile-menu-trigger" className="flex items-center gap-2 rounded-xl px-1.5 py-1 -mx-1.5 hover:bg-muted transition-colors min-w-0 max-w-[150px]">
                                    <div className="h-8 w-8 rounded-full bg-accent grid place-items-center text-accent-foreground text-sm font-bold flex-shrink-0">
                                        {(user?.name || 'U').slice(0, 1)}
                                    </div>
                                    <div className="min-w-0 text-left">
                                        <p className="text-sm font-medium truncate">{user?.name}</p>
                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{user?.role}</p>
                                    </div>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" side="top" className="w-48">
                                <DropdownMenuLabel className="truncate">{user?.name}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem data-testid="profile-menu-me" onClick={() => nav('/app/me')}>
                                    <UserRound className="h-4 w-4 mr-2" /> Profil Saya
                                </DropdownMenuItem>
                                <DropdownMenuItem data-testid="profile-menu-logout" onClick={handleLogout} className="text-destructive focus:text-destructive">
                                    <LogOut className="h-4 w-4 mr-2" /> Keluar
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex items-center gap-2">
                            <button
                                data-testid={APP.themeToggle}
                                onClick={toggle}
                                className="h-8 w-8 rounded-full border border-border grid place-items-center hover:bg-muted"
                            >
                                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </button>
                            <NotificationBell direction="up" />
                        </div>
                    </div>
                    <Button
                        data-testid={APP.logout}
                        onClick={handleLogout}
                        variant="outline"
                        className="w-full justify-start gap-2 rounded-xl"
                    >
                        <LogOut className="h-4 w-4" /> Keluar
                    </Button>
                </div>
            </aside>

            {/* Topbar (mobile) — app-like: sapaan + notifikasi */}
            <div className="lg:hidden sticky top-0 z-30 glass px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 pl-1">
                    <div className="h-9 w-9 rounded-full bg-accent grid place-items-center text-accent-foreground text-sm font-bold flex-shrink-0">
                        {(user?.name || 'U').slice(0, 1)}
                    </div>
                    <div className="min-w-0 leading-tight">
                        <p className="text-sm font-semibold truncate" data-testid="mobile-greeting">Halo, {user?.name?.split(' ')[0] || 'User'}</p>
                        <p className="text-[10px] text-muted-foreground truncate capitalize">{user?.role} · {shortDate}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <NotificationBell direction="down" />
                    <button onClick={toggle} className="p-2 rounded-lg active:scale-90 transition-transform">
                        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            <main className="lg:pl-64 min-h-screen flex flex-col">
                <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-10 pb-28 lg:pb-10 flex-1">
                    {previewRole && (
                        <div
                            data-testid="preview-banner"
                            className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3"
                        >
                            <div className="flex items-center gap-2 text-sm">
                                <Eye className="h-4 w-4 text-accent" />
                                <span>
                                    Mode Preview: melihat sebagai{' '}
                                    <span className="font-semibold">{ROLE_LABELS[previewRole] || previewRole}</span>
                                </span>
                            </div>
                            <button
                                data-testid="preview-exit"
                                onClick={() => handlePreview(realRole)}
                                className="text-sm font-medium text-accent hover:underline whitespace-nowrap"
                            >
                                Kembali ke {ROLE_LABELS[realRole] || realRole}
                            </button>
                        </div>
                    )}
                    <Outlet />
                </div>
                <footer data-testid="app-footer" className="mt-auto border-t border-border hidden lg:block">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                        <p>© {new Date().getFullYear()} E-Kertalangu · Jamaah OS</p>
                        <p className="font-mono uppercase tracking-widest" data-testid="app-version">Version {APP_VERSION}</p>
                    </div>
                </footer>
            </main>

            {/* Bottom navigation (mobile only) */}
            <MobileBottomNav allowedRoutes={new Set(items.map((i) => i.to))} />
        </div>
    );
}
