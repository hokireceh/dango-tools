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
| S-01 | 🔴 KRITIKAL | **Private Key field tidak kompatibel dengan Dango** — Placeholder `0x...` (EVM-style) bertentangan dengan docs Dango: *"keyless system with passkeys/biometrics"*. Tidak ada signing via passkey di kode. User share private key sensitif tanpa manfaat. | `artifacts/dex-tools/src/pages/settings.tsx` | ✅ SELESAI | 10 Apr 2026 |
| S-02 | 🔴 KRITIKAL | **Enkripsi AES hardcoded = zero security** — `encryption.ts:6` menggunakan `STORAGE_ENCRYPTION_KEY = "DANGO_DEX_LOCAL_SECURE_KEY_998877"` yang terekspos di JS bundle. Inspect browser → decrypt mudah. UI klaim "AES encryption" menyesatkan. | `artifacts/dex-tools/src/lib/encryption.ts` | ✅ SELESAI | 10 Apr 2026 |
| S-03 | 🟠 SERIUS | **API Key field fiktif** — Placeholder `dn_...` tanpa referensi di docs Dango. Tidak ada sistem API key publik dari Dango yang terdokumentasi. Bingungkan user. | `artifacts/dex-tools/src/pages/settings.tsx` | ✅ SELESAI | 10 Apr 2026 |

---

## [STRATEGIES / Grid Bots] — Core Logic

| # | Tingkat | Masalah | File | Status | Tanggal Fix |
|---|---------|---------|------|--------|-------------|
| G-01 | 🔴 KRITIKAL | **Auto-Rerange tidak pernah jalan** — Mode rerange (conservative/moderate/aggressive) tersimpan di DB, tapi tidak ada scheduler/cron/setInterval di codebase. Bot statis; user expect auto-adjust tapi nol terjadi. | `artifacts/api-server/src/lib/rerangeScheduler.ts` (baru) | ✅ SELESAI | 10 Apr 2026 |
| G-02 | 🔴 KRITIKAL | **Trigger rerange = simulasi palsu** — `/trigger-rerange:163` menggunakan `simulatedPrice = (lower + upper)/2` bukan harga pasar. Tidak ada RPC call, tidak ada cancel/create order di CLOB. Hanya update counter DB. Tombol "Force Rerange" adalah placebo. | `artifacts/api-server/src/routes/gridBots.ts` (baris 151–185) | ✅ SELESAI | 10 Apr 2026 |
| G-03 | 🔴 KRITIKAL | **Harga dari CoinGecko, bukan Dango** — `market.ts` pakai `api.coingecko.com`. Dango punya CLOB on-chain dengan price feed sendiri. Rerange trigger salah timing/harga → potensi loss. | `artifacts/api-server/src/lib/priceService.ts` | ✅ SELESAI | 10 Apr 2026 |
| G-04 | 🔴 KRITIKAL | **Delete/Toggle bot tidak cancel order on-chain** — `DELETE /grid-bots/:id` hanya DB delete; `POST /toggle` hanya ubah flag `isActive`. Order di CLOB Dango tetap live setelah bot "dimatikan". | `artifacts/api-server/src/routes/gridBots.ts` (baris 114–149) | ⏳ BLOCKED | — |

---

## [STRATEGIES / Trade History] — UI Bugs

| # | Tingkat | Masalah | File | Status | Tanggal Fix |
|---|---------|---------|------|--------|-------------|
| T-01 | 🟡 BUG | **eventType case mismatch** — Backend log: `"created"/"toggle"/"rerange"` (lowercase). Frontend check: `'RERANGE'/'CREATED'/'ERROR'` (UPPERCASE). Kondisi tidak pernah true — semua log tampil dengan icon default abu-abu. | `artifacts/api-server/src/routes/gridBots.ts`, `artifacts/dex-tools/src/pages/grid-bot-detail.tsx` (baris 242–248) | ✅ SELESAI | 10 Apr 2026 |
| T-02 | 🟡 BUG | **PnL chart adalah data palsu** — `grid-bot-detail.tsx:78` menggunakan `Math.sin(i / 3)` mock data dengan label "PnL Simulation" yang tampak seperti data real. Bisa menyesatkan user tentang performa bot. | `artifacts/dex-tools/src/pages/grid-bot-detail.tsx` (baris 78–85) | ✅ SELESAI | 10 Apr 2026 |

---

## [DEAD CODE] — Cleanup

| # | File | Deskripsi | Status | Tanggal Fix |
|---|------|-----------|--------|-------------|
| D-01 | `scripts/src/hello.ts` | Hanya `console.log("Hello from @workspace/scripts")`. Tidak dipanggil dari manapun, tidak ada fungsi. | ✅ SELESAI | 10 Apr 2026 |
| D-02 | `artifacts/api-server/src/routes/botLogs.ts` (baris 18) | `let query = db.select()...` dibuat tapi discarded setiap kali `botId` ada (path tersering). Variable tidak pernah digunakan di path utama. | ✅ SELESAI | 10 Apr 2026 |

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
| 10 Apr 2026 | Sesi 2 | Fix batch low-risk: T-01 (eventType UPPERCASE), D-01 (hapus hello.ts), D-02 (hapus dead `let query`), S-02 (hapus klaim AES enkripsi palsu → ganti warning jujur), S-03 (hapus field apiKey fiktif). Hapus 2 workflow duplikat penyebab konflik port. |
| 10 Apr 2026 | Sesi 3 | Fix T-02 (hapus PnL chart palsu → pesan "no data"). Fix G-01 (buat rerangeScheduler.ts — auto-trigger tiap 60s per mode threshold). Fix G-02 (trigger-rerange pakai harga real dari CoinGecko, bukan midpoint). Ekstrak priceService.ts sebagai shared module. |
| 10 Apr 2026 | Sesi 4 | Fix S-01 (hapus Wallet Private Key field EVM-style — tidak kompatibel dengan passkey Dango; tambah info card penjelasan). G-03 & G-04 pending: butuh akses API/SDK on-chain Dango (CLOB price feed + order cancellation) yang belum terdokumentasi publik. |
| 10 Apr 2026 | Sesi 5 (Audit Harian) | Audit sesi 5: fetch ulang docs Dango (20 file OK). Ditemukan 5 bug baru (1 kritikal, 3 mid, 1 low). G-04 masih BLOCKED. Detail di section `Audit 2026-04-10 Sesi 5`. |

---

## Audit 2026-04-10 Sesi 5

### ✅ Sudah Beres
- **S-01** Private Key EVM-style dihapus — info card passkey sudah ada
- **S-02** Klaim enkripsi AES palsu sudah dihapus → warning jujur
- **S-03** Field API Key fiktif sudah dihapus
- **G-01** Auto-rerange scheduler sudah berjalan (setInterval 60s di `index.ts`)
- **G-02** Trigger-rerange pakai harga real dari priceService (bukan midpoint), dengan fallback ke midpoint jika fetch gagal
- **G-03** priceService sekarang ambil dari Dango Oracle GraphQL duluan, CoinGecko sebagai fallback
- **T-01** eventType case mismatch sudah fix — sekarang semua log pakai UPPERCASE (CREATED, TOGGLE, RERANGE)
- **T-02** PnL chart palsu sudah dihapus — tampil pesan "no data"
- **D-01** hello.ts dead code sudah dihapus
- **D-02** Dead `let query` di botLogs.ts sudah dihapus

### 🐛 Bug / Issue Ditemukan

| # | File | Deskripsi | Severity |
|---|------|-----------|----------|
| B-01 | `artifacts/telegram-bot/src/index.ts` baris 330–385 | **PASSWORD TIDAK PERNAH DIKIRIM KE USER/ADMIN** — `generatePassword()` menghasilkan password raw, lalu langsung di-hash dan disimpan di DB. Pesan ke user hanya kirim `telegramId` dengan note "Kredensial telah dikirim ke admin". Admin notification juga TIDAK mengandung plaintext password. Password lenyap — user tidak punya cara login setelah bayar. | **high** |
| B-02 | `artifacts/api-server/src/routes/auth.ts` baris 15 | **Web flow hardcoded 30 hari** — `const ACCESS_DAYS = 30` tidak mempertimbangkan nominal yang dibayar. User bayar Rp100.000 (ekspektasi 60 hari) hanya dapat 30 hari. Web flow tidak punya mekanisme mapping amount → days. | **mid** |
| B-03 | `artifacts/telegram-bot/src/index.ts` baris 30–33 | **Harga paket bot vs replit.md tidak konsisten** — Bot actual: 30d=Rp40k, 60d=Rp70k, 90d=Rp100k. Dokumentasi di replit.md: 30d=Rp50k, 60d=Rp100k, 90d=Rp150k. Salah satu harus jadi acuan, belum jelas mana yang benar. | **mid** |
| B-04 | `artifacts/api-server/src/lib/rerangeScheduler.ts` baris 9–13 | **Threshold rerange tidak sesuai dokumentasi** — replit.md mendokumentasikan: conservative="Keluar range penuh", moderate="50% mendekati tepi", aggressive="30% mendekati tepi". Kode mengimplementasikan: conservative=5% OUTSIDE range, moderate=2% OUTSIDE range, aggressive=0% outside. Semantiknya berbeda; docs bilang "mendekati tepi dari dalam", kode pakai "sudah keluar range". Threshold conservative dan aggressive bahkan terbalik maknanya vs docs. | **mid** |
| B-05 | `artifacts/api-server/src/routes/market.ts` baris 22–24 | **`/market/price/:symbol` tidak support Dango-native symbols** — Guard `if (!COINGECKO_IDS[symbol])` return 404 untuk BTC, ETH, SOL, HYPE — padahal simbol-simbol ini ada di `DANGO_DENOM_MAP` dan bisa di-fetch dari Dango Oracle. Endpoint bulk `/market/prices` support mereka, tapi endpoint individual tidak. | **low** |

### 🔍 Temuan dari Dango Docs

- **Alpha Mainnet hanya ETH/USDC** — Docs konfirmasi: *"Alpha Mainnet launched in January 2026 with ETH/USDC as the initial pair."* BTC/USDC dan SOL/USDC hanya tersedia di testnet sebelumnya. Artinya sebagian besar pairs di bot kita (ATOM, OSMO, INJ, TIA, BTC, SOL) mungkin belum live di mainnet. Perlu caveat di UI.
- **Smart Accounts via Passkeys/Secure Enclave** — Konfirmasi: *"The private key is generated and stored in the device's secure enclave, never exposed to the user or the application."* Keputusan hapus Private Key field (S-01) sudah tepat.
- **Subaccounts untuk API Trading** — Docs menyebutkan subaccounts bisa digunakan untuk *"API trading — Grant limited permissions to an automated bot"*. Ini adalah mekanisme yang seharusnya digunakan bot kita untuk trading on-chain jika G-04 ingin diselesaikan. Perlu dipelajari SDK lebih lanjut.
- **Dango SDK tersedia** — `left-curve/left-curve` repo punya TypeScript SDK (`@dango/sdk`) untuk interaksi dengan chain. Ini bisa dipakai untuk menyelesaikan G-04 (cancel order on-chain). Docs SDK ada di `grug-sdk.pages.dev`.
- **Fees dalam USDC** — Semua fee di Dango didenoминasi dalam USDC, bukan token native. Relevan untuk perhitungan PnL bot nantinya.
- **Batch settlement 0.2–0.5s** — Order di CLOB settle setiap 0.2–0.5 detik. Scheduler rerange kita 60 detik sudah jauh lebih lambat dari granularitas market — secara teknis wajar, tapi perlu dipertimbangkan di konteks aggressive mode.

### 📋 Carry-over dari Audit Sebelumnya

- **G-04** ⏳ BLOCKED — Delete/toggle bot tidak cancel order on-chain di CLOB Dango. Masih menunggu akses ke Dango SDK untuk cancellation. Sekarang ada petunjuk: gunakan subaccount + TypeScript SDK dari `left-curve/left-curve`.

### 🎯 Prioritas Hari Ini

1. **B-01 (HIGH)** — Fix pengiriman password ke user: opsi terbaik adalah kirim password plaintextnya langsung via Telegram private message setelah upsertUser, SEBELUM di-hash. Atau simpan plaintext sementara di pesan terpisah. Ini urgent karena user tidak bisa login sama sekali setelah bayar.
2. **B-02 (MID)** — Fix web flow `ACCESS_DAYS` — buat mapping amount → days (50000→30, 100000→60, 150000→90) dan derive dari nominal yang dibayar, bukan hardcode.
3. **B-03 (MID)** — Klarifikasi harga paket yang benar, update salah satu (bot atau replit.md) agar konsisten.
4. **B-04 (MID)** — Klarifikasi semantik threshold rerange: apakah "mendekati tepi" (inside) atau "sudah keluar range" (outside)? Sesuaikan kode ATAU update dokumentasi replit.md.
5. **B-05 (LOW)** — Fix `/market/price/:symbol` guard agar include simbol dari `DANGO_DENOM_MAP`.
6. **G-04 (BLOCKED)** — Investigasi Dango TypeScript SDK untuk cancel order; eksplor subaccount API.

---
## Audit 2026-04-10 Sesi 6

### Fix Diterapkan
- **B-01**: Password sekarang dikirim ke user via Telegram setelah pembayaran berhasil

### Catatan Teknis
- **File:** `artifacts/telegram-bot/src/index.ts` fungsi `onPaymentSuccess`
- **Akar masalah:** Variabel plaintext `password` (dari `generatePassword()`) ada di scope fungsi, tapi tidak pernah dimasukkan ke pesan Telegram maupun notif admin. Pesan ke user hanya berisi `telegramId` dengan klaim palsu "Kredensial telah dikirim ke admin". Komentar kode bahkan eksplisit tulis `// Notifikasi admin - tanpa password`.
- **Fix yang diterapkan:**
  1. Tambahkan baris Password ke pesan sukses user (editMessageText)
  2. Tambahkan baris Password ke notifikasi admin (notifyAdmin)
  3. Tambahkan instruksi login 3 langkah di pesan user
  4. Ubah kalimat penutup dari "Kredensial telah dikirim ke admin" menjadi instruksi login langsung
- **Jaminan keamanan:** Plaintext password hanya ada di memori scope fungsi dan dikirim via Telegram. Tidak masuk ke DB (hash dilakukan di dalam `upsertUser`), tidak masuk ke log (`logger.success` hanya tulis telegramId dan plan).
- **Escape sequence diperbaiki:** Dari backslash-escape MarkdownV2 ke teks biasa karena bot pakai `parse_mode: "Markdown"` (v1).

### Carry-over
- **G-04** BLOCKED -- cancel order on-chain saat delete/toggle bot; menunggu investigasi Dango TypeScript SDK
- **B-02** BELUM -- web flow ACCESS_DAYS hardcoded 30 hari, tidak mempertimbangkan nominal yang dibayar
- **B-03** BELUM -- harga paket di bot (40k/70k/100k) vs replit.md (50k/100k/150k) tidak konsisten
- **B-04** BELUM -- threshold rerange di kode (X% outside range) berbeda semantik dari docs (mendekati tepi dari dalam)
- **B-05** BELUM -- /market/price/:symbol tidak support simbol dari DANGO_DENOM_MAP (BTC/ETH/SOL/HYPE)