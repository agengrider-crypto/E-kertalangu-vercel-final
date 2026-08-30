import { useState } from 'react';
import { useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AUTH, APP } from '@/constants/testIds/app';
import { toast } from 'sonner';

const LOGO_IMG = '/assets/logo-ekertalangu.png';

export default function Login() {
    const { login, user } = useAuth();
    const { theme, toggle } = useTheme();
    const nav = useNavigate();
    const [sp] = useSearchParams();
    const rawNext = sp.get('next');
    const nextPath = rawNext && rawNext.startsWith('/') ? rawNext : '/app/dashboard';
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [roleOptions, setRoleOptions] = useState(null);

    if (user && user !== false && user !== null) {
        return <Navigate to={nextPath} replace />;
    }

    const finishLogin = (res) => {
        if (res.ok) {
            toast.success(`Selamat datang, ${res.user.name}`);
            nav(nextPath);
            return true;
        }
        return false;
    };

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErr('');
        const res = await login(identifier.trim(), password);
        setLoading(false);
        if (finishLogin(res)) return;
        if (res.needsRole) {
            setRoleOptions(res.roles);
        } else {
            setErr(res.error);
            toast.error(res.error);
        }
    };

    const chooseRole = async (role) => {
        setLoading(true);
        setErr('');
        const res = await login(identifier.trim(), password, role);
        setLoading(false);
        if (finishLogin(res)) return;
        setErr(res.error || 'Gagal masuk. Coba lagi.');
        setRoleOptions(null);
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-5 py-10 bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100 dark:from-background dark:via-background dark:to-muted noise">
            {/* Decorative blobs */}
            <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl animate-blob" />
            <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl animate-blob" style={{ animationDelay: '3s' }} />
            {/* Theme toggle */}
            <button
                data-testid={APP.themeToggle}
                onClick={toggle}
                className="fixed top-5 right-5 h-10 w-10 rounded-full border border-border bg-card/70 backdrop-blur grid place-items-center hover:bg-muted transition-colors"
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="w-full max-w-md relative animate-fade-in-up">
                {/* Logo */}
                <div className="flex flex-col items-center text-center">
                    <img
                        src={LOGO_IMG}
                        alt="E-Kertalangu"
                        className="w-44 sm:w-52 object-contain drop-shadow-md"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">
                        Absensi &amp; Manajemen Jamaah Pengajian
                    </p>
                </div>

                {/* Card */}
                <div className="mt-8 rounded-3xl bg-card/80 dark:bg-card/70 backdrop-blur-xl shadow-2xl shadow-emerald-900/10 border border-white/40 dark:border-border/60 p-6 sm:p-8 ring-1 ring-black/5">
                    {roleOptions ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-semibold">Masuk sebagai</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Akun Anda memiliki beberapa peran. Pilih salah satu.</p>
                            </div>
                            <div className="space-y-2">
                                {roleOptions.map((r) => (
                                    <Button
                                        key={r}
                                        data-testid={`login-role-${r}`}
                                        onClick={() => chooseRole(r)}
                                        disabled={loading}
                                        className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold"
                                    >
                                        {ROLE_LABELS[r] || r}
                                    </Button>
                                ))}
                            </div>
                            {err && (
                                <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
                                    {err}
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => { setRoleOptions(null); setErr(''); }}
                                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                            >
                                ← Kembali
                            </button>
                        </div>
                    ) : (
                    <form onSubmit={submit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="identifier" className="text-sm font-semibold">Email / Username / No. HP</Label>
                            <Input
                                id="identifier"
                                data-testid={AUTH.identifierInput}
                                autoFocus
                                autoComplete="username"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Email, username, atau no. HP"
                                className="h-12 rounded-xl bg-background"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    data-testid={AUTH.passwordInput}
                                    type={showPw ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 rounded-xl bg-background pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    data-testid={AUTH.togglePassword}
                                    type="button"
                                    onClick={() => setShowPw((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={showPw ? 'Sembunyikan' : 'Tampilkan'}
                                >
                                    {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>

                        {err && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
                                {err}
                            </div>
                        )}

                        <Button
                            data-testid={AUTH.submitBtn}
                            disabled={loading}
                            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold"
                        >
                            {loading ? 'Selamat datang…' : 'Masuk'}
                        </Button>
                    </form>
                    )}
                </div>

                {/* Footer links */}
                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <Link to="/forgot-password" className="hover:text-foreground transition-colors">
                        Lupa password?
                    </Link>
                    <span className="mx-2">·</span>
                    <Link to="/aktivasi" className="text-accent hover:underline font-medium">
                        Aktivasi akun
                    </Link>
                    <span className="mx-2">·</span>
                    <Link to="/register" className="text-accent hover:underline font-medium">
                        Daftar
                    </Link>
                </div>
                <p className="mt-4 text-center text-[11px] font-mono uppercase tracking-widest text-muted-foreground/70">
                    E-Kertalangu · Version V2.0
                </p>
            </div>
        </div>
    );
}
