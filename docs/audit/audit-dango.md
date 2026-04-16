# Audit Dango — Sesi 1

**Tanggal:** 2026-04-16  
**Auditor:** AI Agent  
**Scope sesi ini:** Backend — `artifacts/api-server/src/`

---

## Status Sesi

### Sudah Fix
- **DANGO-ENGINE-001** ✅ — Swap `moderate` (0.30) ↔ `aggressive` (0.50) di `RERANGE_EDGE_ZONES`
- **DANGO-API-003** ✅ — `cached.length > 0` → `cached.length === symbols.length` di `getPricesForSymbols`
- **DANGO-API-004** ✅ — Admin token kini UUID baru via `randomUUID()`, bukan raw `ADMIN_PASSWORD`. Special case di `requireAuth` dihapus, auth admin kini lewat DB lookup biasa.

### WONTFIX
- **DANGO-API-002** — `isSaweriaConfigured()` selalu `true` — hardcoded default intentional by design. Ditambahkan komentar `// intentional default` pada kedua variabel di `saweria.ts`.

### Dipropose, Belum Diapprove
- **DANGO-ENGINE-002** — Auto-rerange scheduler tidak memanggil `cancelAllOrders` on-chain
- **DANGO-API-005** — (TBD — akan dipropose sesi ini)

### Pending (belum dipropose)
- **DANGO-DB-001** — `accessTokensTable` tidak punya kolom `plan`/`isAdmin` untuk membedakan admin vs user — Low — future-proofing jika dibutuhkan admin-only routes

---

## Issues

### DANGO-ENGINE-001
**File:** `artifacts/api-server/src/lib/rerangeScheduler.ts`  
**Severity:** High  
**Status:** Dipropose

### DANGO-ENGINE-002
**File:** `artifacts/api-server/src/lib/rerangeScheduler.ts`  
**Severity:** Critical  
**Status:** Dipropose

### DANGO-API-001
**File:** `artifacts/api-server/src/routes/auth.ts`  
**Severity:** High  
**Status:** Dipropose

### DANGO-API-002
**File:** `artifacts/api-server/src/lib/saweria.ts`  
**Severity:** High  
**Status:** Dipropose

### DANGO-API-003
**File:** `artifacts/api-server/src/lib/priceService.ts`  
**Severity:** Medium  
**Status:** Dipropose

---

## Carry-over — Sesi 1 → Sesi 2

### Sudah Fix
_(belum ada)_

### Pending (belum dipropose)
_(belum ada — semua sudah dipropose di sesi 1)_

### Dipropose, Belum Diapprove
- DANGO-ENGINE-001 — `rerangeScheduler.ts` — rerange mode values terbalik — High
- DANGO-ENGINE-002 — `rerangeScheduler.ts` — auto-rerange tidak cancel on-chain — Critical
- DANGO-API-001 — `routes/auth.ts` — admin token = raw password — High
- DANGO-API-002 — `lib/saweria.ts` — `isSaweriaConfigured()` selalu true — High
- DANGO-API-003 — `lib/priceService.ts` — partial cache hit silently missing symbols — Medium
