import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { api, formatApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const LOGO_IMG = '/assets/logo-ekertalangu.png';

export default function Activation() {
    const [q, setQ] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [searched, setSearched] = useState(false);
    const [selected, setSelected] = useState(null);
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const doSearch = async (e) => {
        e?.preventDefault();
        if (q.trim().length < 3) {
            toast.error('Ketik minimal 3 huruf nama Anda');
            return;
        }
        setSearching(true);
        try {
            const { data } = await api.get('/activation/search', { params: { q: q.trim() } });
            setResults(data.items || []);
            setSearched(true);
        } catch (err) {
            toast.error(formatApiError(err));
        } finally {
            setSearching(false);
        }
    };

    const activate = async (e) => {
        e.preventDefault();
        if (password.length < 6) { toast.error('Password minimal 6 karakter'); return; }
        if (password !== confirm) { toast.error('Konfirmasi password tidak sama'); return; }
        setSubmitting(true);
        try {
            const { data } = await api.post('/activation/activate', {
                participant_id: selected.id,
                phone: phone.trim(),
                password,
            });
            localStorage.setItem('ektl_token', data.token);
            toast.success('Aktivasi berhasil! Selamat datang.');
            window.location.href = '/app/dashboard';
        } catch (err) {
            toast.error(formatApiError(err));
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-gradient-to-b from-emerald-50 via-emerald-50 to-emerald-100 dark:from-background dark:via-background dark:to-muted">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center">
                    <img src={LOGO_IMG} alt="E-Kertalangu" className="w-40 object-contain" />
                    <p className="mt-2 text-sm text-muted-foreground">Aktivasi Akun Peserta</p>
                </div>

                <div className="mt-6 rounded-3xl bg-card shadow-xl border border-border/60 p-6 sm:p-8">
                    {!selected ? (
                        <>
                            <p className="text-sm text-muted-foreground mb-4">
                                Sudah didaftarkan pengurus? Cari nama Anda untuk mengaktifkan akun.
                            </p>
                            <form onSubmit={doSearch} className="flex gap-2">
                                <Input
                                    autoFocus
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Ketik nama lengkap Anda…"
                                    className="h-12 rounded-xl"
                                />
                                <Button type="submit" disabled={searching} className="h-12 rounded-xl px-4">
                                    <Search className="h-4 w-4" />
                                </Button>
                            </form>

                            <div className="mt-4 space-y-2">
                                {searched && results.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        Tidak ada peserta yang cocok / belum diaktivasi. Pastikan ejaan nama benar, atau hubungi pengurus.
                                    </p>
                                )}
                                {results.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => { setSelected(r); setPhone(''); }}
                                        className="w-full text-left rounded-xl border border-border p-3 hover:bg-muted transition-colors"
                                    >
                                        <p className="font-medium">{r.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            ID: {r.code}{r.phone_masked ? ` · HP ${r.phone_masked}` : ''}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <form onSubmit={activate} className="space-y-4">
                            <button type="button" onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="h-4 w-4" /> Ganti nama
                            </button>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Nama Lengkap</Label>
                                <Input value={selected.name} readOnly className="h-12 rounded-xl bg-muted" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Nomor HP</Label>
                                <Input
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="08xxxxxxxxxx"
                                    inputMode="numeric"
                                    className="h-12 rounded-xl"
                                    required
                                />
                                <p className="text-xs text-muted-foreground">Nomor HP dipakai untuk login.</p>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Password</Label>
                                <div className="relative">
                                    <Input
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Minimal 6 karakter"
                                        className="h-12 rounded-xl pr-12"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                        {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">Konfirmasi Password</Label>
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="Ulangi password"
                                    className="h-12 rounded-xl"
                                    required
                                />
                            </div>
                            <Button type="submit" disabled={submitting} className="w-full h-12 rounded-xl gap-2 text-base font-semibold">
                                <UserCheck className="h-4 w-4" />
                                {submitting ? 'Memproses…' : 'Aktivasi Akun'}
                            </Button>
                        </form>
                    )}
                </div>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Sudah punya akun?{' '}
                    <Link to="/login" className="text-accent hover:underline font-medium">Masuk</Link>
                </div>
            </div>
        </div>
    );
}
