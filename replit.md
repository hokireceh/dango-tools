# Dango DEX Tools

## Overview

Platform web DEX Tools untuk trader Dango Exchange (CLOB on-chain). Mencakup Grid Trading Bot dengan Auto-Rerange Aggressiveness, dashboard portfolio, pengelolaan bot, dan sistem pembayaran akses via Saweria QRIS (Telegram Bot).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/dex-tools)
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Encryption**: crypto-js (AES untuk localStorage)
- **Charts**: Recharts
- **Telegram Bot**: Telegraf v4 + Saweria QRIS payment

## Key Features

- **Login Page**: Halaman login dengan Telegram ID + password; redirect otomatis ke `/login` jika tidak terautentikasi; token disimpan di localStorage; global 401 handler otomatis logout
- **Dashboard**: Total bots, PnL, rerange stats, recent activity, top performer
- **Grid Bot List**: CRUD bot, toggle aktif/nonaktif, PnL per bot
- **Grid Bot Detail**: Info lengkap, log aktivitas, chart simulasi, trigger rerange manual
- **Settings**: RPC Endpoint, Private Key, API Key — enkripsi AES di localStorage, TIDAK pernah ke server
- **Sistem Pembayaran**: Telegram Bot + Saweria QRIS — beli akses dashboard

## Grid Bot Rerange Modes

| Mode         | Threshold              | Check | Cooldown | Max/Hari |
|--------------|------------------------|-------|----------|----------|
| off          | -                      | -     | -        | -        |
| conservative | Keluar range penuh     | 5x    | 2 jam    | 3x       |
| moderate     | 50% mendekati tepi     | 5x    | 2 jam    | 3x       |
| aggressive   | 30% mendekati tepi     | 3x    | 1 jam    | 5x       |

Mode aggressive memiliki warning tooltip di UI.

## Key Commands

- `pnpm run typecheck` — full typecheck
- `pnpm run build` — typecheck + build all
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks
- `pnpm --filter @workspace/db run push` — push DB schema
- `pnpm --filter @workspace/api-server run dev` — run API server
- `pnpm --filter @workspace/dex-tools run dev` — run frontend
- `pnpm --filter @workspace/telegram-bot run dev` — run Telegram bot

## DB Tables

- `grid_bots` — konfigurasi dan status bot
- `bot_logs` — log aktivitas bot (rerange, toggle, created)
- `access_tokens` — session token hasil login (UUID, expires)
- `users` — pengguna Telegram: telegramId, passwordHash, plan, expiresAt

## Alur Pembayaran (Telegram Bot)

1. User kirim `/start` ke bot Telegram
2. Pilih paket akses (30/60/90 hari)
3. Bot buat donasi Saweria QRIS & kirim QR image
4. Bot polling status pembayaran setiap 7 detik (max 15 menit)
5. Jika sukses:
   - `upsertUser()` — simpan/update user di DB dengan password baru (bcrypt-hashed)
   - Kirim Telegram ID saja ke user (password TIDAK dikirim via Telegram)
   - Kirim notifikasi admin (tanpa password — hanya info user & plan)
6. User login ke dashboard: `POST /api/auth/login { telegramId, password }`
7. Endpoint return Bearer token → dipakai untuk akses API

## API Auth Endpoints

| Endpoint | Deskripsi |
|---|---|
| `POST /api/auth/initiate` | Buat QRIS Saweria (web flow) |
| `GET /api/auth/poll/:donationId` | Poll status pembayaran (web flow) |
| `POST /api/auth/verify` | Verifikasi Bearer token |
| `POST /api/auth/login` | Login Telegram user: `{ telegramId, password }` → `{ token, expiresAt, plan }` |

Admin login: set `ADMIN_PASSWORD` env var. Gunakan `Bearer {ADMIN_PASSWORD}` di header.

## Paket Akses

| Plan | Durasi | Harga |
|------|--------|-------|
| 30d  | 30 hari | Rp 40.000 |
| 60d  | 60 hari | Rp 70.000 |
| 90d  | 90 hari | Rp 100.000 |

## Environment Variables

| Variable | Keterangan | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `BOT_TOKEN` | Telegram bot token dari @BotFather | ✅ (bot) |
| `SAWERIA_USERNAME` | Username Saweria | ✅ (bot) |
| `SAWERIA_USER_ID` | UUID Saweria | ✅ (bot) |
| `ADMIN_CHAT_ID` | Telegram chat ID admin untuk notifikasi | ⬜ |
| `ADMIN_PASSWORD` | Password admin untuk akses API dashboard | ⬜ |

## Security

- Private Key dan API Key disimpan di browser localStorage dengan enkripsi AES-256 (crypto-js)
- Credentials TIDAK pernah dikirim ke server
- Halaman Settings menampilkan security warning yang jelas
- Tombol "Clear All Keys" untuk menghapus semua credential sekaligus
- Password user di-hash dengan bcrypt (salt rounds: 10)
- Admin password dibandingkan secara langsung dari Bearer header (gunakan password yang kuat)
