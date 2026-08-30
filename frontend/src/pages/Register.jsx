import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Moon, Sun, ArrowRight, Sparkles, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { api, formatApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { APP } from '@/constants/testIds/app';
import { toast } from 'sonner';

const MOSQUE_IMG = 'https://images.pexels.com/photos/36232116/pexels-photo-36232116.jpeg';

export default function Register() {
    const { user, setUser, publicCfg } = useAuth();
    const { theme, toggle } = useTheme();
    const nav = useNavigate();

    const [form, setForm] = useState({
        name: '', email: '', username: '', phone: '', password: '',
        gender: 'L', birth_place: '', birth_date: '', education: '',
    });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState('');
    const [pendingMsg, setPendingMsg] = useState(null);

    useEffect(() => {
        if (user && user !== false && user !== null) nav('/app/dashboard', { replace: true });
    }, [user, nav]);

    const setF = (k, v) => setForm((s) => ({ ...s, [k]: v }));

    const submit = async (e) => {
        e.preventDefault();
        setErr('');
        if (!form.name.trim()) { setErr('Nama wajib diisi'); return; }
        if (!(form.email || form.username || form.phone)) { setErr('Isi salah satu: email, username, atau nomor HP'); return; }
        if (form.password.length < 4) { setErr('Password minimal 4 karakter'); return; }
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', form);
            if (data.pending) {
                setPendingMsg({
                    text: data.message || 'Pendaftaran diterima. Menunggu persetujuan admin.',
                    warning: data.password_warning,
                    user: data.user,
                });
                toast.success('Pendaftaran diterima. Menunggu approval admin.');
            } else if (data.token) {
                localStorage.setItem('ektl_token', data.token);
                setUser(data.user);
                toast.success(`Selamat datang, ${data.user.name}.`);
                nav('/app/dashboard');
            }
        } catch (ex) {
            setErr(formatApiError(ex));
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-5 bg-background">
            <div className="hidden lg:block lg:col-span-2 relative overflow-hidden">
                <img src={MOSQUE_IMG} alt="Mosque" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-background/40" />
                <div className="relative z-10 h-full flex flex-col justify-between p-10 text-primary-foreground">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-accent flex items-center justify-center">
                            <Sparkles className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                            <p className="tick-label opacity-80">Jamaah OS · WITA</p>
                            <p className="font-display font-black text-xl leading-none">E-KERTALANGU</p>
                        </div>
                    </div>
                    <div>
                        <p className="tick-label opacity-70 mb-3">Daftar</p>
                        <h1 className="font-display font-black text-4xl xl:text-5xl leading-[0.95] tracking-tight">
                            Bergabung menjadi bagian jamaah.
                        </h1>
                        <p className="mt-4 text-sm opacity-80">Setelah daftar, QR peserta akan otomatis dibuat untuk absensi.</p>
                    </div>
                    <p className="text-xs opacity-70 font-mono">© {new Date().getFullYear()} E-Kertalangu</p>
                </div>
            </div>

            <div className="lg:col-span-3 p-6 sm:p-10 relative noise">
                <div className="flex items-center justify-between">
                    <Link to="/" className="lg:hidden flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-display font-black">E-Kertalangu</span>
                    </Link>
                    <span className="hidden lg:block" />
                    <button
                        data-testid={APP.themeToggle}
                        onClick={toggle}
                        className="h-10 w-10 rounded-full border border-border grid place-items-center hover:bg-muted transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                </div>

                <div className="mt-8 max-w-xl mx-auto">
                    {pendingMsg ? (
                        <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
                            <p className="tick-label text-muted-foreground">MENUNGGU APPROVAL</p>
                            <h2 className="font-display font-black text-3xl tracking-tighter leading-none">Assalamu'alaikum, {pendingMsg.user.name}.</h2>
                            <p className="text-sm text-muted-foreground">{pendingMsg.text}</p>
                            {pendingMsg.warning && (
                                <div className="rounded-lg border border-warning/30 bg-warning/10 text-warning text-xs px-3 py-2">
                                    {pendingMsg.warning}
                                </div>
                            )}
                            <div className="rounded-xl bg-muted p-4 text-sm">
                                <p className="tick-label text-muted-foreground mb-2">Identitas Anda</p>
                                <p className="font-mono text-xs">Nama: <span className="text-foreground">{pendingMsg.user.name}</span></p>
                                {pendingMsg.user.email && <p className="font-mono text-xs">Email: <span className="text-foreground">{pendingMsg.user.email}</span></p>}
                                {pendingMsg.user.username && <p className="font-mono text-xs">Username: <span className="text-foreground">{pendingMsg.user.username}</span></p>}
                                {pendingMsg.user.phone && <p className="font-mono text-xs">HP: <span className="text-foreground">{pendingMsg.user.phone}</span></p>}
                            </div>
                            <div className="flex gap-3">
                                <a
                                    href={`https://wa.me/${publicCfg.admin_wa}?text=${encodeURIComponent(
                                        [
                                            `Assalamu'alaikum Admin E-Kertalangu,`,
                                            ``,
                                            `Saya baru mendaftar sebagai jamaah. Berikut detail saya:`,
                                            `• Nama: ${pendingMsg.user.name}`,
                                            pendingMsg.user.email ? `• Email: ${pendingMsg.user.email}` : null,
                                            pendingMsg.user.username ? `• Username: ${pendingMsg.user.username}` : null,
                                            pendingMsg.user.phone ? `• HP: ${pendingMsg.user.phone}` : null,
                                            `• Password saya: ${form.password}`,
                                            ``,
                                            `Mohon di-approve. Terima kasih 🙏`,
                                        ].filter(Boolean).join('\n')
                                    )}`}
                                    target="_blank" rel="noreferrer"
                                >
                                    <Button className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground">
                                        <UserPlus className="h-4 w-4 mr-2" /> Kirim ke Admin via WA
                                    </Button>
                                </a>
                                <Link to="/login"><Button variant="outline" className="rounded-full">Ke Login</Button></Link>
                            </div>
                        </div>
                    ) : (
                        <>
                    <p className="tick-label text-muted-foreground">DAFTAR · 02</p>
                    <h2 className="mt-2 font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none">
                        Buat akun jamaah.
                    </h2>
                    <p className="mt-2 text-muted-foreground text-sm">Isi minimal salah satu dari email, username, atau nomor HP. QR peserta akan dibuat otomatis.</p>

                    <form onSubmit={submit} className="mt-6 grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label className="tick-label">Nama Lengkap *</Label>
                            <Input data-testid="register-name-input" value={form.name} onChange={(e) => setF('name', e.target.value)} className="h-12 rounded-xl bg-card" placeholder="Ahmad Fauzi" required />
                        </div>
                        <div className="space-y-2">
                            <Label className="tick-label">Email</Label>
                            <Input data-testid="register-email-input" type="email" value={form.email} onChange={(e) => setF('email', e.target.value)} className="h-12 rounded-xl bg-card" placeholder="nama@email.com" />
                        </div>
                        <div className="space-y-2">
                            <Label className="tick-label">Username</Label>
                            <Input value={form.username} onChange={(e) => setF('username', e.target.value)} className="h-12 rounded-xl bg-card" placeholder="ahmadf" />
                        </div>
                        <div className="space-y-2">
                            <Label className="tick-label">No. HP</Label>
                            <Input value={form.phone} onChange={(e) => setF('phone', e.target.value)} className="h-12 rounded-xl bg-card" placeholder="0812…" />
                        </div>
                        <div className="space-y-2">
                            <Label className="tick-label">Jenis Kelamin</Label>
                            <Select value={form.gender} onValueChange={(v) => setF('gender', v)}>
                                <SelectTrigger className="h-12 rounded-xl bg-card"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="L">Laki-laki</SelectItem>
                                    <SelectItem value="P">Perempuan</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="tick-label">Tempat Lahir</Label>
                            <Input value={form.birth_place} onChange={(e) => setF('birth_place', e.target.value)} className="h-12 rounded-xl bg-card" placeholder="Denpasar" />
                        </div>
                        <div className="space-y-2">
                            <Label className="tick-label">Tanggal Lahir</Label>
                            <Input type="date" value={form.birth_date} onChange={(e) => setF('birth_date', e.target.value)} className="h-12 rounded-xl bg-card" />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="tick-label">Pendidikan</Label>
                            <Input value={form.education} onChange={(e) => setF('education', e.target.value)} className="h-12 rounded-xl bg-card" placeholder="Contoh: S1 Teknik" />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="tick-label">Password *</Label>
                            <div className="relative">
                                <Input
                                    data-testid="register-password-input"
                                    type={showPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setF('password', e.target.value)}
                                    className="h-12 rounded-xl bg-card pr-12"
                                    placeholder="Minimal 6 karakter"
                                    required
                                />
                                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        {err && (
                            <div className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
                                {err}
                            </div>
                        )}

                        <div className="col-span-2 flex flex-col sm:flex-row gap-3 mt-2">
                            <Button
                                data-testid="register-submit-btn"
                                type="submit"
                                disabled={loading}
                                className="h-12 rounded-full bg-primary hover:bg-primary/90 flex-1 group"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                {loading ? 'Mendaftarkan…' : 'Buat Akun Jamaah'}
                                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </div>

                        <p className="col-span-2 text-sm text-center text-muted-foreground pt-2">
                            Sudah punya akun?{' '}
                            <Link to="/login" className="text-accent hover:underline font-medium">
                                Masuk di sini
                            </Link>
                        </p>
                    </form>
                    </>
                    )}
                </div>
            </div>
        </div>
    );
}
