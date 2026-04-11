import { Router } from "express";
import { db, dangoSessionTable } from "@workspace/db";
import { generateSessionKeypair, encryptPrivkey, fetchUserIndex, SESSION_EXPIRY_DAYS } from "../lib/dangoTxBuilder";

const router = Router();

router.get("/session-key/status", async (_req, res) => {
  const [session] = await db.select().from(dangoSessionTable).limit(1);
  if (!session) {
    res.json({ status: "not_configured" });
    return;
  }
  const expireAtMs = Number(BigInt(session.expireAt) / 1_000_000n);
  const expiresAt = new Date(expireAtMs).toISOString();
  const isExpired = new Date(expireAtMs) < new Date();
  res.json({
    status: isExpired ? "expired" : "active",
    walletAddress: session.walletAddress,
    userIndex: session.userIndex,
    pubkey: session.pubkey,
    keyHash: session.keyHash,
    expireAt: session.expireAt,
    expiresAt,
    nonce: session.nonce,
    hasAuthorization: session.authorization !== "",
  });
});

router.post("/session-key/init", async (req, res) => {
  const { walletAddress } = req.body as { walletAddress?: string };
  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    res.status(400).json({ error: "walletAddress harus berupa alamat hex 0x... (42 karakter)" });
    return;
  }

  let userIndex: number;
  try {
    userIndex = await fetchUserIndex(walletAddress);
  } catch (e) {
    res.status(400).json({ error: `Gagal fetch userIndex dari Dango: ${String(e)}` });
    return;
  }

  const { privkeyHex, pubkeyHex, keyHash, expireAt } = generateSessionKeypair();
  const privkeyEnc = encryptPrivkey(privkeyHex);

  await db.delete(dangoSessionTable);
  await db.insert(dangoSessionTable).values({
    walletAddress,
    userIndex,
    privkeyEnc,
    pubkey: pubkeyHex,
    keyHash,
    expireAt,
    authorization: "",
    nonce: 0,
  });

  const expireAtMs = Number(BigInt(expireAt) / 1_000_000n);
  res.json({
    message: "Session key berhasil digenerate. Lakukan authorization dengan session_info berikut.",
    sessionInfo: {
      session_key: pubkeyHex,
      expire_at: expireAt,
    },
    keyHash,
    walletAddress,
    userIndex,
    expiresAt: new Date(expireAtMs).toISOString(),
    expiryDays: SESSION_EXPIRY_DAYS,
    instruction:
      "Sign session_info (canonical JSON SHA-256) dengan master key Dango kamu, lalu POST authorization ke /api/session-key/authorize",
  });
});

router.post("/session-key/authorize", async (req, res) => {
  const { authorization } = req.body as { authorization?: unknown };
  if (!authorization || typeof authorization !== "object") {
    res.status(400).json({ error: "Field 'authorization' harus berupa objek JSON dengan key_hash dan signature" });
    return;
  }

  const [session] = await db.select().from(dangoSessionTable).limit(1);
  if (!session) {
    res.status(404).json({ error: "Session key belum diinisialisasi. Jalankan POST /api/session-key/init terlebih dahulu." });
    return;
  }
  if (session.authorization !== "") {
    res.status(409).json({ error: "Session key sudah terauthorized. Reset dengan POST /api/session-key/init untuk membuat ulang." });
    return;
  }

  await db
    .update(dangoSessionTable)
    .set({ authorization: JSON.stringify(authorization), updatedAt: new Date() });

  res.json({
    message: "Session key berhasil diauthorize. Bot kini bisa cancel order on-chain.",
    walletAddress: session.walletAddress,
    pubkey: session.pubkey,
    expiresAt: new Date(Number(BigInt(session.expireAt) / 1_000_000n)).toISOString(),
  });
});

router.post("/session-key/reset", async (_req, res) => {
  await db.delete(dangoSessionTable);
  res.json({ message: "Session key dihapus. Jalankan POST /api/session-key/init untuk setup ulang." });
});

export default router;
