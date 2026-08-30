import { useEffect, useState } from 'react';
import { api, formatApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

export default function MyProfile() {
    const { user } = useAuth();
    const [pw, setPw] = useState({ current_password: '', new_password: '' });
    const [participant, setParticipant] = useState(null);

    useEffect(() => {
        if (user?.participant_id) {
            api.get(`/participants/${user.participant_id}`).then(({ data }) => setParticipant(data)).catch(() => {});
        }
    }, [user]);

    const changePw = async () => {
        try {
            const { data } = await api.post('/auth/change-password', pw);
            if (data?.token) localStorage.setItem('ektl_token', data.token);
            toast.success('Password diperbarui');
            setPw({ current_password: '', new_password: '' });
        } catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div className="animate-fade-in-up space-y-6">
            <div>
                <p className="tick-label text-muted-foreground">Profil</p>
                <h1 className="font-display font-black text-4xl sm:text-5xl tracking-tighter leading-none mt-1">{user.name}</h1>
                <p className="text-muted-foreground mt-2 uppercase tracking-widest text-xs">{user.role}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                    <p className="tick-label text-muted-foreground">Kontak</p>
                    <div className="grid grid-cols-3 text-sm gap-y-2">
                        <span className="text-muted-foreground">Email</span>
                        <span className="col-span-2 font-mono">{user.email || '—'}</span>
                        <span className="text-muted-foreground">Username</span>
                        <span className="col-span-2 font-mono">{user.username || '—'}</span>
                        <span className="text-muted-foreground">No. HP</span>
                        <span className="col-span-2 font-mono">{user.phone || '—'}</span>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
                    <p className="tick-label text-muted-foreground">Ganti Password</p>
                    <div className="space-y-2">
                        <Label className="tick-label">Password Saat Ini</Label>
                        <Input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} className="h-11" />
                    </div>
                    <div className="space-y-2">
                        <Label className="tick-label">Password Baru</Label>
                        <Input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} className="h-11" />
                    </div>
                    <Button disabled={!pw.current_password || !pw.new_password} onClick={changePw} className="rounded-full">
                        <Save className="h-4 w-4 mr-2" /> Simpan
                    </Button>
                </div>
            </div>

            {participant && (
                <div className="rounded-3xl border border-border bg-card p-8 text-center max-w-md mx-auto">
                    <p className="tick-label text-muted-foreground">QR Peserta</p>
                    <p className="font-display font-black text-2xl mt-2">{participant.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{participant.code}</p>
                    <div className="mt-4 mx-auto w-64 h-64 bg-white rounded-2xl grid place-items-center p-4 shadow-sm">
                        {participant.qr_datauri && <img src={participant.qr_datauri} alt="QR" className="w-full h-full object-contain" />}
                    </div>
                </div>
            )}
        </div>
    );
}
