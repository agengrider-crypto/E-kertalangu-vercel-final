import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Moon, Sun, ArrowRight, Sparkles, KeyRound, MessageCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { api, formatApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ForgotPassword() {
    const { user, publicCfg } = useAuth();
    const { theme, toggle } = useTheme();
    const nav = useNavigate();
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => { if (user && user !== false && user !== null) nav('/app/dashboard', { replace: true }); }, [user, nav]);

    const waText = () => [
        `Assalamu'alaikum Admin E-Kertalangu,`,
        ``,
        `Saya lupa password. Mohon reset akun saya:`,
        `• Identitas: ${identifier.trim()}`,
        ``,
        `Mohon dibuatkan password sementara. Jazakumullah khoiro 🙏`,
    ].join('\n');

    const submit = async (e) => {
        e.preventDefault();
        if (!identifier.trim()) { toast.error('Isi identitas Anda'); return; }
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { identifier: identifier.trim() });
            setSent(true);
            window.open(`https://wa.me/${publicCfg.admin_wa}?text=${encodeURIComponent(waText())}`, '_blank');
        } catch (e) { toast.error(formatApiError(e)); } finally { setLoading(false); }
    };

    const waResend = () => {
        window.open(`https://wa.me/${publicCfg.admin_wa}?text=${encodeURIComponent(waText())}`, '_blank');
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-5 bg-background">
            <div className="hidden lg:block lg:col-span-2 relative overflow-hidden bg-primary">
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/40" />
                <div className="relative z-10 h-full flex flex-col justify-between p-10 text-primary-foreground">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-accent grid place-items-center">
                            <Sparkles className="h-6 w-6 text-accent-foreground" />
                        </div>
                        <div>
                            <p className="tick-label opacity-80">Jamaah OS</p>
                            <p className="font-display font-black text-xl leading-none">E-KERTALANGU</p>
                        </div>
                    </div>
                    <div>
                        <p className="tick-label opacity-70 mb-3">Lupa Password?</p>
                        <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tight">
                            Tidak apa. Reset via WA saja.
                        </h1>
                        <p className="mt-4 text-sm opacity-80">Setelah mengisi form, WhatsApp akan otomatis terbuka. Admin akan verifikasi dan mengaktifkan password baru Anda.</p>
                    </div>
                    <p className="text-xs opacity-70 font-mono">© {new Date().getFullYear()} E-Kertalangu</p>
                </div>
            </div>

            <div className="lg:col-span-3 p-6 sm:p-10 relative noise">
                <div className="flex items-center justify-between">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">← Login</Link>
                    <button onClick={toggle} className="h-10 w-10 rounded-full border border-border grid place-items-center hover:bg-muted">
                        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                </div>

                <div className="mt-8 max-w-md mx-auto">
                    <p className="tick-label text-muted-foreground">RESET</p>
                    <h2 className="mt-2 font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none">Lupa password.</h2>
                    <p className="mt-3 text-sm text-muted-foreground">Isi identitas Anda. Pesan WA akan otomatis terbuka ke admin, lalu admin akan membuatkan password sementara untuk Anda.</p>

                    {sent ? (
                        <div className="mt-6 rounded-2xl border border-success/40 bg-success/10 p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-success grid place-items-center text-white">
                                    <MessageCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium">Permintaan terkirim</p>
                                    <p className="text-xs text-muted-foreground">Silakan lanjutkan chat dengan admin.</p>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Jika WhatsApp tidak terbuka otomatis, klik tombol di bawah.
                            </p>
                            <div className="flex gap-2">
                                <Button onClick={waResend} className="rounded-full flex-1">
                                    <MessageCircle className="h-4 w-4 mr-2" /> Buka WA
                                </Button>
                                <Link to="/login" className="flex-1">
                                    <Button variant="outline" className="rounded-full w-full">Kembali ke Login</Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="mt-6 space-y-4">
                            <div className="space-y-2">
                                <Label className="tick-label">Email / No. HP / Username</Label>
                                <Input value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="h-12 rounded-xl bg-card" placeholder="agengpadma8@gmail.com" required />
                                <p className="text-xs text-muted-foreground">Admin akan membuatkan password sementara dan mengirimkannya ke Anda via WhatsApp. Setelah masuk, segera ganti password.</p>
                            </div>
                            <Button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground group">
                                <KeyRound className="h-4 w-4 mr-2" />
                                {loading ? 'Mengirim…' : 'Kirim ke Admin via WhatsApp'}
                                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
                            </Button>
                            <p className="text-xs text-center text-muted-foreground">
                                Sudah ingat? <Link to="/login" className="text-accent hover:underline">Kembali ke Login</Link>
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
