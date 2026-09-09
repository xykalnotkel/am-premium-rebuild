# AM Prem Verifier — Rebuild Mandiri (Opsi B)

Rebuild penuh dari `am-premiumms.vercel.app` hasil reverse-engineering. Backend **langsung ke Firebase IdentityToolkit** — tanpa perantara, tanpa tergantung web lama. UI **Quiet Surface** + **icon library AI ungu** (WebP transparan).

Repo: `https://github.com/xykalnotkel/am-premium-rebuild`

## 1. Struktur proyek

```
am-rebuild/
├── app/
│   ├── page.js                 # UI 3 langkah (Email → Link → Hasil) + terminal + riwayat
│   ├── icons/page.js           # Galeri Icon Library (/icons)
│   ├── components/AppIcon.jsx  # Komponen ikon (<AppIcon name size />)
│   ├── layout.js               # Layout + metadata
│   ├── icon.png / apple-icon.png # Favicon otomatis (dari logo AI)
│   ├── globals.css             # Sistem desain Quiet Surface
│   └── api/
│       ├── stats/route.js      # GET  → {success, total, today}
│       ├── send-link/route.js  # POST {email} → kirim magic link via Firebase
│       └── verify-link/route.js# POST {email, magicLink} → verifikasi + lisensi
├── public/icons/               # Icon library: *.webp (256) + *-512.webp (retina)
├── lib/
│   ├── firebase.js             # config, header Android/Dalvik, ekstrak oobCode
│   └── stats.js                # penyimpanan statistik (file JSON)
├── tools/
│   └── extract-magic-link.mjs  # ekstrak apiKey+continueUrl dari 1 magic link asli
├── data/stats.json             # dibuat otomatis saat runtime (jangan di-commit)
└── .env.example                # contoh konfigurasi
```

## 2. Setup — mendapatkan API key (sekali saja)

Backend butuh 2 nilai dari **1 magic link asli**:

1. Buka web lama → kirim magic link ke **email milikmu**.
2. Buka email dari Alight Motion → **klik kanan** tombol *Sign In / Verify* → *Copy link address* (jangan diklik!).
3. Jalankan:
   ```bash
   node tools/extract-magic-link.mjs "<tempel link>"
   ```
4. Salin output ke file `.env`:
   ```bash
   cp .env.example .env
   # isi AM_FIREBASE_API_KEY dan AM_CONTINUE_URL
   ```

## 3. Menjalankan

```bash
npm install
npm run dev      # development → http://localhost:3000
# atau produksi:
npm run build && npm start
```

## 4. Deploy ke Vercel

```bash
npm i -g vercel   # sekali saja
vercel            # ikuti wizard, tambahkan env AM_FIREBASE_API_KEY & AM_CONTINUE_URL
```

> Catatan: `data/stats.json` di Vercel bersifat ephemeral (reset saat redeploy).
> Untuk statistik permanen, ganti `lib/stats.js` dengan Upstash Redis / Vercel KV
> (cukup samakan interface `getStats()` / `bumpStats()`).

## 5. Dokumentasi endpoint

Semua respons JSON dengan envelope `{success, message?, ...}`.

### `GET /api/stats`
```json
{ "success": true, "total": 12, "today": 3 }
```

### `POST /api/send-link`
Request: `{ "email": "user@gmail.com" }`
- Sukses → `{ "success": true, "message": "Link verifikasi dikirim ke ..." }`
- `400 { "success": false, "message": "Email tidak valid." }` — format salah
- `500 { ..., "code": "NOT_CONFIGURED" }` — `.env` belum diisi

### `POST /api/verify-link`
Request: `{ "email": "user@gmail.com", "magicLink": "<tautan lengkap / oobCode>" }`
- Sukses → `{ "success": true, "message": "...", "data": { "uid", "email", "emailVerified", "orderId", "validUntil", "validUntilIso", "issuedAt", "status": "ACTIVE", "membershipStatus": "PREMIUM_ACTIVE", "tier", "stats": { "total", "today" } }, "raw": { "premium": { "ok": true } } }`
- `400 "Email wajib diisi."` / `"Link dari email wajib diisi."` — validasi
- `400 "Kode magic link tidak valid atau sudah pernah digunakan."` (+ `code` = mentahan error Firebase) — oobCode salah/kadaluarsa/beda email

## 6. Icon library

8 ikon AI (logo, mail, link, shield, chart, terminal, download, sparkles):
- Gaya: violet 3D-clay rasa 2D, konsisten satu set.
- Background dihapus pakai **rembg AI (u2net)** → transparan bersih.
- Format sajian: **WebP q90** (±8–13 KB/ikon) + varian `-512.webp` untuk retina via `srcSet`.
- Lihat galeri: buka `/icons`. Pakai: `<AppIcon name="mail" size={24} />`.

## 7. Desain Quiet Surface

Permukaan tenang (off-white `#F6F5F3`, kartu putih radius 20, border 1px lembut),
aksen violet `#7C3AED` selaras ikon, segmented step control, terminal warm-charcoal.
Semua token di `:root` `app/globals.css` — ubah di satu tempat.

## 8. Catatan penting

- **oobCode sekali pakai & terikat email**: verifikasi harus memakai email yang sama dengan penerima magic link.
- **`orderId`/`validUntil` adalah catatan lisensi lokal** yang dibuat backend ini setelah sign-in Firebase sukses — titik integrasi jika suatu saat ada server lisensi sungguhan.
- Jangan nyalakan `AM_RETURN_TOKENS=true` di produksi kecuali untuk debugging — token = akses penuh akun user.
- Memakai Firebase project + nama paket milik pihak lain dapat melanggar ToS Google/Alight Motion. Risiko ditanggung sendiri.
