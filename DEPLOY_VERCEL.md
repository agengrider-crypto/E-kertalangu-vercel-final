# Deploy E-Kertalangu ke Vercel (Frontend + Backend) + MongoDB Atlas

## 1. Struktur yang dipakai Vercel
```
./                     <-- Root Directory di Vercel = "./"
├── vercel.json        <-- konfigurasi build & routing
├── requirements.txt   <-- dependency Python untuk serverless function
├── api/index.py       <-- entrypoint API (import FastAPI app dari backend/server.py)
├── backend/server.py  <-- sumber kode API (satu-satunya, tidak diduplikasi)
└── frontend/          <-- React (CRA + craco), di-build jadi static site
```

Routing:
- `/api/*`  -> Python serverless function (FastAPI)
- lainnya   -> file statis hasil build React, fallback `index.html` (SPA)

Karena satu domain, frontend memanggil API secara **same-origin** (`/api/...`).

## 2. Setting di dashboard Vercel
- **Framework Preset:** Other
- **Root Directory:** `./` (biarkan root, JANGAN diisi `frontend`)
- Build & Output: biarkan kosong — sudah diatur `vercel.json`

## 3. Environment Variables (Project Settings -> Environment Variables)
| Key | Contoh / Catatan |
|---|---|
| `MONGO_URL` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME` | `ekertalangu` |
| `JWT_SECRET` | string acak panjang (min 32 char) |
| `CORS_ORIGINS` | `https://<domain-vercel-anda>` (same-origin, bisa juga `*`) |
| `TOKEN_TTL_DAYS` | `30` |
| `ADMIN_EMAIL` | `agengpadma8@gmail.com` |
| `ADMIN_PASSWORD` | password admin |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_NAME` | `Admin` |
| `ADMIN_PHONE` | `62xxxxxxxxxx` |
| `ADMIN_CONTACT_WA` | `62xxxxxxxxxx` |

> `REACT_APP_BACKEND_URL` **tidak perlu diisi**. `frontend/.env.production` sengaja
> mengosongkannya agar API dipanggil relatif (`/api`) di domain yang sama.

## 4. MongoDB Atlas
1. Buat cluster (free M0 cukup) -> Database Access -> buat user + password.
2. Network Access -> Add IP Address -> `0.0.0.0/0` (Vercel serverless IP dinamis).
3. Copy connection string ke env `MONGO_URL`, isi `DB_NAME` (mis. `ekertalangu`).
4. Index & admin default dibuat otomatis saat request pertama (bootstrap idempoten).

## 5. Deploy
```
vercel            # preview
vercel --prod     # production
```
Atau hubungkan repo GitHub ke Vercel (auto-deploy tiap push).

## 6. Verifikasi
- `GET https://<domain>/api/health` -> `{"status":"ok"}`
- Buka `https://<domain>/` -> halaman login muncul, login admin berhasil.
