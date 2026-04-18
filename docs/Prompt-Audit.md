
# Audit Prompt Template — Dango

> **Cara pakai:** Copy seluruh isi prompt ini → paste ke Replit Agent.
```
---

## Sumber Resmi

- Docs: https://docs.dango.exchange/
- Dango Book: `docs/dango-docs/1-dango-book/all-chapters.md`
- Gitbook: `docs/dango-docs/2-gitbook/`
- GitHub: `docs/dango-docs/3-github/`

---

## Scope Audit

### Backend — `artifacts/api-server/src/`
- `app.ts`, `index.ts`
- `middlewares/`
- `routes/` — auth.ts, botLogs.ts, gridBots.ts, health.ts, market.ts, sessionKey.ts
- `lib/` — dangoTxBuilder, priceService, rerangeScheduler, saweria, logger

### Database — `lib/db/src/schema/`
- accessTokens, botLogs, dangoSession, gridBots, users

### Frontend — `artifacts/dex-tools/src/`
- `pages/` — dashboard, grid-bot-detail, grid-bot-form, grid-bots, login, settings
- `components/`, `hooks/`, `context/`

### Shared Libs
- `lib/api-client-react/src/`
- `lib/api-zod/src/`
- `lib/dango-keys/src/`

---

## Aturan Kerja

- **Baca file asli terlebih dahulu** sebelum membuat kesimpulan apapun. Jangan asumsikan behavior kode tanpa membaca.
- **Fetch sumber resmi Dango** yang relevan sebelum menilai implementasi.
- **Setiap sesi:** lapor maksimal **5 issue teratas by priority**. Catat sisa temuan untuk sesi berikutnya.
- **Satu issue = satu propose = satu approval.** Jangan bundling.
- Jika menemukan issue tambahan saat membaca file, **catat — jangan fix tanpa lapor dulu.**
- Di akhir sesi, output **carry-over list** untuk sesi berikutnya.

---

## Severity

| Level | Kriteria |
|-------|----------|
| **Critical** | Bot bisa loss / crash / data korup di mainnet |
| **High** | Data salah, logic mismatch vs dokumentasi resmi |
| **Medium** | Inefficiency, edge case tidak di-handle |
| **Low** | Dead code, code smell, naming inconsistency |

---

## Alur Per Issue

### Step 1 — Propose


- **ID:** DANGO-[KATEGORI]-[NNN]   (contoh: DANGO-API-001, DANGO-ENGINE-003)
- **File:** path lengkap
- **Severity:** Critical / High / Medium / Low
- **Masalah:** apa yang salah dan mengapa
- **Sebelum:**
  [potongan kode bermasalah]
- **Sesudah:**
  [potongan kode yang diusulkan]
- **Risiko fix:** ada side effect?


### Step 2 — Tunggu Approval

> **Jangan sentuh kode apapun sebelum ada konfirmasi eksplisit dari user.**

### Step 3 — Eksekusi

Setelah approval: apply fix, lalu konfirmasi fix applied.

---

## Output Log

- Reasoning dalam **Bahasa Indonesia**
- Code dan field names tetap **English**
- Simpan hasil audit ke `docs/audit/audit-dango.md`

---

## Carry-over Format


## Carry-over — Sesi [N] → Sesi [N+1]

### Sudah Fix
- DANGO-XXX-NNN — [ringkasan singkat]

### Pending (belum dipropose)
- DANGO-XXX-NNN — [file] — [ringkasan singkat] — [severity]

### Dipropose, Belum Diapprove
- DANGO-XXX-NNN — [ringkasan singkat]


---

## Mulai

1. Baca `docs/audit/Audit.md` — cek carry-over dari sesi sebelumnya.
2. Jika ada carry-over pending → lanjut dari sana.
3. Jika tidak ada → mulai dari scope **Backend** (`artifacts/api-server/src/`), lalu Database, lalu Frontend.
4. Fetch dokumentasi resmi Dango sebelum menilai implementasi.
5. Propose issue pertama (Critical/High priority) setelah **konfirmasi kode bermasalah ditemukan** dengan bukti baris kode.
```