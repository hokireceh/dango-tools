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
---
## Audit 2026-04-10 Sesi 7

### Fix Diterapkan
- **B-02**: Access days sekarang di-derive dari nominal bayar via mapping AMOUNT_TO_DAYS
- **B-03**: Harga paket disinkronkan — acuan: **bot** (40k/70k/100k). replit.md sudah diupdate.

### Catatan Teknis
**B-02 — `artifacts/api-server/src/routes/auth.ts`:**
- Hapus `const ACCESS_DAYS = 30` yang hardcoded
- Tambah `const AMOUNT_TO_DAYS: Record<number, number> = { 40000: 30, 70000: 60, 100000: 90 }`
- Tambah fungsi `getAccessDays(amount)` dengan fallback floor ke tier terdekat di bawahnya
- Ganti `expiresAt.setDate(getDate() + ACCESS_DAYS)` dengan `getAccessDays(payment.amount)`
- Update default amount di `/auth/initiate`: 50000 -> 40000
- Update array ALLOWED: [50000,100000,150000] -> [40000,70000,100000]
- Update error message nominal agar sesuai nilai baru

**B-03 — `replit.md`:**
- Update tabel Paket Akses: 50k/100k/150k -> 40k/70k/100k

### Carry-over
- **G-04** BLOCKED -- cancel order on-chain saat delete/toggle bot; menunggu investigasi Dango TypeScript SDK
- **B-04** BELUM -- threshold rerange di kode (X% outside range) berbeda semantik dari docs (mendekati tepi dari dalam)
- **B-05** BELUM -- /market/price/:symbol tidak support simbol dari DANGO_DENOM_MAP (BTC/ETH/SOL/HYPE)
---
## Audit 2026-04-10 Sesi 8

### Fix Diterapkan
- **B-04**: Threshold rerange diubah dari logika "outside range" ke logika "inside range, mendekati tepi" sesuai replit.md
- **B-05**: /market/price/:symbol sekarang support simbol dari DANGO_DENOM_MAP (BTC, ETH, SOL, HYPE)

### Catatan Teknis
**B-04 — `artifacts/api-server/src/lib/rerangeScheduler.ts`:**
- Rename `RERANGE_THRESHOLDS` -> `RERANGE_EDGE_ZONES` untuk kejelasan semantik
- conservative: 0.05 (dalam 5% lebar range dari tepi — paling jarang trigger)
- moderate:     0.50 (dalam 50% lebar range dari tepi — trigger saat masuk paruh luar)
- aggressive:   0.30 (dalam 30% lebar range dari tepi)
- Logika `shouldRerange` diubah: dari memperluas range ke luar (effectiveLower/Upper), ke menghitung zona tepi dari dalam (upperTrigger/lowerTrigger)
  - Sebelum: trigger jika price < lower*(1-threshold) ATAU price > upper*(1+threshold)
  - Sesudah: upperTrigger = upper - edgeZone*rangeWidth; trigger jika price >= upperTrigger ATAU price <= lowerTrigger
- Update log message: "di luar range" -> "mendekati tepi range"

**B-05 — `artifacts/api-server/src/routes/market.ts`:**
- Tambah `DANGO_DENOM_MAP` ke import dari priceService
- Guard diubah: `!COINGECKO_IDS[symbol]` -> `!COINGECKO_IDS[symbol] && !DANGO_DENOM_MAP[symbol]`
- BTC, ETH, SOL, HYPE sekarang lolos guard dan di-fetch dari Dango Oracle via `getPricesForSymbols`

### Carry-over
- **G-04** BLOCKED -- cancel order on-chain saat delete/toggle bot; menunggu investigasi Dango TypeScript SDK
---
## Audit 2026-04-10 Sesi 9

### Investigasi G-04 — Dango SDK untuk Cancel Order On-Chain

#### SDK Status: TIDAK TERSEDIA di npm

| Package | npm Status | Keterangan |
|---------|-----------|------------|
| `@dango/sdk` | 404 NOT FOUND | Tidak pernah dipublish ke npm |
| `@grug/sdk` | 404 NOT FOUND | Tidak pernah dipublish ke npm |
| `@left-curve/crypto` | v0.1.0 (2024-11-27) | Hanya crypto utils, bukan CLOB SDK |
| `@left-curve/encoding` | v0.1.0 (2024-11-27) | Hanya encoding helpers |
| `@left-curve/utils` | v0.1.0 (2024-11-27) | Hanya general utilities |

SDK TypeScript yang proper ada di `sdk/` directory monorepo `left-curve/left-curve` di GitHub, tapi belum dipublish ke npm. Harus di-build manual dari source.

#### Temuan Kritis dari Dango Docs

**1. GraphQL adalah satu-satunya interface on-chain:**
> "All interactions with the chain go through a single GraphQL endpoint that supports queries, mutations, and WebSocket subscriptions."
- Endpoint yang sudah kita pakai (`api-mainnet.dango.zone/graphql`) sudah bisa untuk SEMUA operasi termasuk write/mutation
- Ada `broadcastTxSync` mutation untuk submit transaksi bertanda tangan

**2. Cancel order ada dua mode:**
- **Single cancel** — cancel satu order by order ID, release reserved_margin, decrement open_order_count
- **Bulk cancel** — cancel semua resting orders user dalam satu transaksi (lebih efisien)

**3. Setiap write operation butuh signed transaction:**
Lifecycle transaksi:
1. Simulate (via GraphQL query `simulate`) — estimasi gas, skip signature verification
2. Build SignDoc — hash dari transaksi
3. Sign — dengan user's key (passkey/Secp256r1 atau Secp256k1)
4. Broadcast (via GraphQL mutation `broadcastTxSync`)

**4. Session Keys — mekanisme untuk API trading:**
> "Session keys allow delegated signing without requiring the master key for every transaction."
- User buat session key di Dango, simpan session key di server kita (terenkripsi)
- Server tanda tangani cancel transaction dengan session key tersebut
- Session key punya expiry time, scope terbatas, tidak bisa withdraw dana

**5. AGENTS.md tidak relevan untuk G-04:**
AGENTS.md adalah contributor guide internal untuk pengembang repo Rust/left-curve. Tidak ada info tentang TypeScript SDK usage untuk external apps.

#### Blockers yang Tersisa

| Blocker | Severity | Penjelasan |
|---------|----------|------------|
| Tidak ada npm SDK | HIGH | Harus implement transaction signing dari scratch |
| Passkey signing butuh browser/WebAuthn | CRITICAL | Server-side signing hanya bisa pakai Session Key (Secp256k1) |
| Session key flow belum ada | HIGH | User belum ada UI untuk grant session key ke bot |
| Cancel order message format belum lengkap | MEDIUM | Perlu investigasi GraphQL schema untuk mutation cancel_order |
| Order ID tracking belum ada di DB | MEDIUM | Saat ini tidak menyimpan on-chain order ID per grid level |

#### Estimasi Effort

G-04 BISA diimplementasikan, tapi butuh **minimal 4-5 sesi**:

1. **Sesi A** — Fetch GraphQL schema Dango, temukan mutation cancel_order, verify payload format
2. **Sesi B** — Implement session key onboarding (UI + bot command agar user bisa grant session key)
3. **Sesi C** — Implement transaction builder: serialize WasmMsg cancel_order + SignDoc + Secp256k1 signing
4. **Sesi D** — Tambah kolom `onChainOrderIds` di tabel gridBots, track order ID saat bot aktif
5. **Sesi E** — Integrate cancel on DELETE/toggle: call GraphQL broadcastTxSync dengan signed cancel tx

#### Kesimpulan

G-04 berubah status dari **BLOCKED** (tidak ada SDK) menjadi **SIAP DIRENCANAKAN** (ada jalur implementasi via GraphQL + Session Key, tapi multi-sesi). Prerequisite paling kritis: mekanisme session key — tanpa ini tidak mungkin sign transaksi on-chain dari server.

### Carry-over
- **G-04** — SIAP DIRENCANAKAN (5 sub-sesi A-E, prerequisite = Session Key onboarding)

---
## Audit 2026-04-10 Sesi A (G-04 Sub-sesi A) — GraphQL Schema & Cancel Order Payload

### Tujuan
Konfirmasi format payload cancel_order via Dango GraphQL API.

---

### 1. GraphQL Mutation Schema

Hasil introspeksi `api-mainnet.dango.zone/graphql`:

```
MUTATION: broadcastTxSync
  ARG: tx: Tx  // "Transaction as JSON"
  RETURN: JSON
```

**Temuan kritis**: Hanya ada **SATU mutation** di seluruh schema — `broadcastTxSync`.
Tidak ada mutation khusus `cancelOrder`, `placeOrder`, dll. Semua operasi on-chain
(deposit, withdraw, submit order, cancel order) menggunakan satu mutation ini.
`Tx` adalah JSON schema-less — tidak ada typed input untuk args.

---

### 2. Format Pesan Cancel Order (§6.5)

#### Single cancel (by order ID)
```json
{
  "execute": {
    "contract": "PERPS_CONTRACT",
    "msg": {
      "trade": {
        "cancel_order": { "one": "42" }
      }
    },
    "funds": {}
  }
}
```
- `"42"` adalah on-chain order ID (string)
- Efek: release reserved_margin, decrement open_order_count

#### Bulk cancel (semua order sekaligus)
```json
{
  "execute": {
    "contract": "PERPS_CONTRACT",
    "msg": {
      "trade": {
        "cancel_order": "all"
      }
    },
    "funds": {}
  }
}
```
- Cancel semua resting orders dalam satu transaksi
- Lebih efisien untuk DELETE bot (semua order user di pair tersebut)

---

### 3. Full Tx Payload untuk broadcastTxSync

```json
mutation BroadcastTx($tx: Tx!) {
  broadcastTxSync(tx: $tx)
}
```

Variables:
```json
{
  "tx": {
    "sender": "<user_wallet_address>",
    "gas_limit": 1500000,
    "msgs": [ { "<cancel_order msg>" } ],
    "data": {
      "user_index": 0,
      "chain_id": "dango-1",
      "nonce": 42,
      "expiry": null
    },
    "credential": {
      "session": {
        "session_info": {
          "session_key": "02abc...33bytes",
          "expire_at": "1700000000000000000"
        },
        "session_signature": "0102...40hex",
        "authorization": {
          "key_hash": "a1b2c3d4...64hex",
          "signature": { "secp256k1": "0102...40hex" }
        }
      }
    }
  }
}
```

---

### 4. Signing Flow (§2.6–2.7)

```
1. Compose cancel_order message
2. Query chain_id, user_index, next nonce dari account (unordered nonce, window 20)
3. Simulate: kirim UnsignedTx (tanpa credential) → dapat gas_used
4. Set gas_limit = gas_used + 770_000 (overhead signature verification)
5. Build SignDoc = { data, gas_limit, messages, sender }
6. Serialize SignDoc → canonical JSON (keys sorted alphabetically)
7. Hash dengan SHA-256
8. Sign hash dengan Session Key (Secp256k1) → 64-byte hex (session_signature)
9. Build full Tx dengan session credential
10. POST broadcastTxSync
```

---

### 5. Contract Addresses (Mainnet §11)

| Contract | Address |
|----------|---------|
| PERPS_CONTRACT | `0x90bc84df68d1aa59a857e04ed529e9a26edbea4f` |
| ACCOUNT_FACTORY_CONTRACT | `0x18d28bafcdf9d4574f920ea004dea2d13ec16f6b` |
| ORACLE_CONTRACT | `0xcedc5f73cbb963a48471b849c3650e6e34cd3b6d` |

- Chain ID Mainnet: `dango-1`
- GraphQL: `https://api-mainnet.dango.zone/graphql`

---

### 6. Yang Masih Perlu Dicari (Sesi B)

| Item | Keterangan |
|------|-----------|
| Nonce query | GraphQL query untuk get account's seen_nonces |
| Session key registration | Flow user buat session key on-chain (§3 account mgmt) |
| key_hash format | Apakah SHA-256(pubkey) atau beda? |
| Order ID tracking | Dango assign order_id saat submit_order — perlu disimpan di DB kita |
| Session key storage | Harus encrypted di DB, user input sekali via bot/dashboard |

---

### 7. Kesimpulan Sesi A

Format payload **sudah confirmed dan lengkap**. Implementasi G-04 secara teknis:
- **Feasible** — tidak butuh SDK, semua via GraphQL JSON
- **Bottleneck** = session key onboarding dan transaction signing dari scratch
- Cancel single order = butuh on-chain order ID per grid level (belum ada di DB)
- Cancel all = lebih mudah diimplementasikan dulu (tidak butuh order ID tracking)

### Rekomendasi urutan implementasi
1. **Sesi B** — Query nonce, simulate, dan session key registration flow
2. **Sesi C** — Transaction builder + Secp256k1 signing (pure Node.js, pakai `@noble/secp256k1`)
3. **Sesi D** — Schema DB: tambah kolom session key (terenkripsi) dan onChainOrderId
4. **Sesi E** — Integrasi ke DELETE/toggle: kirim `cancel_order: "all"` dulu, lalu single cancel setelah tracking order ID tersedia

### Carry-over
- **G-04** — SIAP FIX bertahap. Sub-sesi B: query nonce + session key registration flow.

---
## Audit 2026-04-11 Sesi B (G-04 Sub-sesi B) — Nonce Query, Session Key Registration Flow, key_hash

### Tujuan
Memetakan: cara query nonce, cara user authorize session key, format key_hash.

---

### 1. Temuan — Session Key TIDAK Butuh Registrasi On-Chain

Ini berbeda dari asumsi awal. Session credential Dango bersifat self-contained:

```json
{
  "session": {
    "session_info": {
      "session_key": "02abc...33bytes",
      "expire_at": "1700000000000000000"
    },
    "session_signature": "0102...40hex",
    "authorization": {
      "key_hash": "<SHA256(master_pubkey)>",
      "signature": { "secp256k1": "0102...40hex" }
    }
  }
}
```

Field `authorization` adalah tanda tangan master key (passkey) atas `session_info`.
**Artinya: tidak perlu transaksi on-chain terpisah untuk mendaftarkan session key.**
Authorization disertakan langsung di setiap transaksi yang menggunakan session key.

---

### 2. Flow Onboarding Session Key (1x per user)

```
1. SERVER: Generate Secp256k1 keypair
   - privkey: 32 bytes random
   - pubkey:  compressed 33 bytes (02... atau 03...)

2. SERVER → FRONTEND: kirim { session_key: hex(pubkey), expire_at: "<nanoseconds>" }

3. FRONTEND:
   a. Serialize session_info ke canonical JSON (keys alphabetical)
   b. SHA-256(canonical JSON bytes)
   c. Minta user sign hash dengan passkey (WebAuthn / Touch ID)
   d. Build authorization = { key_hash: SHA256(master_pubkey), signature: { passkey: {...} } }

4. FRONTEND → SERVER: kirim authorization

5. SERVER: simpan di DB (encrypted):
   - session_privkey (32 bytes hex)
   - session_pubkey  (33 bytes hex)
   - session_expire_at (nanosecond timestamp)
   - authorization (JSON, ditandatangani oleh user's master key)
```

Setelah step 5, server bisa sign transaksi cancel tanpa interaksi user.

---

### 3. key_hash Computation

Dari docs §3.7 (Query users by key):

| Key type | Input ke SHA-256 |
|----------|-----------------|
| SECP256K1 | Compressed public key bytes (33 bytes) |
| SECP256R1 | WebAuthn credential ID bytes |
| ETHEREUM | UTF-8 bytes dari lowercase hex address (dengan 0x prefix) |

Hasil hash di-hex-encode dalam **UPPERCASE**.

Untuk session key (Secp256k1):
```
key_hash = SHA256(Buffer.from(compressed_pubkey_hex, 'hex')).toString('hex').toUpperCase()
```

Untuk master key (Passkey/Secp256r1): key_hash dari WebAuthn credential ID bytes.

---

### 4. Nonce Query

**Account factory QueryMsg variants** (dikonfirmasi via GraphQL error):
```
code_hash | next_user_index | next_account_index | user | users | account | accounts | forgot_username
```

Tidak ada variant `nonces` di account factory. Nonces di-track per user account contract.

**Format query account** (dikonfirmasi format benar):
```graphql
query {
  queryApp(request: {
    wasm_smart: {
      contract: "0x<USER_WALLET_ADDRESS>",
      msg: { "nonces": {} }
    }
  })
}
```

Format ini perlu diuji dengan alamat user wallet yang valid (bukan account factory).
Kemungkinan response: array of u32 seen nonces. Next nonce = max(seen_nonces) + 1.

**Alternatif pragmatis (tidak butuh on-chain query):**
- Simpan `lastNonce` per user di DB (integer), mulai dari 1
- Increment setiap kali kirim cancel tx
- Kalau tx gagal karena nonce conflict → retry dengan lastNonce + 1
- Cocok untuk kasus kita (cancel frekuensi rendah, bukan HFT)

---

### 5. queryStatus — Konfirmasi Chain ID Live

```graphql
query {
  queryStatus {
    block { blockHeight timestamp hash }
    chainId
  }
}
```

Response live (dikonfirmasi):
```json
{
  "queryStatus": {
    "block": {
      "blockHeight": 17349828,
      "timestamp": "2026-04-11T10:53:05.287845015",
      "hash": "BCBADAD3ADE89EDB..."
    },
    "chainId": "dango-1"
  }
}
```

Chain ID confirmed: `dango-1` (konsisten dengan §11 Constants).

---

### 6. Ringkasan Kebutuhan Implementasi (Sesi C)

| Komponen | Library | Keterangan |
|----------|---------|-----------|
| Secp256k1 sign | `@noble/secp256k1` | Pure Node.js, zero-dep, battle-tested |
| SHA-256 | Node.js built-in `crypto.createHash('sha256')` | Tidak perlu library |
| Canonical JSON | Sort keys alphabetically | Bisa DIY atau pakai `json-stable-stringify` |
| GraphQL broadcast | `node-fetch` / `fetch` | Sudah ada di project |

Estimasi: Sesi C bisa build transaction builder dalam satu file `dangoTxBuilder.ts` (~100 baris).

---

### 7. Yang Perlu Diputuskan Sebelum Sesi C

1. **Session key expiry**: berapa lama? Rekomendasi: 30 hari (dikonfirmasi user saat renewal)
2. **Nonce approach**: DB counter atau on-chain query? Rekomendasi: DB counter dulu (pragmatis)
3. **Encrypt session key di DB**: pakai `AES-256-GCM` dengan key dari env var, atau simpan plain (hanya bisa cancel, tidak bisa transfer dana)?
4. **User flow**: bot command `/session_key` untuk request authorization dari user, atau form di dashboard?

### Carry-over
- **G-04 Sesi C** — SIAP: Build `dangoTxBuilder.ts` (Secp256k1 sign + canonical JSON + broadcastTxSync)
