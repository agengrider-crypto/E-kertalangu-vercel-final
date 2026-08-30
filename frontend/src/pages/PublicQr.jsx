import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Printer, ArrowLeft, Copy, Check, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { API_BASE } from '@/lib/api';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';

export default function PublicQr() {
    const [copied, setCopied] = useState(false);
    const registerUrl = `${window.location.origin}/register`;
    const activationUrl = `${window.location.origin}/aktivasi`;
    const qrUrl = `${API_BASE}/qr/register-public?base_url=${encodeURIComponent(window.location.origin)}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(registerUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
            toast.success('Link disalin');
        } catch { toast.error('Gagal menyalin'); }
    };

    const copyActivationLink = async () => {
        try {
            await navigator.clipboard.writeText(activationUrl);
            toast.success('Link aktivasi disalin');
        } catch { toast.error('Gagal menyalin'); }
    };

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto p-6 sm:p-10">
                <div className="flex justify-between items-center">
                    <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Login</Link>
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-xl bg-primary grid place-items-center">
                            <Sparkles className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <span className="font-display font-black">E-KERTALANGU</span>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-card p-8 text-center noise relative overflow-hidden">
                        <p className="tick-label text-muted-foreground">DAFTAR JAMAAH</p>
                        <h1 className="font-display font-black text-3xl lg:text-4xl tracking-tighter leading-none mt-2">Scan untuk Daftar</h1>
                        <div className="mt-6 mx-auto w-72 h-72 bg-white rounded-2xl grid place-items-center p-4 shadow-sm">
                            <img src={qrUrl} alt="QR Daftar" className="w-full h-full object-contain" />
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mt-3 break-all">{registerUrl}</p>
                    </div>

                    <div className="rounded-3xl border border-border bg-primary text-primary-foreground p-8 flex flex-col justify-between min-h-[400px]">
                        <div>
                            <p className="tick-label opacity-80">Panduan · 3 Langkah</p>
                            <h2 className="font-display font-black text-3xl mt-2 tracking-tighter leading-none">
                                Bergabung Cepat.
                            </h2>
                            <ol className="mt-8 space-y-4 text-sm">
                                <li className="flex gap-3">
                                    <span className="h-7 w-7 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold flex-shrink-0">1</span>
                                    <span>Buka kamera HP Anda, arahkan ke QR di sebelah.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="h-7 w-7 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold flex-shrink-0">2</span>
                                    <span>Isi data (Nama, Email/HP/Username, Password).</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="h-7 w-7 rounded-full bg-accent text-accent-foreground grid place-items-center font-bold flex-shrink-0">3</span>
                                    <span>Langsung aktif — bisa login &amp; lihat QR peserta pribadi Anda.</span>
                                </li>
                            </ol>
                        </div>
                        <div className="pt-6 border-t border-primary-foreground/20 print:hidden flex flex-col sm:flex-row gap-2">
                            <Button onClick={() => window.print()} variant="secondary" className="rounded-full flex-1">
                                <Printer className="h-4 w-4 mr-2" /> Cetak Poster
                            </Button>
                            <Button onClick={copyLink} variant="outline" className="rounded-full flex-1 bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10">
                                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />} Salin Link
                            </Button>
                        </div>
                    </div>
                </div>

                {/* QR Aktivasi — untuk peserta yang sudah didaftarkan pengurus (hasil import) */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 print:grid-cols-2">
                    <div className="rounded-3xl border border-border bg-card p-8 text-center noise relative overflow-hidden">
                        <p className="tick-label text-muted-foreground">AKTIVASI AKUN</p>
                        <h1 className="font-display font-black text-3xl lg:text-4xl tracking-tighter leading-none mt-2">Scan untuk Aktivasi</h1>
                        <div className="mt-6 mx-auto w-72 h-72 bg-white rounded-2xl grid place-items-center p-4 shadow-sm">
                            <QRCodeCanvas value={activationUrl} size={256} includeMargin level="M" />
                        </div>
                        <p className="font-mono text-xs text-muted-foreground mt-3 break-all">{activationUrl}</p>
                    </div>

                    <div className="rounded-3xl border border-border bg-accent text-accent-foreground p-8 flex flex-col justify-between min-h-[400px]">
                        <div>
                            <p className="tick-label opacity-80">Sudah didaftarkan pengurus?</p>
                            <h2 className="font-display font-black text-3xl mt-2 tracking-tighter leading-none">
                                Aktifkan Akun.
                            </h2>
                            <ol className="mt-8 space-y-4 text-sm">
                                <li className="flex gap-3">
                                    <span className="h-7 w-7 rounded-full bg-accent-foreground/15 grid place-items-center font-bold flex-shrink-0">1</span>
                                    <span>Scan QR di sebelah, lalu cari nama lengkap Anda.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="h-7 w-7 rounded-full bg-accent-foreground/15 grid place-items-center font-bold flex-shrink-0">2</span>
                                    <span>Isi Nomor HP &amp; buat Password.</span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="h-7 w-7 rounded-full bg-accent-foreground/15 grid place-items-center font-bold flex-shrink-0">3</span>
                                    <span>Aktivasi selesai — langsung bisa login &amp; absen.</span>
                                </li>
                            </ol>
                        </div>
                        <div className="pt-6 border-t border-accent-foreground/20 print:hidden">
                            <Button onClick={copyActivationLink} variant="outline" className="rounded-full w-full bg-transparent text-accent-foreground border-accent-foreground/30 hover:bg-accent-foreground/10">
                                <UserCheck className="h-4 w-4 mr-2" /> Salin Link Aktivasi
                            </Button>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground mt-8 text-center font-mono print:hidden">
                    Tempel poster ini di majelis / masjid / grup WA. Setiap pendaftaran akan masuk ke antrian approval admin.
                </p>
            </div>
        </div>
    );
}
