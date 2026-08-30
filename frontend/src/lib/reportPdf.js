import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const GREEN = [21, 94, 63];
const STATUS_LABELS = { hadir: 'Hadir', izin: 'Izin', alpha: 'Alpha' };

export async function loadLogoDataUrl() {
    try {
        const res = await fetch(`${process.env.PUBLIC_URL || ''}/assets/logo-ekertalangu.png`);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
            const r = new FileReader();
            r.onloadend = () => resolve(r.result);
            r.onerror = () => resolve(null);
            r.readAsDataURL(blob);
        });
    } catch { return null; }
}

function header(doc, logo, title, subtitle) {
    const margin = 40;
    let y = 40;
    if (logo) {
        try { doc.addImage(logo, 'PNG', margin, y, 46, 46); } catch { /* ignore */ }
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(0);
    doc.text(title, margin + 58, y + 18);
    doc.setFontSize(11); doc.setFont('helvetica', 'normal');
    doc.text(subtitle, margin + 58, y + 34);
    y += 62;
    doc.setDrawColor(220); doc.line(margin, y, doc.internal.pageSize.getWidth() - margin, y);
    return y + 18;
}

function footer(doc) {
    const pages = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150);
        doc.text(`Halaman ${i} dari ${pages}`, pageW - 40, pageH - 20, { align: 'right' });
    }
}

export function buildAttendancePdf({ rows, stats, periodLabel, activityName, statusLabel, logo }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = header(doc, logo, 'Laporan Kehadiran', 'E-Kertalangu — Absensi Pengajian');
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Periode: ${periodLabel}`, margin, y); y += 15;
    if (activityName) { doc.text(`Kegiatan: ${activityName}`, margin, y); y += 15; }
    if (statusLabel) { doc.text(`Status: ${statusLabel}`, margin, y); y += 15; }
    doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, margin, y); y += 10;

    autoTable(doc, {
        startY: y + 6,
        head: [['Tanggal', 'Kegiatan', 'Peserta', 'Kode', 'Status', 'Jam (WITA)', 'Metode']],
        body: rows.map((r) => [r.activity_date, r.activity_name, r.participant_name, r.participant_code, STATUS_LABELS[r.status] || r.status, r.time_in ? `${r.time_in} WITA` : '-', r.method || '-']),
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: GREEN, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 246] },
        margin: { left: margin, right: margin },
    });

    let sy = (doc.lastAutoTable?.finalY || y) + 22;
    if (sy > doc.internal.pageSize.getHeight() - 110) { doc.addPage(); sy = 50; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
    doc.text('Rekap Statistik', margin, sy);
    autoTable(doc, {
        startY: sy + 8,
        body: [
            ['Total Peserta', String(stats?.total_peserta ?? 0)],
            ['Hadir', String(stats?.hadir ?? 0)],
            ['Izin', String(stats?.izin ?? 0)],
            ['Alpha', String(stats?.alpha ?? 0)],
            ['Persentase Kehadiran', `${stats?.rate_hadir ?? 0}%`],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 180 } },
        margin: { left: margin, right: margin },
    });
    footer(doc);
    return doc;
}

export function buildMonthlyPdf({ monthLabel, byActivity, totals, logo }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = header(doc, logo, 'Rekap Bulanan Kehadiran', 'E-Kertalangu — Absensi Pengajian');
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Bulan: ${monthLabel}`, margin, y); y += 15;
    doc.text(`Jumlah Kegiatan: ${totals?.activities ?? 0}`, margin, y); y += 15;
    doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, margin, y); y += 10;

    autoTable(doc, {
        startY: y + 6,
        head: [['Tanggal', 'Kegiatan', 'Hadir', 'Izin', 'Alpha', 'Total', '%']],
        body: byActivity.map((r) => [r.activity_date, r.activity_name, String(r.hadir), String(r.izin), String(r.alpha), String(r.total), `${r.rate}%`]),
        styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
        headStyles: { fillColor: GREEN, textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 246] },
        columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' }, 6: { halign: 'center' } },
        margin: { left: margin, right: margin },
    });

    let sy = (doc.lastAutoTable?.finalY || y) + 22;
    if (sy > doc.internal.pageSize.getHeight() - 120) { doc.addPage(); sy = 50; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
    doc.text('Rekap Total Bulan Ini', margin, sy);
    autoTable(doc, {
        startY: sy + 8,
        body: [
            ['Total Peserta (unik)', String(totals?.total_peserta ?? 0)],
            ['Hadir', String(totals?.hadir ?? 0)],
            ['Izin', String(totals?.izin ?? 0)],
            ['Alpha', String(totals?.alpha ?? 0)],
            ['Persentase Kehadiran', `${totals?.rate_hadir ?? 0}%`],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 200 } },
        margin: { left: margin, right: margin },
    });
    footer(doc);
    return doc;
}

export function buildStatsPdf({ scopeLabel, overview, gender, last30, today, generatedBy, logo }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = header(doc, logo, 'Ringkasan Statistik Dashboard', 'E-Kertalangu — Absensi & Manajemen Jamaah');
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Cakupan: ${scopeLabel}`, margin, y); y += 15;
    if (generatedBy) { doc.text(`Dibuat oleh: ${generatedBy}`, margin, y); y += 15; }
    doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, margin, y); y += 6;

    const ovRows = [];
    if (overview) {
        if (overview.total_participants !== undefined) ovRows.push(['Total Peserta', String(overview.total_participants)]);
        if (overview.activated_participants !== undefined) ovRows.push(['Akun Teraktivasi', String(overview.activated_participants)]);
        if (overview.unactivated_participants !== undefined) ovRows.push(['Belum Aktivasi', String(overview.unactivated_participants)]);
        if (overview.total_activities !== undefined) ovRows.push(['Total Kegiatan', String(overview.total_activities)]);
        ovRows.push(['Kegiatan Bulan Ini', String(overview.monthly_activities ?? 0)]);
        ovRows.push(['Total Absensi', String(overview.total_attendance ?? 0)]);
        ovRows.push(['Rasio Kehadiran (Keseluruhan)', `${overview.attendance_rate ?? 0}%`]);
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
    doc.text('Statistik Menyeluruh', margin, y + 20);
    autoTable(doc, {
        startY: y + 28,
        body: ovRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 240 } },
        margin: { left: margin, right: margin },
    });

    let sy = (doc.lastAutoTable?.finalY || y) + 22;
    if (sy > doc.internal.pageSize.getHeight() - 160) { doc.addPage(); sy = 50; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0);
    doc.text('Rekap Jamaah & Kehadiran', margin, sy);
    autoTable(doc, {
        startY: sy + 8,
        body: [
            ['Jamaah Aktif — Laki-laki', String(gender?.L ?? 0)],
            ['Jamaah Aktif — Perempuan', String(gender?.P ?? 0)],
            ['Hadir Hari Ini', String(today?.hadir ?? 0)],
            ['Izin Hari Ini', String(today?.izin ?? 0)],
            ['Alpha Hari Ini', String(today?.alpha ?? 0)],
            ['Hadir (30 Hari)', String(last30?.counts?.hadir ?? 0)],
            ['Izin (30 Hari)', String(last30?.counts?.izin ?? 0)],
            ['Alpha (30 Hari)', String(last30?.counts?.alpha ?? 0)],
            ['Rasio Hadir (30 Hari)', `${last30?.rate_hadir ?? 0}%`],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 240 } },
        margin: { left: margin, right: margin },
    });
    footer(doc);
    return doc;
}


export function buildMusyawarahPdf({ kindLabel, monthLabel, notes, logo }) {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = header(doc, logo, `Laporan Musyawarah — ${kindLabel}`, 'E-Kertalangu — Hasil Musyawarah');
    doc.setFontSize(10); doc.setTextColor(0);
    doc.text(`Periode: ${monthLabel}`, margin, y); y += 15;
    doc.text(`Jumlah Catatan: ${notes.length}`, margin, y); y += 15;
    doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, margin, y); y += 18;

    const maxW = pageW - margin * 2;
    notes.forEach((n, idx) => {
        if (y > pageH - 90) { doc.addPage(); y = 50; }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
        doc.text(`${idx + 1}. ${n.title || '(tanpa judul)'}`, margin, y); y += 15;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110);
        doc.text(`Tanggal: ${n.date || '-'}   ·   Oleh: ${n.created_by_name || '-'}`, margin, y); y += 14;
        doc.setTextColor(0);
        const body = (n.content || '(kosong)').replace(/\r/g, '');
        const lines = doc.splitTextToSize(body, maxW);
        lines.forEach((ln) => {
            if (y > pageH - 60) { doc.addPage(); y = 50; }
            doc.text(ln, margin, y); y += 13;
        });
        y += 10;
        doc.setDrawColor(230); doc.line(margin, y, pageW - margin, y); y += 16;
    });
    footer(doc);
    return doc;
}
