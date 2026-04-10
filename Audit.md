# Audit Harian — Hokireceh Projects

**Proyek:** Dango DEX Tools (Grid Trading Bot untuk Dango Exchange)  
**Audit Pertama:** 10 April 2026  
**Basis Docs:** [docs.dango.exchange](https://docs.dango.exchange/), [dango-4.gitbook.io](https://dango-4.gitbook.io/), [github.com/left-curve/left-curve](https://github.com/left-curve/left-curve)

---

## Legenda Status

| Status | Arti |
|--------|------|
| ⏳ BELUM | Belum ada perbaikan |
| 🔧 PROSES | Sedang dikerjakan |
| ✅ SELESAI | Sudah diperbaiki dan diverifikasi |

---

## [SETTINGS] — Isu Keamanan & Kompatibilitas

| # | Tingkat | Masalah | File | Status | Tanggal Fix |
|---|---------|---------|------|--------|-------------|
| S-01 | 🔴 KRITIKAL | **Private Key field tidak kompatibel dengan Dango** — Placeholder `0x...` (EVM-style) bertentangan dengan docs Dango: *"keyless system with passkeys/biometrics"*. Tidak ada signing via passkey di kode. User share private key sensitif tanpa manfaat. | `artifacts/dex-tools/src/pages/settings.tsx` | ⏳ BELUM | — |
| S-02 | 🔴 KRITIKAL | **Enkripsi AES hardcoded = zero security** — `encryption.ts:6` menggunakan `STORAGE_ENCRYPTION_KEY = "DANGO_DEX_LOCAL_SECURE_KEY_998877"` yang terekspos di JS bundle. Inspect browser → decrypt mudah. UI klaim "AES encryption" menyesatkan. | `artifacts/dex-tools/src/lib/encryption.ts` | ⏳ BELUM | — |
| S-03 | 🟠 SERIUS | **API Key field fiktif** — Placeholder `dn_...` tanpa referensi di docs Dango. Tidak ada sistem API key publik dari Dango yang terdokumentasi. Bingungkan user. | `artifacts/dex-tools/src/pages/settings.tsx` | ⏳ BELUM | — |

---

## [STRATEGIES / Grid Bots] — Core Logic

| # | Tingkat | Masalah | File | Status | Tanggal Fix |
|---|---------|---------|------|--------|-------------|
| G-01 | 🔴 KRITIKAL | **Auto-Rerange tidak pernah jalan** — Mode rerange (conservative/moderate/aggressive) tersimpan di DB, tapi tidak ada scheduler/cron/setInterval di codebase. Bot statis; user expect auto-adjust tapi nol terjadi. | — (perlu dibuat) | ⏳ BELUM | — |
| G-02 | 🔴 KRITIKAL | **Trigger rerange = simulasi palsu** — `/trigger-rerange:163` menggunakan `simulatedPrice = (lower + upper)/2` bukan harga pasar. Tidak ada RPC call, tidak ada cancel/create order di CLOB. Hanya update counter DB. Tombol "Force Rerange" adalah placebo. | `artifacts/api-server/src/routes/gridBots.ts` (baris 151–185) | ⏳ BELUM | — |
| G-03 | 🔴 KRITIKAL | **Harga dari CoinGecko, bukan Dango** — `market.ts` pakai `api.coingecko.com`. Dango punya CLOB on-chain dengan price feed sendiri. Rerange trigger salah timing/harga → potensi loss. | `artifacts/api-server/src/routes/market.ts` | ⏳ BELUM | — |
| G-04 | 🔴 KRITIKAL | **Delete/Toggle bot tidak cancel order on-chain** — `DELETE /grid-bots/:id` hanya DB delete; `POST /toggle` hanya ubah flag `isActive`. Order di CLOB Dango tetap live setelah bot "dimatikan". | `artifacts/api-server/src/routes/gridBots.ts` (baris 114–149) | ⏳ BELUM | — |

---

## [STRATEGIES / Trade History] — UI Bugs

| # | Tingkat | Masalah | File | Status | Tanggal Fix |
|---|---------|---------|------|--------|-------------|
| T-01 | 🟡 BUG | **eventType case mismatch** — Backend log: `"created"/"toggle"/"rerange"` (lowercase). Frontend check: `'RERANGE'/'CREATED'/'ERROR'` (UPPERCASE). Kondisi tidak pernah true — semua log tampil dengan icon default abu-abu. | `artifacts/api-server/src/routes/gridBots.ts`, `artifacts/dex-tools/src/pages/grid-bot-detail.tsx` (baris 242–248) | ⏳ BELUM | — |
| T-02 | 🟡 BUG | **PnL chart adalah data palsu** — `grid-bot-detail.tsx:78` menggunakan `Math.sin(i / 3)` mock data dengan label "PnL Simulation" yang tampak seperti data real. Bisa menyesatkan user tentang performa bot. | `artifacts/dex-tools/src/pages/grid-bot-detail.tsx` (baris 78–85) | ⏳ BELUM | — |

---

## [DEAD CODE] — Cleanup

| # | File | Deskripsi | Status | Tanggal Fix |
|---|------|-----------|--------|-------------|
| D-01 | `scripts/src/hello.ts` | Hanya `console.log("Hello from @workspace/scripts")`. Tidak dipanggil dari manapun, tidak ada fungsi. | ⏳ BELUM | — |
| D-02 | `artifacts/api-server/src/routes/botLogs.ts` (baris 18) | `let query = db.select()...` dibuat tapi discarded setiap kali `botId` ada (path tersering). Variable tidak pernah digunakan di path utama. | ⏳ BELUM | — |

---

## Prioritas Fix yang Direkomendasikan

1. **T-01** — eventType case mismatch (cepat, low-risk, langsung terlihat)
2. **D-01, D-02** — Dead code cleanup
3. **S-02** — Hapus klaim enkripsi palsu / ganti dengan warning jujur
4. **G-01** — Buat auto-rerange scheduler (dampak terbesar ke live trading)
5. **G-02** — Hubungkan trigger rerange ke harga real
6. **G-03** — Switch harga ke Dango price feed (bukan CoinGecko)
7. **G-04** — Cancel on-chain order saat delete/toggle bot
8. **S-01** — Review field private key (perlu keputusan arsitektur passkey)
9. **S-03** — Verifikasi atau hapus field API key
10. **T-02** — Ganti chart palsu dengan data historis real dari `bot_logs`

---

## Riwayat Sesi

| Tanggal | Sesi | Yang Dikerjakan |
|---------|------|----------------|
| 10 Apr 2026 | Sesi 1 | Audit pertama — semua temuan diidentifikasi, tidak ada perubahan kode. Setup workflows (API Server + frontend), provisioning database, push schema Drizzle. Fixed: runtime error `bots.map is not a function` akibat DB belum ada. |
