# Dango DEX Tools

## Overview

Platform web DEX Tools untuk trader Dango Exchange (CLOB on-chain). Mencakup Grid Trading Bot dengan Auto-Rerange Aggressiveness, dashboard portfolio, dan pengelolaan bot.

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

## Key Features

- **Dashboard**: Total bots, PnL, rerange stats, recent activity, top performer
- **Grid Bot List**: CRUD bot, toggle aktif/nonaktif, PnL per bot
- **Grid Bot Detail**: Info lengkap, log aktivitas, chart simulasi, trigger rerange manual
- **Settings**: RPC Endpoint, Private Key, API Key — enkripsi AES di localStorage, TIDAK pernah ke server

## Grid Bot Rerange Modes

| Mode         | Threshold              | Check | Cooldown | Max/Hari |
|--------------|------------------------|-------|----------|----------|
| off          | -                      | -     | -        | -        |
| conservative | Keluar range penuh     | 5x    | 2 jam    | 3x       |
| moderate     | 50% mendekati tepi     | 5x    | 2 jam    | 3x       |
| aggressive   | 30% mendekati tepi     | 3x    | 1 jam    | 5x       |

Mode aggressive memiliki warning tooltip di UI.

## Key Commands

- ```pnpm run typecheck``` — full typecheck
- ```pnpm run build``` — typecheck + build all
- ```pnpm --filter @workspace/api-spec run codegen``` — regenerate API hooks
- ```pnpm --filter @workspace/db run push``` — push DB schema
- ```pnpm --filter @workspace/api-server run dev``` — run API server
- ```pnpm --filter @workspace/dex-tools run dev``` — run frontend

## DB Tables

- `grid_bots` — konfigurasi dan status bot
- `bot_logs` — log aktivitas bot (rerange, toggle, created)

## Security

- Private Key dan API Key disimpan di browser localStorage dengan enkripsi AES-256 (crypto-js)
- Credentials TIDAK pernah dikirim ke server
- Halaman Settings menampilkan security warning yang jelas
- Tombol "Clear All Keys" untuk menghapus semua credential sekaligus
