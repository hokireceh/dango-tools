import "dotenv/config";

// Force IPv4 (avoid IPv6 timeout di Indonesia)
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

import { execFile } from "child_process";
import { Telegraf, Markup, session } from "telegraf";
import type { Context, NarrowedContext } from "telegraf";
import type { Update } from "telegraf/types";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db, usersTable, accessTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ===================== CONFIG =====================
const BOT_TOKEN        = process.env.BOT_TOKEN ?? "";
const ADMIN_CHAT_ID    = process.env.ADMIN_CHAT_ID ?? "";
const SAWERIA_USERNAME = process.env.SAWERIA_USERNAME ?? "zahwafe";
const SAWERIA_USER_ID = process.env.SAWERIA_USER_ID ?? "d8e876df-405c-4e08-9708-9808b9037ea5";
const CHECK_INTERVAL_MS = 7_000;
const MAX_WAIT_MINUTES  = 15;
const SAWERIA_API       = "https://backend.saweria.co";

// ===================== PLANS =====================
const PLANS = [
  { id: "30d",  label: "⚡ 30 Hari",  days: 30,  amount: 40_000 },
  { id: "60d",  label: "🔥 60 Hari",  days: 60,  amount: 70_000 },
  { id: "90d",  label: "💎 90 Hari",  days: 90,  amount: 100_000 },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

// ===================== SESSION =====================
interface BotSession {
  step?: string;
  planId?: PlanId;
  amount?: number;
  amountToPay?: number;
  pgFee?: number;
  name?: string;
}

type BotContext = Context & { session: BotSession };

// ===================== STARTUP CHECK =====================
if (!BOT_TOKEN || BOT_TOKEN.length < 40) {
  console.error("❌ BOT_TOKEN tidak valid atau tidak diset. Tambahkan ke environment variables.");
  process.exit(1);
}
if (!SAWERIA_USERNAME || !SAWERIA_USER_ID) {
  console.warn("⚠️  SAWERIA_USERNAME / SAWERIA_USER_ID tidak diset.");
}

// ===================== LOGGER =====================
const logger = {
  _ts() {
    return new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  },
  info  (...m: unknown[]) { console.log(`[${this._ts()}] ℹ️ `, ...m); },
  success(...m: unknown[]) { console.log(`[${this._ts()}] ✅`, ...m); },
  warn  (...m: unknown[]) { console.warn(`[${this._ts()}] ⚠️ `, ...m); },
  error (...m: unknown[]) { console.error(`[${this._ts()}] ❌`, ...m); },
};

// ===================== RATE LIMITER =====================
class RateLimiter {
  private limits = new Map<string, number[]>();
  constructor() {
    setInterval(() => this._cleanup(), 5 * 60 * 1_000);
  }
  isLimited(userId: number, max = 15) {
    const now = Date.now();
    const key  = String(userId);
    const ts   = (this.limits.get(key) ?? []).filter(t => now - t < 60_000);
    if (ts.length >= max) return true;
    ts.push(now);
    this.limits.set(key, ts);
    return false;
  }
  private _cleanup() {
    const now = Date.now();
    for (const [k, ts] of this.limits) {
      const fresh = ts.filter(t => now - t < 60_000);
      if (fresh.length === 0) this.limits.delete(k);
      else this.limits.set(k, fresh);
    }
  }
}
const rateLimiter = new RateLimiter();

// ===================== CURL — BYPASS CLOUDFLARE =====================
const CURL_HEADERS = [
  "-H", "Accept: */*",
  "-H", "Accept-Encoding: gzip, deflate, br, zstd",
  "-H", "Accept-Language: id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "-H", "DNT: 1",
  "-H", "Origin: https://saweria.co",
  "-H", "Priority: u=1, i",
  "-H", "Referer: https://saweria.co/",
  "-H", "Sec-Fetch-Dest: empty",
  "-H", "Sec-Fetch-Mode: cors",
  "-H", "Sec-Fetch-Site: same-site",
  "-H", 'sec-ch-ua: "Not:A-Brand";v="99", "Google Chrome";v="145", "Chromium";v="145"',
  "-H", "sec-ch-ua-mobile: ?0",
  "-H", 'sec-ch-ua-platform: "Windows"',
  "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
];

function curlPost(url: string, body: object): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const args = [
      "-s", "--compressed", "-m", "30",
      "-X", "POST", url,
      "-H", "Content-Type: application/json",
      ...CURL_HEADERS,
      "-d", JSON.stringify(body),
    ];
    execFile("curl", args, { maxBuffer: 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(new Error(`curl error: ${err.message}`));
      try { resolve(JSON.parse(stdout) as Record<string, unknown>); }
      catch { reject(new Error(`Non-JSON response dari Saweria: ${stdout.slice(0, 200)}`)); }
    });
  });
}

function curlGet(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const args = ["-s", "--compressed", "-m", "30", url, ...CURL_HEADERS];
    execFile("curl", args, { maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(new Error(`curl error: ${err.message}`));
      try { resolve(JSON.parse(stdout) as Record<string, unknown>); }
      catch { reject(new Error(`Non-JSON response: ${stdout.slice(0, 200)}`)); }
    });
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === retries - 1) throw err;
      const wait = delayMs * Math.pow(2, i);
      logger.warn(`Retry ${i + 1}/${retries} setelah ${wait}ms`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw new Error("withRetry exhausted");
}

// ===================== SAWERIA API =====================
async function calculateAmount(amount: number) {
  return withRetry(async () => {
    const payload = {
      agree: true, notUnderage: true,
      message: "Akses Dango DEX Tools", amount,
      payment_type: "qris", vote: "", giphy: null, yt: "", ytStart: 0,
      mediaType: null, image_guess: null, image_guess_answer: "",
      amountToPay: "", currency: "IDR", pgFee: "", platformFee: "",
      customer_info: { first_name: "user", email: "user@hokireceh.app", phone: "" },
    };
    const res = await curlPost(
      `${SAWERIA_API}/donations/${SAWERIA_USERNAME}/calculate_pg_amount`,
      payload,
    );
    const data = res?.data as { amount_to_pay: number; pg_fee: number } | undefined;
    if (!data?.amount_to_pay) throw new Error("calculateAmount: respons tidak valid");
    return data;
  });
}

async function createDonation(amount: number, name: string) {
  return withRetry(async () => {
    const payload = {
      agree: true, notUnderage: true,
      message: "Akses Dango DEX Tools — Hokireceh",
      amount,
      payment_type: "qris", vote: "", currency: "IDR",
      customer_info: { first_name: name, email: "user@hokireceh.app", phone: "" },
    };
    const res = await curlPost(`${SAWERIA_API}/donations/snap/${SAWERIA_USER_ID}`, payload);
    const data = res?.data as { id: string; qr_string: string; amount: number } | undefined;
    if (!data?.qr_string) {
      throw new Error((res?.message as string) ?? "createDonation: respons tidak valid");
    }
    return data;
  });
}

async function checkPaymentStatus(donationId: string) {
  try {
    const res = await curlGet(`${SAWERIA_API}/donations/qris/snap/${donationId}`);
    const d = res?.data as { id: string; transaction_status: string; amount_raw: number } | undefined;
    if (d) return { id: d.id, status: d.transaction_status, amount: d.amount_raw };
  } catch (e) {
    logger.warn("checkPaymentStatus error:", (e as Error).message);
  }
  return null;
}

// ===================== QR IMAGE =====================
async function generateQRImage(qrString: string, donationId: string): Promise<string> {
  const filePath = path.join("/tmp", `qr_${donationId}.png`);
  await QRCode.toFile(filePath, qrString, { width: 500, margin: 2 });
  return filePath;
}

function deleteQRFile(donationId: string) {
  const p = path.join("/tmp", `qr_${donationId}.png`);
  try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* ignore */ }
}

// ===================== DB — upsertUser =====================
function generatePassword(): string {
  return randomBytes(6).toString("hex"); // 12 char hex
}

async function upsertUser(opts: {
  telegramId: string;
  telegramUsername: string | undefined;
  password: string;
  plan: string;
  amount: number;
  days: number;
}) {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + opts.days * 24 * 60 * 60 * 1000);

  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.telegramId, opts.telegramId));

  if (existing.length > 0) {
    // Perpanjang akses dari sekarang (bukan dari tanggal kadaluarsa lama)
    await db.update(usersTable)
      .set({
        telegramUsername: opts.telegramUsername ?? existing[0].telegramUsername,
        passwordHash,
        plan: opts.plan,
        amount: opts.amount,
        expiresAt,
        updatedAt: now,
      })
      .where(eq(usersTable.telegramId, opts.telegramId));
  } else {
    await db.insert(usersTable).values({
      telegramId: opts.telegramId,
      telegramUsername: opts.telegramUsername,
      passwordHash,
      plan: opts.plan,
      amount: opts.amount,
      expiresAt,
    });
  }

  return { expiresAt };
}

// ===================== HELPERS =====================
function formatRupiah(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(amount);
}

function formatCountdown(secondsLeft: number) {
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ===================== ADMIN NOTIF =====================
async function notifyAdmin(bot: Telegraf<BotContext>, text: string) {
  if (!ADMIN_CHAT_ID) return;
  try {
    await bot.telegram.sendMessage(ADMIN_CHAT_ID, text, { parse_mode: "Markdown" });
  } catch (e) {
    logger.warn("Gagal kirim notif admin:", (e as Error).message);
  }
}

// ===================== BOT =====================
const bot = new Telegraf<BotContext>(BOT_TOKEN, {
  telegram: { apiRoot: "https://api.telegram.org" },
});
bot.use(session());

// ===================== POLLING STATE =====================
const activeIntervals: Record<string, NodeJS.Timeout> = {};
const processingUsers = new Set<number>();
const BOT_START_TIME = Date.now();

function stopPolling(donationId: string) {
  if (activeIntervals[donationId]) {
    clearInterval(activeIntervals[donationId]);
    delete activeIntervals[donationId];
  }
  deleteQRFile(donationId);
}

function stopAllPolling() {
  for (const id of Object.keys(activeIntervals)) stopPolling(id);
}

// ===================== SUCCESS HANDLER =====================
async function onPaymentSuccess(
  ctx: BotContext,
  chatId: number,
  msgId: number,
  donationId: string,
  amountRaw: number,
  planId: PlanId,
) {
  stopPolling(donationId);
  const plan = PLANS.find(p => p.id === planId) ?? PLANS[0];
  const telegramId = String(ctx.from?.id ?? chatId);
  const telegramUsername = ctx.from?.username;
  const name = ctx.from?.first_name ?? "Pengguna";

  // Generate password & simpan user
  const password = generatePassword();
  let expiresAt: Date;
  try {
    ({ expiresAt } = await upsertUser({
      telegramId,
      telegramUsername,
      password,
      plan: plan.id,
      amount: amountRaw,
      days: plan.days,
    }));
  } catch (err) {
    logger.error("upsertUser gagal:", (err as Error).message);
    await notifyAdmin(bot,
      `🚨 *upsertUser GAGAL*\n👤 TG: ${telegramId}\n❌ ${(err as Error).message}`
    );
    return;
  }

  // Kirim kredensial ke pengguna — plaintext password dikirim SEKALI via Telegram, tidak disimpan di DB/log
  try {
    await ctx.telegram.editMessageText(
      chatId, msgId, undefined,
      `✅ *Pembayaran Berhasil!*\n\n` +
      `🎉 Selamat *${name}*! Akses kamu sudah aktif.\n\n` +
      `📋 *Detail Akun:*\n` +
      `• ID Login: \`${telegramId}\`\n` +
      `• Password: \`${password}\`\n` +
      `• Plan: *${plan.label}*\n` +
      `• Berlaku hingga: *${expiresAt.toLocaleDateString("id-ID")}*\n\n` +
      `🔐 *Cara Login ke Dashboard:*\n` +
      `1. Buka dashboard Dango DEX Tools\n` +
      `2. Masukkan ID Login dan Password di atas\n` +
      `3. Simpan password ini — tidak akan dikirim ulang!`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Perpanjang Lagi", "menu_plan")],
          [Markup.button.callback("🏠 Menu Utama", "back_main_new")],
        ]),
      }
    );
  } catch { /* pesan mungkin sudah dihapus */ }

  // Notifikasi admin — dengan password agar bisa bantu user jika ada masalah
  await notifyAdmin(bot,
    `💳 *PEMBAYARAN BERHASIL*\n\n` +
    `👤 User: *${name}* (@${telegramUsername ?? "-"})\n` +
    `🆔 TelegramID: \`${telegramId}\`\n` +
    `🔑 Password: \`${password}\`\n` +
    `💰 Jumlah: ${formatRupiah(amountRaw)}\n` +
    `📦 Plan: *${plan.label}*\n` +
    `📅 Expired: ${expiresAt.toLocaleDateString("id-ID")}\n` +
    `🆔 DonationID: \`${donationId}\``
  );

  logger.success(`Pembayaran berhasil: user=${telegramId}, plan=${plan.id}, donation=${donationId}`);
}

async function onPaymentFailed(ctx: BotContext, chatId: number, msgId: number, donationId: string) {
  stopPolling(donationId);
  try {
    await ctx.telegram.editMessageText(
      chatId, msgId, undefined,
      `❌ *Pembayaran Gagal / Dibatalkan*\n\nSilakan coba lagi.`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Coba Lagi", "menu_plan")],
          [Markup.button.callback("🏠 Menu Utama", "back_main_new")],
        ]),
      }
    );
  } catch { /* ignore */ }
}

async function onPaymentExpired(ctx: BotContext, chatId: number, msgId: number, donationId: string) {
  stopPolling(donationId);
  try {
    await ctx.telegram.editMessageText(
      chatId, msgId, undefined,
      `⏰ *Waktu Habis*\n\nQR sudah tidak valid (${MAX_WAIT_MINUTES} menit berlalu).\nBuat transaksi baru ya!`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Coba Lagi", "menu_plan")],
          [Markup.button.callback("🏠 Menu Utama", "back_main_new")],
        ]),
      }
    );
  } catch { /* ignore */ }
}

function pollPaymentStatus(
  ctx: BotContext,
  donationId: string,
  chatId: number,
  msgId: number,
  amountRaw: number,
  planId: PlanId,
) {
  const startTime = Date.now();
  const totalMs = MAX_WAIT_MINUTES * 60 * 1000;
  let lastEditedMinute = MAX_WAIT_MINUTES;

  const interval = setInterval(async () => {
    try {
      const secondsLeft = Math.max(0, Math.floor((totalMs - (Date.now() - startTime)) / 1000));
      const data = await checkPaymentStatus(donationId);
      const rawStatus = (data?.status ?? "").toUpperCase();

      if (["SUCCESS", "SETTLEMENT", "PAID", "CAPTURE"].includes(rawStatus)) {
        await onPaymentSuccess(ctx, chatId, msgId, donationId, amountRaw, planId);
      } else if (["FAILED", "EXPIRED", "CANCEL", "FAILURE", "DENY"].includes(rawStatus)) {
        await onPaymentFailed(ctx, chatId, msgId, donationId);
      } else if (secondsLeft <= 0) {
        await onPaymentExpired(ctx, chatId, msgId, donationId);
      } else {
        const currentMinute = Math.floor(secondsLeft / 60);
        if (currentMinute < lastEditedMinute) {
          lastEditedMinute = currentMinute;
          try {
            await ctx.telegram.editMessageText(
              chatId, msgId, undefined,
              `⏳ *Menunggu Pembayaran...*\n\n` +
              `🆔 ID: \`${donationId}\`\n` +
              `⏱ Sisa waktu: *${formatCountdown(secondsLeft)}*\n\n` +
              `_Scan QR lalu bayar, status akan update otomatis._`,
              {
                parse_mode: "Markdown",
                ...Markup.inlineKeyboard([
                  [Markup.button.callback("🔍 Cek Sekarang", `check_${donationId}`)],
                  [Markup.button.callback("❌ Batalkan", `cancel_${donationId}`)],
                ]),
              }
            );
          } catch { /* ignore edit conflict */ }
        }
      }
    } catch (err) {
      logger.error("Poll error:", (err as Error).message);
    }
  }, CHECK_INTERVAL_MS);

  return interval;
}

// ===================== MENUS =====================
function showMainMenu(ctx: BotContext, edit = false) {
  const name = ctx.from?.first_name ?? "Pengguna";
  const text =
    `🏠 *Menu Utama*\n\n` +
    `Halo *${name}*! 👋\n` +
    `Selamat datang di bot akses *Dango DEX Tools*.\n\n` +
    `Pilih menu di bawah:`;
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback("💳 Beli / Perpanjang Akses", "menu_plan")],
    [Markup.button.callback("🔍 Cek Status Pembayaran", "menu_cek_status")],
    [Markup.button.callback("ℹ️ Info Bot", "menu_info")],
  ]);
  if (edit) return ctx.editMessageText(text, { parse_mode: "Markdown", ...keyboard });
  return ctx.replyWithMarkdown(text, keyboard);
}

function showPlanMenu(ctx: BotContext, edit = false) {
  const rows = PLANS.map(p =>
    [Markup.button.callback(`${p.label} — ${formatRupiah(p.amount)}`, `plan_${p.id}`)]
  );
  rows.push([Markup.button.callback("🔙 Kembali", "back_main")]);
  const text = `📦 *Pilih Paket Akses*\n\n_Harga sudah termasuk biaya payment gateway._`;
  const keyboard = Markup.inlineKeyboard(rows);
  if (edit) return ctx.editMessageText(text, { parse_mode: "Markdown", ...keyboard });
  return ctx.replyWithMarkdown(text, keyboard);
}

// ===================== COMMANDS =====================
bot.start(async (ctx: BotContext) => { ctx.session = {}; await showMainMenu(ctx); });

bot.command("health", async (ctx: BotContext) => {
  if (!ADMIN_CHAT_ID || String(ctx.from?.id) !== String(ADMIN_CHAT_ID)) {
    return ctx.reply("⛔ Hanya untuk admin.");
  }
  const mem = process.memoryUsage();
  const mb = (b: number) => (b / 1024 / 1024).toFixed(1);
  const upMs = Date.now() - BOT_START_TIME;
  const h = Math.floor(upMs / 3_600_000);
  const m = Math.floor((upMs % 3_600_000) / 60_000);
  const s = Math.floor((upMs % 60_000) / 1_000);
  await ctx.replyWithMarkdown(
    `🏥 *Health*\n\n` +
    `⏱ Uptime: *${h}h ${m}m ${s}s*\n` +
    `💾 Heap: ${mb(mem.heapUsed)}/${mb(mem.heapTotal)} MB\n` +
    `📊 Polling aktif: ${Object.keys(activeIntervals).length}\n` +
    `👥 Users proses: ${processingUsers.size}`
  );
});

// ===================== ACTIONS =====================
bot.action("back_main", async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  ctx.session = {};
  await showMainMenu(ctx, true);
});
bot.action("back_main_new", async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  ctx.session = {};
  await showMainMenu(ctx, false);
});

bot.action("menu_plan", async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  ctx.session = {};
  await showPlanMenu(ctx, true);
});

bot.action("menu_info", async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `ℹ️ *Info Bot Akses Dango DEX Tools*\n\n` +
    `💳 Metode bayar: *QRIS* (semua e-wallet & m-banking)\n` +
    `⏰ Waktu bayar: *${MAX_WAIT_MINUTES} menit*\n` +
    `🔒 Aman via Saweria\n\n` +
    `Setelah bayar, akses kamu langsung diaktifkan.\nID Login akan ditampilkan di chat ini.\nHubungi admin untuk mendapatkan kredensial login.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "back_main")]]),
    }
  );
});

bot.action("menu_cek_status", async (ctx: BotContext) => {
  await ctx.answerCbQuery();
  ctx.session = { step: "input_cek_id" };
  await ctx.editMessageText(
    `🔍 *Cek Status Pembayaran*\n\nKetik *ID Transaksi* kamu:`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([[Markup.button.callback("🔙 Kembali", "back_main")]]),
    }
  );
});

// Pilih plan → minta nama
bot.action(/^plan_(.+)$/, async (ctx: BotContext) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const planId = (ctx as any).match[1] as PlanId;
  const plan = PLANS.find(p => p.id === planId);
  if (!plan) { await ctx.answerCbQuery("Plan tidak valid"); return; }

  ctx.session = { step: "input_name", planId, amount: plan.amount };
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    `📦 Plan dipilih: *${plan.label}* — ${formatRupiah(plan.amount)}\n\n` +
    `👤 Masukkan *nama* kamu (untuk QR):`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🔙 Ganti Plan", "menu_plan")],
        [Markup.button.callback("🏠 Menu Utama", "back_main")],
      ]),
    }
  );
});

// Check manual via button
bot.action(/^check_(.+)$/, async (ctx: BotContext) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const donationId = (ctx as any).match[1] as string;
  const data = await checkPaymentStatus(donationId);
  if (!data) return ctx.answerCbQuery("❌ Gagal cek, coba lagi.", { show_alert: true });
  const st = (data.status ?? "").toUpperCase();
  if (["SUCCESS", "SETTLEMENT", "PAID", "CAPTURE"].includes(st))
    return ctx.answerCbQuery("✅ Pembayaran terdeteksi!");
  if (["FAILED", "EXPIRED", "CANCEL", "FAILURE", "DENY"].includes(st))
    return ctx.answerCbQuery("❌ Pembayaran gagal/dibatalkan.");
  return ctx.answerCbQuery("⏳ Masih menunggu pembayaran.", { show_alert: true });
});

// Cancel payment
bot.action(/^cancel_(.+)$/, async (ctx: BotContext) => {
  await ctx.answerCbQuery("Transaksi dibatalkan");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const donationId = (ctx as any).match[1] as string;
  stopPolling(donationId);
  try {
    await ctx.editMessageText(
      `❌ *Transaksi Dibatalkan*`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [Markup.button.callback("🔄 Coba Lagi", "menu_plan")],
          [Markup.button.callback("🏠 Menu Utama", "back_main_new")],
        ]),
      }
    );
  } catch { /* ignore */ }
});

// ===================== TEXT HANDLER =====================
bot.on("text", async (ctx: BotContext) => {
  try {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (rateLimiter.isLimited(userId, 15)) {
      return ctx.reply("⏳ Terlalu cepat. Tunggu sebentar ya.");
    }

    const s    = ctx.session ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = ((ctx as any).message?.text ?? "").trim() as string;

    // Cek status donasi manual
    if (s.step === "input_cek_id") {
      const loadMsg = await ctx.reply("🔍 Mengecek status...");
      const data = await checkPaymentStatus(text);
      try { await ctx.telegram.deleteMessage(ctx.chat!.id, loadMsg.message_id); } catch { /* ignore */ }

      if (!data) {
        ctx.session = {};
        return ctx.replyWithMarkdown(
          `❌ *Transaksi tidak ditemukan.*\nPastikan ID benar.`,
          Markup.inlineKeyboard([
            [Markup.button.callback("🔍 Cek Lagi", "menu_cek_status")],
            [Markup.button.callback("🏠 Menu", "back_main_new")],
          ])
        );
      }

      const st = (data.status ?? "").toUpperCase();
      const emoji = ["SUCCESS", "SETTLEMENT", "PAID", "CAPTURE"].includes(st)
        ? "✅" : st === "PENDING" ? "⏳" : "❌";
      ctx.session = {};
      return ctx.replyWithMarkdown(
        `${emoji} *Status Pembayaran*\n\n` +
        `🆔 ID: \`${data.id}\`\n` +
        `💰 Jumlah: ${formatRupiah(data.amount)}\n` +
        `📌 Status: *${st}*`,
        Markup.inlineKeyboard([
          [Markup.button.callback("🔙 Menu", "back_main_new")],
        ])
      );
    }

    // Input nama → lanjut proses donasi
    if (s.step === "input_name") {
      if (text.length < 2) return ctx.reply("⚠️ Nama minimal 2 karakter.");
      ctx.session.name = text;
      ctx.session.step = "processing";
      await processPayment(ctx);
    }
  } catch (err) {
    logger.error("text handler error:", (err as Error).message);
    try { await ctx.reply("⚠️ Terjadi kesalahan. Kirim /start untuk mulai ulang."); } catch { /* ignore */ }
  }
});

// ===================== PROSES PEMBAYARAN =====================
async function processPayment(ctx: BotContext) {
  const userId = ctx.from?.id;
  if (!userId) return;

  if (processingUsers.has(userId)) {
    return ctx.reply("⚠️ Transaksi sedang diproses, tunggu sebentar ya.");
  }
  processingUsers.add(userId);
  const cleanup = setTimeout(() => processingUsers.delete(userId), 5 * 60 * 1000);

  const { amount = 50_000, planId = "30d", name = "user" } = ctx.session;
  const plan = PLANS.find(p => p.id === planId) ?? PLANS[0];
  const chatId = ctx.chat!.id;

  const processingMsg = await ctx.replyWithMarkdown(
    `⏳ *Membuat transaksi...*\n💰 ${formatRupiah(amount)} — ${plan.label}`
  );

  try {
    const calc = await calculateAmount(amount);
    const { amount_to_pay, pg_fee } = calc;

    const donation = await createDonation(amount_to_pay, name);
    const { qr_string: qrString, id: donationId } = donation;

    ctx.session.amountToPay = amount_to_pay;
    ctx.session.pgFee       = pg_fee;

    const qrPath = await generateQRImage(qrString, donationId);

    try { await ctx.telegram.deleteMessage(chatId, processingMsg.message_id); } catch { /* ignore */ }

    // Kirim QR
    await ctx.replyWithPhoto(
      { source: qrPath },
      {
        caption:
          `🧾 *Detail Pembayaran*\n\n` +
          `👤 Nama: *${name}*\n` +
          `📦 Plan: *${plan.label}*\n` +
          `💰 Nominal: ${formatRupiah(amount)}\n` +
          `💳 Biaya PG: ${formatRupiah(pg_fee)}\n` +
          `💵 *Total Bayar: ${formatRupiah(amount_to_pay)}*\n\n` +
          `📱 *Scan QR pakai e-wallet atau m-banking*\n` +
          `⏰ Waktu bayar: *${MAX_WAIT_MINUTES} menit*`,
        parse_mode: "Markdown",
      }
    );

    // Status message untuk polling countdown
    const statusMsg = await ctx.replyWithMarkdown(
      `⏳ *Menunggu Pembayaran...*\n\n` +
      `🆔 ID: \`${donationId}\`\n` +
      `⏱ Sisa waktu: *${MAX_WAIT_MINUTES}:00*\n\n` +
      `_Scan QR lalu bayar, status akan update otomatis._`,
      Markup.inlineKeyboard([
        [Markup.button.callback("🔍 Cek Sekarang", `check_${donationId}`)],
        [Markup.button.callback("❌ Batalkan", `cancel_${donationId}`)],
      ])
    );

    const intervalId = pollPaymentStatus(
      ctx, donationId, chatId, statusMsg.message_id, amount_to_pay, planId as PlanId
    );
    activeIntervals[donationId] = intervalId;

    clearTimeout(cleanup);
    processingUsers.delete(userId);
    ctx.session = {};
    logger.info(`Donasi dimulai: user=${userId}, plan=${planId}, id=${donationId}`);

  } catch (err) {
    clearTimeout(cleanup);
    processingUsers.delete(userId);
    ctx.session = {};
    logger.error("processPayment error:", (err as Error).message);

    try {
      await ctx.telegram.editMessageText(
        chatId, processingMsg.message_id, undefined,
        `❌ *Gagal Membuat Transaksi*\n\n${(err as Error).message}`,
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [Markup.button.callback("🔄 Coba Lagi", "menu_plan")],
            [Markup.button.callback("🏠 Menu Utama", "back_main_new")],
          ]),
        }
      );
    } catch {
      await ctx.reply("❌ Gagal membuat transaksi. Coba lagi.", {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([[Markup.button.callback("🔄 Coba Lagi", "menu_plan")]]),
      }).catch(() => { /* ignore */ });
    }

    await notifyAdmin(bot,
      `🚨 *ERROR TRANSAKSI*\n\n` +
      `👤 User: ${name} (${userId})\n` +
      `📦 Plan: ${plan.label}\n` +
      `❌ Error: ${(err as Error).message}`
    );
  }
}

// ===================== GLOBAL ERROR HANDLER =====================
bot.catch((err, ctx) => {
  logger.error(`bot.catch [${ctx.updateType}]:`, (err as Error).message);
  ctx.reply("⚠️ Terjadi kesalahan. Kirim /start untuk mulai ulang.").catch(() => { /* ignore */ });
});

// ===================== GRACEFUL SHUTDOWN =====================
function gracefulShutdown(signal: string) {
  logger.info(`${signal} — membersihkan dan mematikan bot...`);
  stopAllPolling();
  bot.stop(signal);
}

process.once("SIGINT",  () => gracefulShutdown("SIGINT"));
process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ===================== LAUNCH =====================
logger.info("🤖 Telegram Bot Dango DEX Tools memulai...");
bot.launch().then(() => logger.success("Bot berjalan! Kirim /start ke bot kamu."))
  .catch((err: Error) => {
    logger.error("Gagal start bot:", err.message);
    process.exit(1);
  });
