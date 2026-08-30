import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, formatApiError } from '@/lib/api';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanLine, Camera, SwitchCamera, CheckCircle2 } from 'lucide-react';

const READER_ID = 'ektl-qr-reader';

export default function QRScanner({ open, onClose, activityId: initialActivityId, onScanned, selfMode = false }) {
    const [activities, setActivities] = useState([]);
    const [activityId, setActivityId] = useState(initialActivityId || '');
    const [status, setStatus] = useState('hadir');
    const [manualCode, setManualCode] = useState('');
    const [running, setRunning] = useState(false);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState('');
    const [cameras, setCameras] = useState([]);
    const [camIndex, setCamIndex] = useState(0);
    const qrRef = useRef(null);
    const lastRef = useRef(0);
    const submitRef = useRef(null);
    const doneRef = useRef(false);
    const submittingRef = useRef(false);
    const [submitting, setSubmitting] = useState(false);
    const [scanned, setScanned] = useState(false);

    // Terima QR format URL baru (…/a/<code>) maupun format lama (EKTL:A:/EKTL:AR:)
    const normalizeSelfQR = (raw) => {
        const s = (raw || '').trim();
        const m = s.match(/\/a\/([A-Za-z0-9_-]+)/);
        if (m) return `EKTL:A:${m[1]}`;
        return s;
    };

    // Always keep the latest submit handler so the decode callback never goes stale
    const submitCode = async (payload) => {
        if (submittingRef.current) return; // cegah double submit
        submittingRef.current = true;
        setSubmitting(true);
        try {
            if (selfMode) {
                const qr = normalizeSelfQR(payload);
                let lat = null, lng = null;
                try {
                    const pos = await new Promise((res, rej) =>
                        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000, enableHighAccuracy: true })
                    );
                    lat = pos.coords.latitude; lng = pos.coords.longitude;
                } catch { /* GPS optional */ }
                const { data } = await api.post('/attendance/self-v2', { activity_qr: qr, lat, lng });
                toast.success(`Absen tercatat · ${data.activity_name || 'Kegiatan'}`);
                // Absen mandiri = sekali; hentikan kamera & cegah scan berulang
                doneRef.current = true;
                await stopCamera();
            } else {
                const { data } = await api.post('/attendance/scan', { activity_id: activityId, participant_qr: payload, status });
                toast.success(`${data.status.toUpperCase()} · ${data.participant_name}`);
            }
            if (onScanned) onScanned();
            setScanned(true);
            if (!selfMode) setTimeout(() => setScanned(false), 1300);
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };
    submitRef.current = submitCode;

    useEffect(() => {
        if (!open || selfMode) return;
        if (!initialActivityId) {
            api.get('/activities').then(({ data }) => {
                setActivities(data.items);
                if (data.items[0]) setActivityId(data.items[0].id);
            });
        }
    }, [open, initialActivityId, selfMode]);

    const stopCamera = async () => {
        const inst = qrRef.current;
        qrRef.current = null;
        setRunning(false);
        if (inst) {
            try { await inst.stop(); } catch { /* already stopped */ }
            try { await inst.clear(); } catch { /* nothing to clear */ }
        }
    };

    const startCamera = async (preferredIndex = null) => {
        if (qrRef.current || starting) return;
        setError('');
        setStarting(true);
        try {
            const el = document.getElementById(READER_ID);
            if (el) el.innerHTML = '';

            const config = { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1.0 };
            const onDecode = async (decoded) => {
                if (doneRef.current) return; // sudah berhasil, cegah scan berulang
                const t = Date.now();
                if (t - lastRef.current < 1500) return;
                lastRef.current = t;
                if (submitRef.current) await submitRef.current(decoded);
            };

            // Resolve a concrete camera id (rear preferred) — more reliable than facingMode alone
            let camList = cameras;
            if (!camList.length) {
                try {
                    camList = await Html5Qrcode.getCameras();
                    setCameras(camList || []);
                } catch {
                    camList = [];
                }
            }

            let cameraArg;
            let idx = preferredIndex;
            if (camList && camList.length) {
                if (idx === null || idx === undefined) {
                    const rearIdx = camList.findIndex((c) => /back|rear|environment/i.test(c.label || ''));
                    idx = rearIdx >= 0 ? rearIdx : camList.length - 1;
                }
                idx = ((idx % camList.length) + camList.length) % camList.length;
                setCamIndex(idx);
                cameraArg = camList[idx].id;
            } else {
                cameraArg = { facingMode: 'environment' };
            }

            const html5 = new Html5Qrcode(READER_ID, { verbose: false });
            qrRef.current = html5;
            await html5.start(cameraArg, config, onDecode, () => {});
            setRunning(true);
        } catch (e) {
            qrRef.current = null;
            setRunning(false);
            setError('Tidak dapat menyalakan kamera. Ketuk "Nyalakan Kamera" lagi & izinkan akses kamera. Jika membuka lewat aplikasi pratinjau, buka langsung di browser HP. Atau gunakan input manual.');
        } finally {
            setStarting(false);
        }
    };

    const switchCamera = async () => {
        if (!cameras.length) return;
        const next = camIndex + 1;
        await stopCamera();
        await startCamera(next);
    };

    // Attempt an auto-start when dialog opens; if the device blocks auto-start,
    // the user can tap the "Nyalakan Kamera" button (real user gesture).
    useEffect(() => {
        if (!open) return;
        if (!selfMode && !activityId) return;
        doneRef.current = false; // reset guard tiap kali dialog dibuka
        setScanned(false);
        let cancelled = false;
        const timer = setTimeout(() => {
            if (!cancelled) startCamera();
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
            stopCamera();
        };
    }, [open, activityId, selfMode]);

    const submitManual = async () => {
        if (!manualCode.trim()) return;
        let code = manualCode.trim();
        if (selfMode) {
            const urlMatch = code.match(/\/a\/([A-Za-z0-9_-]+)/);
            if (urlMatch) code = `EKTL:A:${urlMatch[1]}`;
            else if (!code.startsWith('EKTL:A:') && !code.startsWith('EKTL:AR:')) code = `EKTL:A:${code.toUpperCase()}`;
        } else {
            if (!code.startsWith('EKTL:P:')) code = `EKTL:P:${code.toUpperCase()}`;
        }
        await submitCode(code);
        setManualCode('');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="font-display flex items-center gap-2">
                        <ScanLine className="h-5 w-5" />
                        {selfMode ? 'Absen Mandiri (Scan QR Kegiatan)' : 'Scan QR Peserta'}
                    </DialogTitle>
                </DialogHeader>

                {selfMode ? (
                    <p className="text-sm text-muted-foreground">Arahkan kamera ke QR yang dipajang pengurus di lokasi kegiatan.</p>
                ) : (
                    <>
                        {!initialActivityId && (
                            <div className="space-y-2">
                                <Label className="tick-label">Kegiatan</Label>
                                <Select value={activityId} onValueChange={setActivityId}>
                                    <SelectTrigger className="h-11"><SelectValue placeholder="Pilih kegiatan…" /></SelectTrigger>
                                    <SelectContent className="max-h-72">
                                        {activities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name} · {a.date}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="tick-label">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hadir">Hadir</SelectItem>
                                    <SelectItem value="izin">Izin</SelectItem>
                                    <SelectItem value="alpha">Alpha</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </>
                )}

                <div className="relative rounded-2xl overflow-hidden bg-black min-h-[260px]">
                    {/* Elemen ini SEPENUHNYA dikelola html5-qrcode — React tidak boleh menaruh anak di dalamnya */}
                    <div id={READER_ID} className="w-full min-h-[260px]" />

                    {/* Frame pemindai (overlay non-interaktif) saat kamera aktif */}
                    {running && !scanned && (
                        <div className="absolute inset-0 grid place-items-center pointer-events-none">
                            <div className="relative w-52 h-52 max-w-[70%] max-h-[70%]">
                                <span className="absolute -top-0.5 -left-0.5 h-8 w-8 border-t-4 border-l-4 border-primary rounded-tl-xl" />
                                <span className="absolute -top-0.5 -right-0.5 h-8 w-8 border-t-4 border-r-4 border-primary rounded-tr-xl" />
                                <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 border-b-4 border-l-4 border-primary rounded-bl-xl" />
                                <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 border-b-4 border-r-4 border-primary rounded-br-xl" />
                                <span className="qr-scanline absolute left-2 right-2 h-0.5 bg-primary/80 shadow-[0_0_12px_2px] shadow-primary/60 rounded-full" />
                            </div>
                        </div>
                    )}

                    {/* Overlay sukses */}
                    {scanned && (
                        <div className="absolute inset-0 grid place-items-center bg-primary/20 backdrop-blur-sm pointer-events-none">
                            <div className="animate-pop-in flex flex-col items-center text-white">
                                <div className="h-16 w-16 rounded-full bg-primary grid place-items-center shadow-lg">
                                    <CheckCircle2 className="h-9 w-9" />
                                </div>
                                <p className="mt-3 text-sm font-semibold">QR Code berhasil dipindai</p>
                            </div>
                        </div>
                    )}

                    {!running && !scanned && (
                        <div className="absolute inset-0 grid place-items-center p-4 pointer-events-none">
                            <div className="text-center pointer-events-auto">
                                <p className="text-white/70 text-sm mb-3">
                                    {starting ? 'Menyiapkan kamera…' : 'Kamera belum menyala'}
                                </p>
                                <Button
                                    type="button"
                                    onClick={() => startCamera()}
                                    disabled={starting}
                                    className="rounded-full gap-2"
                                >
                                    <Camera className="h-4 w-4" />
                                    {starting ? 'Menyalakan…' : 'Nyalakan Kamera'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2">
                    {error ? (
                        <p className="text-sm text-destructive flex-1">{error}</p>
                    ) : (
                        <span className="text-xs text-muted-foreground flex-1 flex items-center gap-1.5">
                            {running && <span className="h-2 w-2 rounded-full bg-success animate-pulse" />}
                            {running ? 'Arahkan kamera ke QR Code' : ''}
                        </span>
                    )}
                    {cameras.length > 1 && (
                        <Button type="button" variant="outline" size="sm" onClick={switchCamera} className="rounded-full gap-1 whitespace-nowrap">
                            <SwitchCamera className="h-4 w-4" /> Ganti Kamera
                        </Button>
                    )}
                </div>

                <div className="rounded-xl border border-dashed border-border p-3 space-y-2">
                    <p className="tick-label text-muted-foreground">
                        Input Manual (jika kamera bermasalah)
                    </p>
                    <div className="flex gap-2">
                        <Input
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder={selfMode ? 'Contoh: ACT-0001' : 'Contoh: KTL-0001'}
                            className="h-11 font-mono"
                        />
                        <Button onClick={submitManual} disabled={submitting} className="rounded-full">{submitting ? 'Mengirim…' : 'Kirim'}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
