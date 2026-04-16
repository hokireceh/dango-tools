# Audit Dango — Sesi 1

**Tanggal:** 2026-04-16  
**Auditor:** AI Agent  
**Scope sesi ini:** Backend — `artifacts/api-server/src/`

---

## Status Sesi

### Sudah Fix
_(belum ada)_

### Dipropose, Belum Diapprove
- **DANGO-ENGINE-001** — Rerange mode values terbalik: `moderate` lebih agresif dari `aggressive`
- **DANGO-ENGINE-002** — Auto-rerange scheduler tidak memanggil `cancelAllOrders` on-chain
- **DANGO-API-001** — Admin token = raw `ADMIN_PASSWORD`, bukan UUID terpisah
- **DANGO-API-002** — `isSaweriaConfigured()` selalu `true` karena hardcoded fallback
- **DANGO-API-003** — Cache `getPricesForSymbols` return partial result diam-diam

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
