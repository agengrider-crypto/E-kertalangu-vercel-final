// Status kegiatan dihitung dari tanggal + jam + flag manual_finished.
// manual_finished === true  -> selesai (dikunci manual)
// manual_finished === false -> dibuka kembali (override, tidak auto-lock)
// manual_finished undefined  -> auto by waktu
export function activityStatus(a) {
    if (!a) return 'berlangsung';
    if (a.manual_finished === true) return 'selesai';
    const now = new Date();
    let start, end;
    try {
        start = new Date(`${a.date}T${(a.start_time || '00:00')}:00`);
        end = new Date(`${a.date}T${(a.end_time || '23:59')}:00`);
    } catch {
        return 'berlangsung';
    }
    if (a.manual_finished === false) return now < start ? 'akan' : 'berlangsung';
    if (now < start) return 'akan';
    if (now > end) return 'selesai';
    return 'berlangsung';
}

export const STATUS_META = {
    berlangsung: { label: 'Berlangsung', dot: 'bg-success', cls: 'bg-success/10 text-success border-success/20' },
    akan: { label: 'Akan Datang', dot: 'bg-warning', cls: 'bg-warning/10 text-warning border-warning/30' },
    selesai: { label: 'Selesai', dot: 'bg-destructive', cls: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function StatusBadge({ status, testId }) {
    const m = STATUS_META[status] || STATUS_META.berlangsung;
    return (
        <span data-testid={testId} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${m.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} /> {m.label}
        </span>
    );
}
