import { Router } from "express";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { db, accessTokensTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  calculateAmount,
  createDonation,
  checkPaymentStatus,
  isSaweriaConfigured,
} from "../lib/saweria";

const router = Router();

const ACCESS_DAYS = 30;
const SUCCESS_STATUSES = new Set(["settlement", "success", "capture"]);
const FAILED_STATUSES = new Set(["deny", "cancel", "failure", "expire"]);

// ── Web-flow: initiate Saweria QRIS ──────────────────────────────────────────
router.post("/auth/initiate", async (req, res) => {
  if (!isSaweriaConfigured()) {
    res.status(503).json({
      error: "Saweria belum dikonfigurasi. Set SAWERIA_USERNAME dan SAWERIA_USER_ID.",
    });
    return;
  }

  const { amount = 50000, name = "user", email = "user@hokireceh.app" } = req.body as {
    amount?: number;
    name?: string;
    email?: string;
  };

  const ALLOWED = [50000, 100000, 150000];
  if (!ALLOWED.includes(amount)) {
    res.status(400).json({ error: "Nominal tidak valid. Pilih: 50000, 100000, atau 150000." });
    return;
  }

  try {
    const calc = await calculateAmount(amount);
    const donation = await createDonation(calc.amount_to_pay, name, email);
    res.json({
      donationId: donation.id,
      qrString: donation.qr_string,
      amountToPay: calc.amount_to_pay,
      pgFee: calc.pg_fee,
    });
  } catch (err) {
    req.log.error({ err }, "Saweria initiate failed");
    res.status(502).json({ error: "Gagal membuat transaksi Saweria. Coba lagi." });
  }
});

// ── Web-flow: poll payment status ────────────────────────────────────────────
router.get("/auth/poll/:donationId", async (req, res) => {
  const { donationId } = req.params;
  if (!donationId) {
    res.status(400).json({ error: "donationId diperlukan" });
    return;
  }

  try {
    const payment = await checkPaymentStatus(donationId);

    if (!payment) {
      res.json({ status: "PENDING" });
      return;
    }

    const statusLower = payment.status.toLowerCase();

    if (SUCCESS_STATUSES.has(statusLower)) {
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + ACCESS_DAYS);

      await db.insert(accessTokensTable).values({
        token,
        donationId,
        amount: payment.amount,
        expiresAt,
      }).onConflictDoNothing();

      const [existing] = await db
        .select()
        .from(accessTokensTable)
        .where(eq(accessTokensTable.donationId, donationId));

      res.json({
        status: "SUCCESS",
        token: existing?.token ?? token,
        expiresAt: (existing?.expiresAt ?? expiresAt).toISOString(),
        amount: payment.amount,
      });
      return;
    }

    if (FAILED_STATUSES.has(statusLower)) {
      res.json({ status: "FAILED" });
      return;
    }

    res.json({ status: "PENDING" });
  } catch (err) {
    req.log.error({ err }, "Saweria poll failed");
    res.json({ status: "PENDING" });
  }
});

// ── Web-flow: verify token ───────────────────────────────────────────────────
router.post("/auth/verify", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ valid: false, error: "Token diperlukan" });
    return;
  }

  try {
    const [record] = await db
      .select()
      .from(accessTokensTable)
      .where(eq(accessTokensTable.token, token));

    if (!record) {
      res.json({ valid: false });
      return;
    }

    if (record.expiresAt < new Date()) {
      res.json({ valid: false, reason: "expired" });
      return;
    }

    res.json({
      valid: true,
      expiresAt: record.expiresAt.toISOString(),
      amount: record.amount,
    });
  } catch (err) {
    req.log.error({ err }, "Token verify failed");
    res.status(500).json({ valid: false });
  }
});

// ── Telegram-bot flow: login dengan password ──────────────────────────────────
// POST /api/auth/login  { telegramId, password }
// Mengembalikan Bearer token (UUID) yang disimpan di accessTokensTable.
router.post("/auth/login", async (req, res) => {
  const { telegramId, password } = req.body as {
    telegramId?: string;
    password?: string;
  };

  if (!telegramId || !password) {
    res.status(400).json({ error: "telegramId dan password diperlukan" });
    return;
  }

  // ── Admin shortcut ──────────────────────────────────────────────────────────
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
  if (
    ADMIN_PASSWORD &&
    telegramId.trim().toLowerCase() === "admin" &&
    password === ADMIN_PASSWORD
  ) {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);
    res.json({
      token: ADMIN_PASSWORD,
      expiresAt: farFuture.toISOString(),
      plan: "admin",
      amount: 0,
    });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telegramId, String(telegramId)));

    if (!user) {
      res.status(401).json({ error: "Akun tidak ditemukan" });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Password salah" });
      return;
    }

    if (user.expiresAt < new Date()) {
      res.status(403).json({ error: "Akses sudah kadaluarsa. Perpanjang langganan kamu." });
      return;
    }

    // Buat session token baru dan simpan di accessTokensTable
    const token = randomUUID();
    await db.insert(accessTokensTable).values({
      token,
      donationId: `tg_login_${telegramId}_${Date.now()}`,
      amount: user.amount,
      expiresAt: user.expiresAt,
    });

    res.json({
      token,
      expiresAt: user.expiresAt.toISOString(),
      plan: user.plan,
      amount: user.amount,
    });
  } catch (err) {
    req.log.error({ err }, "Login failed");
    res.status(500).json({ error: "Login gagal, coba lagi." });
  }
});

export default router;
