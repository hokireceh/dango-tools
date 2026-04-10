# Dango DEX Tools

Platform trading dashboard untuk Dango Exchange — mencakup Grid Trading Bot dengan manajemen rerange otomatis, sistem akses berbasis langganan via Telegram Bot + Saweria QRIS, dan dashboard monitoring.

---

## Daftar Isi

- [Arsitektur](#arsitektur)
- [Prasyarat](#prasyarat)
- [Instalasi Lokal](#instalasi-lokal)
- [Environment Variables](#environment-variables)
- [Cara Login](#cara-login)
  - [Login sebagai Admin](#login-sebagai-admin)
  - [Login sebagai User Telegram](#login-sebagai-user-telegram)
- [Deploy ke VPS](#deploy-ke-vps)
  - [Setup dengan File .env](#setup-dengan-file-env)
  - [Menjalankan dengan PM2](#menjalankan-dengan-pm2)
  - [Menjalankan dengan Systemd](#menjalankan-dengan-systemd)
- [Paket Akses](#paket-akses)
- [Alur Pembayaran Telegram Bot](#alur-pembayaran-telegram-bot)

---

## Arsitektur

```
monorepo/
├── artifacts/
│   ├── dex-tools/        # Frontend React + Vite (port 25020)
│   ├── api-server/       # Backend Express 5 (port 8080)
│   └── telegram-bot/     # Telegram Bot (Telegraf)
├── lib/
│   ├── db/               # Drizzle ORM + schema PostgreSQL
│   ├── api-spec/         # OpenAPI spec + codegen Orval
│   └── api-client-react/ # React hooks dari codegen
```

---

## Prasyarat

- Node.js >= 20
- pnpm >= 9
- PostgreSQL database

---

## Instalasi Lokal

```bash
# Clone dan install dependencies
git clone https://github.com/hokireceh/dango-tools.git
cd dango-tools
pnpm install

# Salin file env dan isi nilainya
cp .env.example .env
# Edit .env sesuai kebutuhan

# Push schema database
pnpm --filter @workspace/db run push

# Jalankan semua service
pnpm --filter @workspace/api-server run dev   # API di port 8080
pnpm --filter @workspace/dex-tools run dev    # Frontend di port 25020
pnpm --filter @workspace/telegram-bot run dev # Telegram Bot
```

---

## Environment Variables

Buat file `.env` di root monorepo (atau set di environment VPS/Docker):

```env
# ── Database ──────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@localhost:5432/dango_dex

# ── Admin Dashboard ───────────────────────────────────────────────────────────
# Password untuk login admin ke dashboard.
# Login dengan: Telegram ID = "admin", Password = nilai ini.
# Juga dipakai sebagai Bearer token langsung untuk akses API via curl/Postman.
ADMIN_PASSWORD=ganti_dengan_password_yang_kuat_dan_acak

# ── Telegram Bot ──────────────────────────────────────────────────────────────
# Token bot dari @BotFather
BOT_TOKEN=123456789:ABCDEFghijklmno...

# ── Saweria (pembayaran QRIS) ──────────────────────────────────────────────────
# Username Saweria kamu
SAWERIA_USERNAME=username_saweria_kamu
# UUID user Saweria (dari URL profil Saweria)
SAWERIA_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# ── Notifikasi Admin (opsional) ───────────────────────────────────────────────
# Chat ID Telegram admin untuk menerima notifikasi pembayaran berhasil
ADMIN_CHAT_ID=123456789
```

### Penjelasan Per Variable

| Variable | Wajib | Keterangan |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `ADMIN_PASSWORD` | ✅ | Password login admin dashboard (gunakan string acak yang kuat) |
| `BOT_TOKEN` | ✅ (bot) | Token bot Telegram dari @BotFather |
| `SAWERIA_USERNAME` | ✅ (bot) | Username akun Saweria |
| `SAWERIA_USER_ID` | ✅ (bot) | UUID user Saweria (lihat di URL profil Saweria kamu) |
| `ADMIN_CHAT_ID` | ⬜ | Chat ID Telegram admin untuk notifikasi; bot tidak kirim notif jika kosong |

---

## Cara Login

### Login sebagai Admin

Admin tidak perlu membeli langganan. Cukup set `ADMIN_PASSWORD` di environment.

**Login via Dashboard:**
1. Buka dashboard → akan redirect ke halaman `/login`
2. Isi form:
   - **Telegram ID**: `admin` (literal, huruf kecil)
   - **Password**: nilai `ADMIN_PASSWORD` yang sudah di-set
3. Klik **Masuk** — langsung masuk ke dashboard dengan akses penuh

**Akses API via curl/Postman (opsional):**
```bash
# Gunakan ADMIN_PASSWORD langsung sebagai Bearer token
curl -H "Authorization: Bearer {ADMIN_PASSWORD}" http://localhost:8080/api/grid-bots
```

> **Keamanan**: Gunakan `ADMIN_PASSWORD` yang kuat dan acak — minimal 32 karakter, kombinasi huruf besar/kecil, angka, dan simbol. Jangan gunakan password yang mudah ditebak.

---

### Login sebagai User Telegram

User yang sudah membeli langganan via Telegram Bot:

1. Buka dashboard → redirect ke `/login`
2. Isi form:
   - **Telegram ID**: ID Telegram kamu (angka, contoh: `123456789`)
   - **Password**: Password yang dikirim bot setelah pembayaran berhasil
3. Klik **Masuk**

Token sesi disimpan di browser dan otomatis dipakai untuk semua request API. Jika token kadaluarsa, akan redirect ke halaman login secara otomatis.

---

## Deploy ke VPS

### Setup dengan File .env

Di VPS, buat file `.env` di direktori project:

```bash
# Masuk ke direktori project
cd /opt/dango-dex-tools

# Buat file .env
nano .env
```

Isi file `.env`:
```env
DATABASE_URL=postgresql://dango:password@localhost:5432/dango_dex
ADMIN_PASSWORD=P@ssw0rd_Acak_Sangat_Panjang_Dan_Kuat_32chars
BOT_TOKEN=123456789:ABCDEFghijklmno...
SAWERIA_USERNAME=username_saweria
SAWERIA_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ADMIN_CHAT_ID=123456789
```

```bash
# Amankan file .env agar hanya owner yang bisa baca
chmod 600 .env
```

---

### Menjalankan dengan PM2

PM2 otomatis baca file `.env` di direktori yang sama:

```bash
# Install PM2 global
npm install -g pm2

# Buat file ecosystem PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: "dango-api",
      script: "pnpm",
      args: "--filter @workspace/api-server run start",
      cwd: "/opt/dango-dex-tools",
      env_file: ".env",
      env: { PORT: 8080, NODE_ENV: "production" }
    },
    {
      name: "dango-frontend",
      script: "pnpm",
      args: "--filter @workspace/dex-tools run preview",
      cwd: "/opt/dango-dex-tools",
      env_file: ".env",
      env: { PORT: 3000, BASE_PATH: "/", NODE_ENV: "production" }
    },
    {
      name: "dango-bot",
      script: "pnpm",
      args: "--filter @workspace/telegram-bot run start",
      cwd: "/opt/dango-dex-tools",
      env_file: ".env",
      env: { NODE_ENV: "production" }
    }
  ]
}
EOF

# Jalankan semua service
pm2 start ecosystem.config.js

# Simpan agar auto-start setelah reboot
pm2 save
pm2 startup
```

---

### Menjalankan dengan Systemd

Contoh unit file untuk API server (`/etc/systemd/system/dango-api.service`):

```ini
[Unit]
Description=Dango DEX Tools - API Server
After=network.target postgresql.service

[Service]
Type=simple
User=dango
WorkingDirectory=/opt/dango-dex-tools
EnvironmentFile=/opt/dango-dex-tools/.env
Environment=PORT=8080
Environment=NODE_ENV=production
ExecStart=/usr/bin/pnpm --filter @workspace/api-server run start
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# Aktifkan dan jalankan
sudo systemctl daemon-reload
sudo systemctl enable dango-api
sudo systemctl start dango-api
sudo systemctl status dango-api
```

Buat unit serupa untuk `dango-frontend` dan `dango-bot`.

---

### Nginx Reverse Proxy (rekomendasi)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Paket Akses

| Plan | Durasi | Harga |
|------|--------|-------|
| 30 hari | 30 hari | Rp 50.000 |
| 60 hari | 60 hari | Rp 100.000 |
| 90 hari | 90 hari | Rp 150.000 |

---

## Alur Pembayaran Telegram Bot

1. User kirim `/start` ke bot Telegram
2. Pilih paket akses (30/60/90 hari)
3. Bot generate QR QRIS Saweria dan kirim ke chat
4. User scan dan bayar
5. Bot polling status pembayaran tiap 7 detik (timeout 15 menit)
6. Jika pembayaran berhasil:
   - Akun user dibuat/diperbarui di database
   - Bot kirim pesan ke user berisi **Telegram ID** dan **Password**
   - Admin mendapat notifikasi (jika `ADMIN_CHAT_ID` di-set)
7. User buka dashboard → login dengan Telegram ID + Password dari bot

> **Catatan**: Password hanya dikirim sekali via Telegram saat pembayaran berhasil. Simpan baik-baik. Jika lupa, user perlu membeli langganan baru atau menghubungi admin untuk reset.



### 
Kamu adalah auditor harian untuk proyek Hokireceh Projects (Sepi Bukan Sapi).

## LANGKAH WAJIB — jalankan berurutan, jangan skip

1. Baca struktur direktori project
2. Baca `replit.md` dan `docs/audit/Audit.md` (audit log sebelumnya)
3. Jalankan `node fetch-dango.js` untuk refresh docs Dango terbaru
4. Baca file-file hasil fetch yang relevan di `docs/dango-docs/` sesuai area yang akan diaudit
5. Baca source code yang relevan (bot engines, telegramBot.ts, API routes, dll)
6. Lakukan audit, lalu tulis hasilnya

## FORMAT OUTPUT ke docs/audit/Audit.md

Append section baru di bawah isi sebelumnya (JANGAN overwrite), dengan format:

---
## Audit [YYYY-MM-DD]

### ✅ Sudah Beres
- ...

### 🐛 Bug / Issue Ditemukan
| # | File | Deskripsi | Severity |
|---|------|-----------|----------|
| 1 | ... | ... | high/mid/low |

### 🔍 Temuan dari Dango Docs
- (hal baru dari docs yang relevan ke implementasi kita)

### 📋 Carry-over dari Audit Sebelumnya
- (issue lama yang belum resolved, salin dari audit sebelumnya)

### 🎯 Prioritas Hari Ini
1. ...
2. ...

---

## ATURAN
- Jangan auto-fix apapun — report dulu, tunggu approval
- Jangan klaim akses URL eksternal secara langsung, selalu pakai fetch-dango.js
- Kalau ada konflik antara docs Dango dan implementasi kita, flagging sebagai temuan
- Carry-over wajib disertakan supaya tidak ada issue yang hilang antar sesi