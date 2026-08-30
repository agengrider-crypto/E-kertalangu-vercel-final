# E-Kertalangu — PRD

Aplikasi web absensi & manajemen jamaah untuk komunitas pengajian di Kertalangu, Bali. Full-stack: React + FastAPI + MongoDB. UI Gen-Z, dark/light mode. PWA-enabled.

## Roles
- Admin (agengpadma8@gmail.com / jokam354): kendali penuh + approve pendaftaran + reset password
- Pengurus: dashboard real-time, kegiatan, absensi, musyawarah, pengumuman
- Peserta/Jamaah: profil, QR, absen mandiri (GPS radius), lihat pengumuman

## Implemented (Feb 2026)
Core: login multi-identifier, RBAC, participants CRUD (QR unik, bulk copy-paste, import XLSX, anti-duplicate), activities CRUD (dgn pengajar + materi + radius GPS + jenis + jam WITA 10-menit), attendance (QR scan pengurus + self-scan peserta GPS-validated), musyawarah auto-save + xlsx export, activity log, backup .xlsx, dashboard rekap (L/P + hadir/izin/alpha + %), reminder H-1, alpha alert 30-hari.

Fitur v2 (added):
- **QR Publik /qr-daftar** untuk pendaftaran offline
- **Approval Pendaftaran** — pending → admin approve/reject
- **Password lenient** (min 4, warning <6)
- **QR Rotating 30 detik** (HMAC-based, tidak bisa di-screenshot)
- **GPS Radius** — self check-in wajib dalam radius activity
- **Alpha Alert Auto-Follow-up** — dashboard menampilkan peserta 3x+ alpha
- **Kegiatan Berulang** (recurring, weekly N minggu)
- **Import Peserta XLSX**
- **Pengumuman** — CRUD + share ke WA, dengan field pengajar + materi_progress
- **Album Foto Kegiatan** — upload multiple photos + lightbox
- **PWA** — manifest.json + service worker (installable)
- **Notifikasi Real-time** — badge di sidebar admin (polling 30s)
- **Share Rekap ke WA** — link shareable + PNG download (html2canvas)
- **Forgot Password via WA** — user isi form → WA auto-open dgn password mereka → admin apply
- **Reset Password (admin)** — tombol di halaman Pengguna & Hak
- **Hak Akses Akun di Detail Peserta** (Jun 2026) — Admin dapat centang/lepas role Pengurus langsung dari `ParticipantDetail.jsx`. Peserta terkunci (bawaan). Endpoint `GET /participants/{pid}/account` (admin) untuk baca akun tertaut; simpan via `PATCH /users/{uid}/role`. Jika belum aktivasi → tampil pesan & checkbox nonaktif.
- **Nonaktifkan/Aktifkan Akun di Detail Peserta** (Jun 2026) — tombol toggle + badge status akun, via `PATCH /users/{uid}/toggle-active`.
- **Audit Log Hak Akses** (Jun 2026) — `update_role` & `toggle_active` kini mencatat nama target di meta; halaman Log Aktivitas punya label ramah + filter "Hak Akses".
- **Album Foto → MongoDB** (Jun 2026) — foto kegiatan disimpan base64 di Mongo (deploy-safe), diserve via `GET /api/uploads/photos/{aid}/{filename}`.
- **Menu Laporan** (Jun 2026) — halaman `/app/reports` (admin & pengurus) memakai data absensi yang sudah ada. Filter: Tanggal (Hari Ini/Pilih/Rentang), Kegiatan, Cari Nama, Status (auto-refresh tanpa reload). Statistik ikut filter (Total Peserta, Hadir, Izin, Alpha, % Kehadiran). Export **PDF** (client-side jspdf+autotable, logo+periode+tabel+rekap, multipage), Export **Excel** terfilter (`GET /api/reports/attendance/export/xlsx`), tombol **Simpan ke Google Drive** (stub `lib/googleDrive.js`, belum OAuth → info "Google Drive belum dikonfigurasi oleh Administrator."). Endpoint: `GET /api/reports/attendance` + xlsx (require admin/pengurus, peserta 403). Empty state "Tidak ada data.". Teruji: testing agent backend 12/12, frontend flows 100%.
  - Temuan di luar scope (belum diperbaiki): warning React setState-in-render di `pages/Login.jsx` (pre-existing).
- **Laporan: Rekap Bulanan + WhatsApp + Musyawarah** (Jun 2026) — halaman Laporan kini bertab: **Kehadiran**, **Rekap Bulanan**, **Musyawarah**.
  - Rekap Bulanan: pilih bulan → `GET /api/reports/monthly?month=YYYY-MM` (admin/pengurus, validasi format→400, peserta 403), ringkasan per kegiatan + total, PDF satu klik (`buildMonthlyPdf`).
  - Kirim ke WhatsApp: tombol di ketiga tab membuka `wa.me` dengan ringkasan teks (kehadiran/bulanan/musyawarah).
  - Musyawarah: tab baru memakai data `GET /api/musyawarah?kind=4S|TIM7` (filter bulan di klien), daftar catatan + PDF (`buildMusyawarahPdf`).
  - PDF builder dipindah ke `frontend/src/lib/reportPdf.js`. Teruji: testing agent backend 8/8 baru + 12/12 regresi, frontend 100%.

## Endpoints
See /app/memory/test_credentials.md for full list.

## Deployment
- CORS: default `*`, tighten to production domain via env before publish
- JWT_SECRET: rotate before production
- Uploads: foto kegiatan kini di MongoDB (bukan disk)
- PWA installable (icon SVG data URI in manifest)

## Security (audit Jun 2026)
- **SEC-001 (HIGH) FIXED** — RBAC/BOLA pada peserta: `/participants` list admin/pengurus saja; detail/attendance/stats hanya admin/pengurus atau peserta pemilik → 403.
- **SEC-002 (MEDIUM) FIXED** — Aktivasi publik verifikasi No. HP terdaftar (400 jika tidak cocok).
- **SEC-003 (MEDIUM) FIXED** — Reset password tak lagi simpan teks-polos. `/auth/forgot-password` hanya kirim identitas → admin klik "Buat Password Sementara" → server generate password acak 10 char, set hash, kembalikan sekali ke admin (banner + salin di Users.jsx). Request punya expiry 60 menit. `admin_set_password` min 6 char.
- **SEC-004 (LOW) FIXED** — Token JWT diperpendek jadi **30 hari** (env `TOKEN_TTL_DAYS`) + **revocation** via `token_version`: di-`$inc` saat logout, change-password (re-issue token utk sesi aktif), admin_set_password, dan apply-reset. `get_current_user` menolak token dgn tv lama (401). Frontend: interceptor 401 auto-logout + `MyProfile` simpan token baru.
- **SEC-005 (LOW) FIXED** — Lockout login berjendela waktu 15 menit: 5 gagal → 429 dgn sisa menit; reset otomatis setelah jendela lewat.
- **Hardening FIXED** — `JWT_SECRET` kini wajib dari env (fail-fast, tanpa fallback). CORS dibaca dari env `CORS_ORIGINS` (list; wildcard→credentials off). `.env` CORS_ORIGINS = domain e-kertalangu.com + www + preview host.
  - **Belum dilakukan (manual saat deploy)**: rotasi nilai `JWT_SECRET` (akan me-logout semua sesi). Admin password re-sync dari env saat startup dibiarkan (di luar 3 item yang disetujui).
- **SEC-101 (MEDIUM) FIXED** — `/attendance/by-activity/{aid}`: `all_participants` (berisi No. HP) kini hanya untuk admin/pengurus; peserta dapat list kosong (tidak ada kebocoran PII).
- **SEC-102 (revisi Jun 2026)**: Aturan blokir aktivasi peserta tanpa No. HP DILONGGARKAN atas permintaan user (prioritas usability). Kini: peserta tanpa HP terdaftar boleh aktivasi mandiri (nomor input disimpan sbg HP-nya); peserta yang SUDAH punya HP tetap wajib cocok (SEC-002). Keunikan nomor tetap dicek. Teruji: iteration_5 (backend 7/7 + UI).
- **Audit ulang (3x)**: verdict akhir **PASS — No Material Functional Issues Found**. Sisa hanya P3 (rotasi JWT_SECRET manual, lockout per-identifier bounded 15 mnt).

## Batch 4 — Manajemen Data Peserta & Keamanan Akun (Jun 2026)
- **Status Aktif/Arsip**: field `status` peserta menambah nilai `'arsip'`. Daftar peserta default menyembunyikan arsip; `GET /participants?status=arsip` khusus admin (403 lainnya).
- **Arsip/Restore/Hapus permanen**: `PATCH /participants/{id}/archive` (cabut sesi akun tertaut), `/restore`, `POST /participants/bulk-delete`, `DELETE /participants/{id}` (hapus akun login tertaut; absensi historis DIPERTAHANKAN). Halaman **Data Arsip** (`/app/archive`, admin) untuk restore + hapus permanen (konfirmasi teks eksak).
- **Peserta arsip**: tidak bisa login (403) & tidak bisa absensi (400).
- **Checkbox multi-select** + "Hapus Data Terpilih" (konfirmasi) di daftar peserta (admin).
- **Reset Password peserta** (`POST /participants/{id}/reset-password`, admin): password sementara acak 10-char, cabut sesi lama, tampil sekali di banner; tolak jika akun admin.
- **Log Aktivitas Admin** (admin only): login, tambah/import peserta (`import_participants`), reset pw, hapus/arsip/restore peserta, buat/ubah kegiatan. Filter UI: Semua/Hak Akses/Aktivasi. Tanpa mencatat password.
- **RBAC**: `/activity-log` + semua aksi manajemen peserta = admin only (backend `require_roles('admin')`); nav pengurus tanpa Log Aktivitas; route `/app/archive` & `/app/activity-log` dibungkus `RequireAdmin` (non-admin redirect ke dashboard).
- Teruji: testing agent backend 13/13 + frontend 100% + regresi 5 halaman. Data peserta lama (frengky) utuh & aktif.
- Temuan di luar scope (dicatat, tidak diperbaiki): warning React setState-in-render `pages/Login.jsx` (pre-existing).


## Revisi (Ags 2026)
- Poin 1: Login diubah jadi simpel & terpusat (gaya card tengah). Logo baru E-Kertalangu (transparan, tanpa badge/tagline kecil) di /assets/logo-ekertalangu.png. Hapus greeting Assalamualaikum & panel masjid.
- Poin 1: Role preview "Lihat sebagai" (admin>pengurus>peserta, pengurus>peserta) via effectiveRole di auth context + banner preview di AppShell.
- Poin 2: Fix scanner kamera QR (StrictMode double-mount + delay container). UI & kode terverifikasi testing agent; kamera live perlu cek di HP asli.
- Poin 3: Jadwal sholat 5 waktu = DITUNDA (belum perlu).
- Poin 4: Loading login = "Selamat datang...".
- Poin 5: Rekap publik tanpa login = DITUNDA (jangan di halaman login).
- Poin 2 (v2): Scanner kamera ditulis ulang - tombol "Nyalakan Kamera" (user gesture), pilih kamera belakang via getCameras(), tombol Ganti Kamera. Perlu tes di browser HP langsung.
- Poin 7: Registrasi tanpa persetujuan admin - langsung aktif + auto-login (token). Verified.
- Poin 8: Login permanen - JWT 7hari -> 365hari. Verified.

## Revisi Batch 2 (Poin 6-12) — Ags 2026
- Poin 6: Share kegiatan -> "Laporan Kegiatan Rutin" (link publik tanpa login). Verified.
- Poin 9: Laporan Harian & Bulanan (tombol di Dashboard) + link publik + PNG + daftar nama peserta. kind monthly ditambah backend. Verified.
- Poin 10: Kalender Kegiatan (toggle List/Kalender di Activities) + Notifikasi in-app (bell, badge, auto-notify peserta/pengurus saat kegiatan dibuat). Verified.
- Poin 11: Multi-role (roles[] per akun; chip di halaman Pengguna). Verified.
- Poin 12: Pilih role di halaman login (needs_role flow). Verified.
- Camera v2: tap "Nyalakan Kamera" + getCameras + Ganti Kamera. PERLU tes di HP.

## STABILITY Batch 1 — Ags 2026 (minimal-invasive, tanpa ubah arsitektur/DB/auth)
- TAHAP 1: axios timeout 30s + loading state (App.js sudah "Memuat"); auth bootstrap tetap ringan (config+me saja).
- TAHAP 2: formatApiError map error jaringan/timeout/500 jadi pesan ramah; pesan 4xx backend (Indonesia) tetap tampil.
- TAHAP 3a: FIX crash removeChild/layar putih di QRScanner (overlay dipindah keluar div reader). Stop kamera + cegah scan berulang setelah absen mandiri sukses. VERIFIED testing agent.
- TAHAP 3b (QR jadi URL): DITUNDA - perlu route publik + alur login-return + keputusan UX. Belum dikerjakan.
- TAHAP 4: guard double-submit di Absensi (submittingRef). Login/Tambah Peserta/Import/Buat Kegiatan sudah ada guard sebelumnya.
- TAHAP 5: Global ErrorBoundary (cegah blank/white screen). VERIFIED.
- Tidak ada perubahan backend/DB/auth/route pada batch ini.

## TAHAP 3b (QR URL) — Ags 2026 (backward compatible, tanpa ubah backend)
- QR kegiatan (ActivityDetail) kini encode URL origin/a/<code> via qrcode.react -> scan kamera HP apa pun buka app (bukan Google Search).
- Route publik baru /a/:code (Checkin.jsx): logout -> /login?next=/a/<code> -> setelah login auto ke absensi. Verified via screenshot.
- Login dukung ?next= (kembali ke halaman tujuan).
- Scanner in-app + endpoint self-v2 tetap terima EKTL:A:/EKTL:AR: (kompatibel) + URL dinormalisasi.
- Catatan: QR LAMA yang sudah tercetak (teks EKTL:A) tetap bisa discan via scanner in-app; utk manfaat kamera HP native, cetak ulang QR (kini URL).

## BATCH 2 (Import XLSX & Single Source of Truth) — Ags 2026
- Import XLSX/bulk sudah lewat create_participant = single source of truth (tidak diubah).
- list_participants: tambah account_status turunan (aktif jika ada user.participant_id tertaut, else belum_aktivasi). Tanpa field/DB baru.
- Alur Aktivasi publik: GET /activation/search (peserta belum tertaut, HP disamarkan) + POST /activation/activate (buat user peserta TERTAUT ke participant_id yg sudah ada, tanpa duplikat, hash password, auto-login). Halaman /aktivasi + link di Login.
- Login peserta tetap via HP+password (tidak diubah). Self-absen imported+aktivasi berhasil.
- Admin Daftar Peserta: badge Belum Aktivasi/Aktif.
- VERIFIED backend testing agent (11/11 termasuk no-duplicate + double-activate 409 + regression self-absen).
- CATATAN INSIDEN: akun peserta referensi "frengky" tak sengaja terhapus saat cleanup di PREVIEW; dipulihkan via register (pass sementara frengky123). Production tidak terpengaruh.

## Aktivasi di QR Publik — Ags 2026

## Mobile: Hapus Drawer + Badge Notifikasi (Jun 2026) — SELESAI & TERUJI
- **Badge notifikasi**: `NotificationBell.jsx` sudah menampilkan badge jumlah unread (aksen, "9+" bila >9) — aktif di lonceng header mobile & sidebar desktop. Tidak perlu perubahan.
- **Hapus navigasi atas mobile**: tombol hamburger + drawer sidebar mobile DIHAPUS (redundan dengan bottom nav). Header mobile ringkas dipertahankan: avatar + "Halo, {Nama}" + role·tanggal (kiri), lonceng + toggle tema (kanan). State `open`/`setOpen` dibersihkan.
- **Desktop tetap normal**: sidebar + RoleSwitcher "Lihat Sebagai" + Keluar tidak berubah. RoleSwitcher mobile kini via desktop saja (drawer dihapus) — fitur tetap ada di desktop.
- Teruji viewport 390px: hamburger tidak ada, greeting "Halo, Ageng", lonceng ada, bottom nav ada, tanpa overflow horizontal; desktop sidebar utuh. Compile bersih.
- ⚠️ Perubahan di preview → perlu redeploy untuk produksi.

## Aktivasi di QR Publik lama11 — Ags 2026 (arsip)

## Header Mobile App-Like (Jun 2026) — SELESAI & TERUJI
- Topbar mobile (`lg:hidden`, `AppShell.jsx`) diubah dari judul tengah "E-KERTALANGU" menjadi header app-like: **avatar + "Halo, {NamaDepan}" + role · tanggal singkat** di kiri, **NotificationBell + toggle tema** di kanan. `data-testid="mobile-greeting"`. Persisten di semua halaman mobile (termasuk di atas Dashboard).
- Desktop tidak berubah. Tidak menyentuh backend/permission/logic. Teruji viewport 390px: greeting "Halo, Ageng" render, tanpa overflow horizontal; compile bersih.
- ⚠️ Perubahan di preview → perlu redeploy untuk produksi.

## Aktivasi di QR Publik lama10 — Ags 2026 (arsip)

## Mobile App-Like: Bottom Navigation + More Page (Jun 2026) — SELESAI & TERUJI
- **Bottom Navigation (mobile only, `lg:hidden fixed bottom-0`)**: 5 tombol urut Dashboard | Kegiatan | Peserta | Musyawarah | More (`components/MobileBottomNav.jsx`). Icon + label, indikator aktif (pill bg-primary/15 + label hijau + stroke tegas), safe-area padding, active:scale. Item **difilter sesuai hak akses** (allowedRoutes dari NAV_BY_ROLE); "More" selalu ada. Konten diberi `pb-28` di mobile agar tidak tertutup.
- **More Page** (`pages/MorePage.jsx`, route `/app/more`): kartu profil (nama+role) + daftar menu tambahan = NAV_BY_ROLE[role] minus 4 menu utama (Pengumuman, Laporan, Data Arsip, Pengguna & Hak, Log Aktivitas, Backup, Profil Saya untuk admin) + tombol Keluar + versi. Reuse `NAV_BY_ROLE` (di-export dari AppShell) → permission-safe, tidak menambah akses.
- **Desktop tetap aman**: sidebar existing tidak diubah; footer disembunyikan di mobile (`hidden lg:block`); bottom nav hanya mobile.
- Tidak mengubah route/permission/backend/DB/QR/absensi (hanya menambah 1 route UI `/app/more` + komponen nav). Teruji: viewport 390px → bottom nav 5 item tanpa overflow horizontal; More page render menu sesuai role admin + logout; compile bersih.
- ⚠️ Perubahan di preview → perlu **redeploy** untuk produksi.

## Aktivasi di QR Publik lama9 — Ags 2026 (arsip)

## BATCH 9 — Custom Domain Migration (Jun 2026) — PREP KODE SELESAI (binding = platform)
- **Target**: domain publik utama → `https://e-kertalangu.brodycorp.com` (lama `bertanya-hub.emergent.host` / `e-kertalangu.com` tetap aktif selama transisi).
- **Audit hardcode**: TIDAK ada domain lama di-hardcode pada logika app. Semua URL publik (QR `${origin}/a/{code}`, aktivasi, registrasi, share, WA) dibuat dari `window.location.origin` (7 tempat) → otomatis ikut domain yang membuka app. `manifest.json` start_url/scope relatif `/`. Jadi tanpa perubahan kode.
- **Perubahan config (aman, minimal)**: `backend/.env` `CORS_ORIGINS` ditambah `https://e-kertalangu.brodycorp.com` & `https://www.e-kertalangu.brodycorp.com`. Backend restart OK, preview tetap jalan. Tidak mengubah DB/API/auth/session/QR/absensi.
- **Aksi platform (hanya user)**: Deploy app → Link Domain → Entri → input `e-kertalangu.brodycorp.com`; di DNS brodycorp.com hapus A record subdomain lalu tambah CNAME sesuai nilai platform; SSL otomatis; propagasi 5–15 mnt; tidak perlu re-deploy; kedua domain tetap aktif; backend/CORS ditangani platform (same-origin). Pastikan env produksi CORS_ORIGINS juga memuat domain baru saat redeploy.
- **Belum bisa diverifikasi dari sisi saya**: akses domain baru & SSL (butuh binding platform + DNS). Regression checklist Batch 9 dijalankan user setelah domain aktif.

## Aktivasi di QR Publik lama8 — Ags 2026 (arsip)

## Security Audit + Fix SEC-001 (Jun 2026) — SELESAI & TERUJI
- **Audit**: verdict CONDITIONAL PASS (tanpa celah kritikal/tinggi; JWT kuat, password hash, RBAC tulis-data, CORS terkunci domain). Temuan MEDIUM: SEC-001 (peserta baca roster/kegiatan rahasia via ID), SEC-002 (aktivasi tanpa HP). Low: auto-restore password admin, lockout per-identifier, JWT localStorage, foto tanpa auth.
- **Keputusan user**: perbaiki SEC-001 saja; SEC-002 (C = jangan sentuh, sesuai permintaan lama agar peserta tanpa HP tetap bisa aktivasi) & hardening (B = lewati).
- **Fix SEC-001 (backend-only, `server.py`)**: `GET /attendance/by-activity/{aid}` & `GET /attendance/summary` kini `require_roles('admin','pengurus')`; `GET /activities/{aid}` menolak (403) peserta untuk kegiatan `is_secret` yang tidak ada di `secret_allow`. Tidak mengubah DB/model/QR/absensi.
- Teruji testing_agent (iteration_7): 7/7 pass, 100% backend — peserta 403 pada roster/summary/rahasia, 200 metadata non-rahasia, regresi admin OK. Test file regresi: `/app/backend/tests/test_sec001.py`.
- **Temuan sisa (tidak diperbaiki, catatan)**: rute FE `/app/activities/:aid` tidak dibatasi role — peserta yang mengetik URL langsung akan dapat 403 dari backend (aman, tapi halaman bisa error). SEC-002 & Low items masih terbuka sesuai pilihan user.
- ⚠️ Perubahan di preview → perlu **redeploy** untuk produksi.

## Aktivasi di QR Publik lama7 — Ags 2026 (arsip)

## BATCH 8 (Bagian 3) — Empty State/Status Sistem/Dropdown Profil/Cek Responsif (Jun 2026) — SELESAI & TERUJI
- **Empty State Modern**: komponen `components/EmptyState.jsx` (ikon + judul + deskripsi + CTA opsional sesuai hak akses). Diterapkan di Peserta (CTA "Peserta Baru" bila canEdit; pesan beda saat pencarian nihil), Kegiatan (CTA "Kegiatan Baru" bila canEdit), dan 3 tab Laporan (Kehadiran/Bulanan/Musyawarah — tanpa CTA).
- **Status Sistem** (`Dashboard.jsx`, admin only, read-only, TANPA backend/monitoring baru): kartu `system-status` menampilkan Database/Aplikasi-Server (Normal bila stats termuat), QR Scanner (Tersedia bila navigator.mediaDevices), Backup Terakhir ("Tidak tersedia"), Versi (V2.0), dengan dot status berwarna.
- **Dropdown Profil** (`AppShell.jsx`): avatar+nama di sidebar kini trigger DropdownMenu → "Profil Saya" (/app/me) & "Keluar" (logout). Menu/routing/permission tidak diubah.
- **Cek Zoom & Mobile**: diverifikasi zoom 125% (tanpa overflow) & viewport mobile 390px (scrollWidth tidak melebihi viewport; layout menumpuk rapi).
- Frontend-only, tanpa perubahan DB/API/logic/auth/QR/routing. Teruji: 0 error console, screenshot Dashboard(status+dropdown)/Laporan(empty)/mobile/zoom OK, tanpa regresi.
- ⚠️ Perubahan di preview → perlu **redeploy** untuk produksi.

## Aktivasi di QR Publik lama6 — Ags 2026 (arsip)

## BATCH 8 (Bagian 2) — Login/Sidebar/Header/Tabel/QR Polish (Jun 2026) — SELESAI & TERUJI
- **Login Modern** (`Login.jsx`, logic auth tidak diubah): kartu glass (backdrop-blur + ring), blob dekoratif beranimasi, entrance `animate-fade-in-up`, logo drop-shadow, footer "VERSION V2.0".
- **Sidebar & Header** (`AppShell.jsx`, menu/routing/permission tidak diubah): brand pakai logo asli, tanggal hari ini (id-ID) di sidebar & drawer, greeting nama di drawer mobile, active state (bg-primary + shadow) & hover (translate-x + icon scale) lebih jelas.
- **Tabel Modern**: sticky header solid (bg-card z-10 shadow) + zebra (`odd:bg-muted/10`) + hover (`hover:bg-primary/5`) di Peserta (`Participants.jsx`) & Laporan (`Reports.jsx`, tabel harian & bulanan). Data/kolom/query tidak diubah.
- **QR Scanner UI** (`QRScanner.jsx`, logika kamera/QR/endpoint tidak diubah — overlay pointer-events-none): bingkai sudut + garis pindai beranimasi, status "Menyiapkan kamera…" & "Arahkan kamera ke QR Code" (+ dot pulse), overlay sukses "QR Code berhasil dipindai" (state `scanned`, auto-clear 1.3s di mode pengurus).
- Dukungan CSS: keyframes scanline/pop-in/blob di `index.css` (dihormati oleh prefers-reduced-motion).
- Frontend-only. Teruji: 0 error console, login flow tetap jalan, screenshot Login/Sidebar/Tabel OK. QR overlay bersifat additive (belum diverifikasi kamera live — risiko rendah).
- ⚠️ Perubahan di preview → perlu **redeploy** untuk produksi.

## Aktivasi di QR Publik lama5 — Ags 2026 (arsip)

## BATCH 8 (Bagian 1) — UI/UX Polish Fondasi (Jun 2026) — SELESAI & TERUJI
- **Count-up statistik**: komponen `CountUp.jsx` (hormati prefers-reduced-motion, nilai akhir = data asli) dipakai di Dashboard KPI (`Kpi`) & kartu overview (`Stat`).
- **Skeleton loading**: `components/skeletons.jsx` (TableSkeleton/CardsSkeleton) menggantikan teks "Memuat…" di Peserta & Laporan (mekanisme fetch tidak diubah).
- **Favicon & app icon**: `public/index.html` + `manifest.json` kini pakai logo resmi `/assets/logo-ekertalangu.png` (cache-buster ?v=3), menggantikan ikon bintang SVG lama.
- **Reduced motion**: media query global di `index.css` menonaktifkan animasi bila user set prefers-reduced-motion.
- Frontend-only, tanpa perubahan DB/API/logic/auth/QR/routing. Teruji: 0 error console, count-up jalan, favicon = logo, tidak ada regresi (Dashboard/menu normal).
- **BELUM dikerjakan (deferred, menunggu prioritas user)**: redesign Login (glass), redesign Sidebar/drawer, polish frame QR Scanner, zebra/hover tabel menyeluruh, empty-state ilustrasi, header greeting lanjutan, status-system widget polish, cek zoom 80–125% menyeluruh. Semua ini murni visual.

## Aktivasi di QR Publik lama4 — Ags 2026 (arsip)

## Label WITA di Laporan + Auto-Alpha saat Selesai (Jun 2026) — SELESAI & TERUJI
- **Label Zona Waktu WITA konsisten**: kolom jam kini diberi label "Jam (WITA)" & nilai `... WITA` di: tabel Laporan (`Reports.jsx`), PDF `buildAttendancePdf` (`reportPdf.js`), Excel export `/reports/attendance/export/xlsx`, Backup xlsx (sheet Kegiatan: "Mulai (WITA)/Selesai (WITA)"; sheet Absensi: "Jam (WITA)"), dan halaman publik `ShareRecap.jsx`. Konsisten dengan `time_in` yang sudah disimpan WITA (now_wita).
- **Auto-Alpha saat Selesai**: setelah Admin menekan "Selesaikan Kegiatan" (dan konfirmasi), muncul tawaran kedua "Tandai Sisa Peserta Alpha?" → jika Ya, panggil `/activities/{id}/mark-remaining-alpha` (tandai peserta aktif yang belum absen jadi Alpha, tidak menimpa data). Toast jumlah.
- Teruji: Excel export header = "Jam (WITA)" (verified via openpyxl); self-test UI Auto-Alpha (Selesaikan→dialog kedua muncul→Ya→toast "1 peserta ditandai Alpha", Rekap frengky=alpha). Data test dibersihkan.
- ⚠️ Perubahan di preview → perlu **redeploy** untuk produksi.

## Aktivasi di QR Publik lama3 — Ags 2026 (arsip)

## Fix Jam WITA + Edit Kegiatan + Tandai Semua Alpha (Jun 2026) — SELESAI & TERUJI
- **FIX BUG JAM ABSENSI (WITA)**: server berjalan UTC, sebelumnya `time_in` absensi memakai `datetime.now()` (UTC) tapi dilabeli WITA → selisih 8 jam (mis. tercatat 05:37 padahal 13:37 WITA). Ditambah helper `now_wita()` (UTC+8) di `server.py`; `_record_attendance` `time_in` dan `_activity_finished()` kini pakai WITA. Jam absensi kini akurat untuk laporan. (Perubahan terbatas pada absensi & lock; fungsi tanggal lain tidak diubah.)
- **Edit Kegiatan**: `ActivityDetail.jsx` tab Informasi punya tombol **Edit Kegiatan** (data-testid `activity-edit-btn`) → dialog `EditActivityDialog` (nama/jenis/tanggal/jam mulai-selesai/pengisi/materi/catatan) → PATCH `/activities/{id}` (endpoint lama).
- **Tandai Semua Alpha**: tombol di tab Quick Attendance (data-testid `mark-all-alpha-btn`, bisa dipakai walau kegiatan sudah selesai) → endpoint baru `POST /activities/{id}/mark-remaining-alpha` (admin/pengurus): tandai semua peserta aktif yang BELUM absen sebagai Alpha, tidak menimpa absensi yang sudah ada. Konfirmasi via useConfirm + toast jumlah.
- Teruji: backend curl (time_in=13:45 saat server UTC 05:45; edit name/pengajar; mark-remaining-alpha count benar) + self-test UI Playwright (kartu tampil "· 13:47 WITA"; Edit dialog ubah judul→"(Diedit)" + toast; tombol Tandai Semua Alpha tampil & jalan). Data test dibersihkan.
- ⚠️ Perubahan di preview → perlu **redeploy** agar aktif di produksi.

## Aktivasi di QR Publik lama2 — Ags 2026 (arsip)

## BATCH Kegiatan & Absensi Pengurus (Quick Attendance) (Jun 2026) — SELESAI & TERUJI
- **Tahap 1-2 Form Kegiatan**: `Activities.jsx` ActivityForm dibuat ringkas — modal `max-w-3xl w-[95vw] max-h-[90vh]`, body scroll, header/footer sticky (nyaman zoom 100%, responsif mobile). Field **GPS/Latitude/Longitude/Radius/Lokasi disembunyikan** dari UI namun tetap dikirim default (location 'Kertalangu', gps null, radius 100) → DB & schema tidak berubah. Field aktif: Nama, Jenis, Tanggal, Jam Mulai/Selesai, Pengisi/Pengajar, Materi, Undangan Khusus, Catatan, Kegiatan Berulang.
- **Tahap 3-9 Quick Attendance (INLINE, bukan popup)**: `ActivityDetail.jsx` kini pakai 3 tab (Informasi / Quick Attendance / Rekap) via shadcn Tabs. Komponen baru `components/QuickAttendance.jsx`: search debounce 300ms + autofocus (min 2 huruf), kartu peserta (Nama, kode, status akun Aktif/Belum Aktivasi/Nonaktif), tombol cepat **Hadir/Izin/Alpha** (bukan dropdown), **auto-save** via `POST /attendance/manual` (endpoint lama, tanpa tombol simpan/reload) + toast "Absensi berhasil disimpan.", kartu berubah warna + "✓ STATUS" + jam WITA dari server, **statistik realtime** (counter Hadir/Izin/Alpha), filter (default Aktif + checkbox Belum Aktivasi & Nonaktif), urutan Belum Absen→Sudah Absen→A-Z, cegah double (klik status sama → toast "sudah tercatat"). Popup **ManualAttendance lama disembunyikan** (komponen tetap ada di kode, tidak dihapus).
- **Tahap 4-7 Status & Lock**: `lib/activityStatus.js` (`activityStatus` + `StatusBadge`) — Badge Berlangsung(hijau)/Akan Datang(kuning)/Selesai(merah) otomatis dari tanggal+jam+`manual_finished`. Auto-lock saat lewat jam selesai. Tombol Admin **Selesaikan Kegiatan** & **Buka Kembali Kegiatan** (konfirmasi via useConfirm) → PATCH `/activities/{id}` `manual_finished` true/false (reuse endpoint, tambah 1 field opsional). Saat Selesai: Scan QR & tombol Quick Attendance disabled, QR di-overlay "Kegiatan Selesai"; Rekap tetap tersedia.
- **Backend (minimal)**: tambah `ActivityUpdate.manual_finished`, helper `_activity_finished(act)` (manual_finished true=terkunci, false=override buka, None=auto by jam selesai server), guard di `_record_attendance` → tolak "Kegiatan sudah selesai. Absensi ditutup." (berlaku untuk scan/manual/self). `GET /activities` & `/activities/{id}` mengembalikan `manual_finished` (raw doc). Tidak mengubah DB/login/role/QR/scanner.
- **Perbaikan testid**: `TimePickerWITA` kini pakai `data-testid` (bukan `id`) untuk formStart/formEnd.
- Teruji: backend via curl (quick attendance saat aktif OK; setelah selesai diblokir; setelah buka kembali aktif lagi; anti-double=1 baris; GET mengembalikan manual_finished) + self-test UI Playwright end-to-end (badge Berlangsung, 3 tab, search 'fr'→frengky, Hadir counter+toast, double dicegah, Izin update jadi 1 baris Rekap, Selesaikan→badge Selesai + Scan disabled, Buka Kembali→Berlangsung). Data test dibersihkan.
- ⚠️ Perbaikan di preview. Untuk berlaku di produksi (e-kertalangu.com) perlu **redeploy**.

## Aktivasi di QR Publik lama — Ags 2026 (arsip)

## BATCH 6 — Fix Koneksi Peserta Existing pada Scan Kegiatan Mandiri (Jun 2026) — SELESAI & TERUJI (self-test)
- **Gejala (produksi e-kertalangu.com / *.emergent.host)**: halaman Checkin `/a/:code` menampilkan "Tidak Dapat Absen — Peserta tidak ditemukan" untuk peserta yang sudah aktif.
- **Akar masalah (RCA)**: self-scan me-resolve peserta HANYA via `user.participant_id`. Jika data peserta di-import ulang / dihapus-dibuat lagi, `_id` peserta berubah sehingga akun peserta aktif menunjuk `participant_id` yatim (orphaned) → `_record_attendance` gagal "Peserta tidak ditemukan". Bukan masalah nama/QR/library.
- **Perbaikan (minimal-invasive, backend only)**: helper `_resolve_self_participant(user)` di `server.py`:
  1) utamakan `participant_id` existing; 2) fallback ke identifier unik existing **No. HP → email**; 3) fallback terakhir **nama persis & UNIK** (hindari salah cocok bila nama sama). Jika ketemu via fallback, **self-heal tautan akun itu saja** (`users.update_one participant_id`) + catat `relink_participant` di log. TIDAK membuat peserta baru, TIDAK migrasi massal, TIDAK ubah nama sebagai identitas utama.
- Dipakai di `/attendance/self-v2` (dipakai app: QRScanner selfMode + Checkin `/a/:code`) dan `/attendance/self` (legacy).
- Tambahan robustness pada self-v2: backend juga menormalisasi **QR format URL** (`…/a/<code>`) sebagai defense-in-depth; pesan error granular (#14): QR tidak valid / kegiatan tidak ditemukan / peserta tidak ditemukan / belum tertaut / **"Anda sudah melakukan absensi pada kegiatan ini"** (anti-double tetap: 1 baris).
- **Tidak diubah**: DB schema, login/session/role/auth, QR library/kamera, alur pengurus scan/manual, data peserta existing.
- Teruji (curl + verifikasi DB, lalu DB dikembalikan): (1) participant_id sengaja dirusak → fallback via HP reconnect + absensi tercatat ke peserta yang benar + self-heal mengembalikan tautan; (2) URL QR mentah dinormalisasi + double-scan → pesan "sudah absen", hanya 1 baris; (3) QR invalid → pesan jelas. Regresi flow normal (participant_id valid) tetap jalan.

## Aktivasi di QR Publik lama — Ags 2026 (arsip catatan)

## BATCH 5 — Peningkatan UI, Dashboard Statistik & UX (Jun 2026) — SELESAI & TERUJI
- **Statistik Dashboard berbasis peran**: `GET /api/dashboard/stats` kini menyertakan blok `overview` HANYA untuk admin/pengurus (counts saja, tanpa PII). Admin: total_participants, activated_participants, unactivated_participants, total_activities, monthly_activities (bulan kalender berjalan via regex `^YYYY-MM`), total_attendance, attendance_rate. Peserta tidak mendapat `overview`. Field lama (gender/last30/today/series/pending) tetap (regresi aman).
- **Dashboard.jsx**: komponen `Stat` (ikon + nilai) + section `dashboard-overview`. Admin 7 kartu; Pengurus versi ringkas (Peserta Aktif, Kegiatan Bulan Ini, Total Absensi, Rasio Kehadiran). Peserta dashboard TIDAK berubah. Kartu responsif (grid 2→3→4).
- **Footer global "Version V2.0"** di `AppShell.jsx` (`data-testid=app-footer`/`app-version`), muncul di semua halaman `/app/*`.
- **Toast modern**: Login (sudah ada), Scan sukses/gagal (sudah ada), **Logout** baru → toast "Berhasil keluar. Sampai jumpa!". Emoji 🙏 dihapus dari pesan WA alpha-alert (template WA backend sudah formal tanpa emoji).
- **Konfirmasi Hapus modern**: `lib/confirm.jsx` (`ConfirmProvider`/`useConfirm`, berbasis AlertDialog, promise-based). Semua `window.confirm` diganti di: Participants (arsip/reset-pw/bulk-delete), ParticipantDetail (hapus/nonaktif akun), ArchivedParticipants (hapus permanen), Announcements, ActivityDetail, Users (reject), Musyawarah, PhotoAlbum. data-testid: `confirm-dialog`/`confirm-accept`/`confirm-cancel`.
- Tidak ada perubahan DB/auth/RBAC. Teruji: testing agent iteration_6 — backend 3/3, frontend 100% (semua acceptance BATCH 5). Sisa non-blocking: warning setState-in-render `Login.jsx` (pre-existing, di luar scope).

## BATCH 5b — Perbaikan Login & Ekspor Statistik (Jun 2026) — SELESAI & TERUJI (self-test)
- **Fix Login setState-saat-render**: `Login.jsx` — hapus panggilan `nav()` di body render + `useEffect` redirect redundan, diganti `return <Navigate to={nextPath} replace />` saat sudah login. Konsol bersih (0 warning "Cannot update a component while rendering"). Verified via console capture.
- **Ekspor Ringkasan Statistik Dashboard**: tombol **Statistik PDF** (`export-stats-pdf`) & **Statistik Excel** (`export-stats-excel`) di section `dashboard-overview` (admin & pengurus). PDF via `buildStatsPdf` di `lib/reportPdf.js` (logo + cakupan peran + statistik menyeluruh + rekap jamaah/kehadiran, multipage, footer). Excel via SheetJS (`xlsx`) client-side. Nama file `statistik-e-kertalangu-YYYY-MM-DD.(pdf|xlsx)`. Download terverifikasi via Playwright expect_download + toast konfirmasi. Client-side saja, tanpa endpoint/DB baru.

## Restrukturisasi Deploy Vercel (Jun 2026)
Target: **backend + frontend satu domain di Vercel**, DB di **MongoDB Atlas**, Root Directory Vercel = `./`.

File baru/berubah:
- `vercel.json` (root) — `builds`: `api/index.py` via `@vercel/python` (`includeFiles: backend/**`, maxLambdaSize 50mb) + `frontend/package.json` via `@vercel/static-build` (`distDir: build`). `routes`: `/api/(.*)` → lambda, `handle: filesystem`, fallback `/(.*)` → `/index.html` (SPA).
- `requirements.txt` (root) — dependency slim khusus serverless (fastapi, motor, pymongo, dnspython, pydantic, email-validator, dotenv, multipart, PyJWT, bcrypt, qrcode, pillow, openpyxl). `backend/requirements.txt` tetap untuk preview.
- `api/index.py` — entrypoint Vercel, `sys.path` → `backend/`, `from server import app`. Sumber kode tetap satu di `backend/server.py` (tidak diduplikasi).
- `.vercelignore` — exclude memory/tests/test_reports/.env/node_modules.
- `DEPLOY_VERCEL.md` — panduan setting Vercel + daftar env + langkah MongoDB Atlas.
- `backend/server.py` — `GET /api/health`; startup dipindah ke `bootstrap()` idempoten yang dipanggil dari `@app.on_event('startup')` **dan** middleware HTTP lazy (serverless cold start tidak selalu jalankan lifespan). Hapus duplikat handler `GET /notifications` (dead code); `_id` tidak lagi bocor di response upload foto.
- `frontend/src/lib/api.js` — export `BACKEND_URL` dengan fallback `''` → API dipanggil **same-origin** (`/api`). `PhotoAlbum.jsx` ikut memakai export ini.
- `frontend/craco.config.js` — `dotenv` hanya dimuat saat non-production agar `.env.production` bisa mengosongkan `REACT_APP_BACKEND_URL`.
- `frontend/.env.production` — `REACT_APP_BACKEND_URL=` (kosong).
- `frontend/package.json` — script `vercel-build: CI=false craco build`.

Teruji: build produksi sukses & tidak ada URL preview ter-hardcode; testing agent iteration_8 → backend 25/25, frontend 100% (login admin, 7 halaman admin, PhotoAlbum) tanpa console error.

Backlog:
- P1: split `backend/server.py` (~2400 baris) jadi beberapa router.
- P2: Google Drive OAuth (masih stub).
- P2: bersihkan file test lama di `backend/tests` yang memakai kredensial usang.
