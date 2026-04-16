import { sha256 } from "@noble/hashes/sha2.js";
import * as secp from "@noble/secp256k1";
import { db, dangoSessionTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";
import {
  generateSessionKeypair,
  encryptPrivkey,
  decryptPrivkey,
  computeKeyHash,
  fetchUserIndex,
  SESSION_EXPIRY_DAYS,
} from "@workspace/dango-keys";

export {
  generateSessionKeypair,
  encryptPrivkey,
  decryptPrivkey,
  computeKeyHash,
  fetchUserIndex,
  SESSION_EXPIRY_DAYS,
};

const DANGO_GRAPHQL = "https://api-mainnet.dango.zone/graphql";
const PERPS_CONTRACT = "0x90bc84df68d1aa59a857e04ed529e9a26edbea4f";
const CHAIN_ID = "dango-1";

function canonicalize(val: unknown): string {
  if (val === null || val === undefined) return "null";
  if (typeof val !== "object") return JSON.stringify(val);
  if (Array.isArray(val)) return "[" + val.map(canonicalize).join(",") + "]";
  const sorted = Object.keys(val as object)
    .sort()
    .map((k) => JSON.stringify(k) + ":" + canonicalize((val as Record<string, unknown>)[k]));
  return "{" + sorted.join(",") + "}";
}

async function gqlRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const resp = await fetch(DANGO_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const data = (await resp.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (data.errors?.length) throw new Error(data.errors[0].message);
  if (!data.data) throw new Error("Empty GraphQL response");
  return data.data;
}

async function simulateTx(
  sender: string,
  msgs: unknown[],
  nonce: number,
  userIndex: number,
): Promise<number> {
  const tx = {
    sender,
    msgs,
    data: { user_index: userIndex, chain_id: CHAIN_ID, nonce, expiry: null },
  };
  const result = await gqlRequest<{ simulate: number }>(
    "query Simulate($tx: UnsignedTx!) { simulate(tx: $tx) }",
    { tx },
  );
  return result.simulate + 770_000;
}

export async function cancelAllOrders(params: {
  walletAddress: string;
  userIndex: number;
  privkeyEnc: string;
  pubkey: string;
  expireAt: string;
  authorization: string;
  nonce: number;
}): Promise<{ success: boolean; result?: unknown; error?: string }> {
  try {
    const msgs = [
      {
        execute: {
          contract: PERPS_CONTRACT,
          msg: { trade: { cancel_order: "all" } },
          funds: {},
        },
      },
    ];

    const gasLimit = await simulateTx(params.walletAddress, msgs, params.nonce, params.userIndex);

    const signDoc = {
      data: {
        chain_id: CHAIN_ID,
        expiry: null,
        nonce: params.nonce,
        user_index: params.userIndex,
      },
      gas_limit: gasLimit,
      messages: msgs,
      sender: params.walletAddress,
    };

    const docJson = canonicalize(signDoc);
    const docHash = sha256(new TextEncoder().encode(docJson));

    const privkeyHex = decryptPrivkey(params.privkeyEnc);
    const privkeyBytes = Buffer.from(privkeyHex, "hex");
    const sig = await secp.signAsync(docHash, privkeyBytes, { lowS: true });
    const sessionSignature = sig.toCompactHex();

    const authObj = JSON.parse(params.authorization) as unknown;

    const tx = {
      sender: params.walletAddress,
      gas_limit: gasLimit,
      msgs,
      data: {
        user_index: params.userIndex,
        chain_id: CHAIN_ID,
        nonce: params.nonce,
        expiry: null,
      },
      credential: {
        session: {
          session_info: {
            session_key: params.pubkey,
            expire_at: params.expireAt,
          },
          session_signature: sessionSignature,
          authorization: authObj,
        },
      },
    };

    const broadcastResult = await gqlRequest<{ broadcastTxSync: unknown }>(
      "mutation BroadcastTx($tx: Tx!) { broadcastTxSync(tx: $tx) }",
      { tx },
    );

    return { success: true, result: broadcastResult.broadcastTxSync };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function getActiveSession() {
  const [session] = await db.select().from(dangoSessionTable).limit(1);
  return session ?? null;
}

// Atomic on-chain cancel — safe to call from multiple concurrent contexts.
// Nonce di-increment di DB secara atomic sebelum broadcast untuk mencegah race condition.
// Jika broadcast gagal, nonce tetap ter-increment (nonce burn) — ini acceptable per desain Dango.
// Setelah cancel berhasil, pembukaan order baru harus dilakukan secara manual via API/Dashboard
// sampai modul openNewGrid diimplementasikan (DANGO-ENGINE-003).
export async function tryOnChainCancelAll(context: string): Promise<void> {
  const [updated] = await db
    .update(dangoSessionTable)
    .set({ nonce: sql`${dangoSessionTable.nonce} + 1`, updatedAt: new Date() })
    .returning();

  if (!updated || !updated.authorization) {
    logger.warn({ context }, "Cancel on-chain dilewati — session key belum disetup");
    return;
  }
  const expireAtMs = Number(BigInt(updated.expireAt) / 1_000_000n);
  if (new Date(expireAtMs) < new Date()) {
    logger.warn({ context }, "Cancel on-chain dilewati — session key sudah expired");
    return;
  }

  const result = await cancelAllOrders({
    walletAddress: updated.walletAddress,
    userIndex: updated.userIndex,
    privkeyEnc: updated.privkeyEnc,
    pubkey: updated.pubkey,
    expireAt: updated.expireAt,
    authorization: updated.authorization,
    nonce: updated.nonce,
  });

  if (result.success) {
    logger.info({ context, result: result.result }, "Cancel all orders on-chain berhasil");
    logger.warn(
      { context },
      "Auto-rerange cancel selesai — order lama sudah dibersihkan. " +
      "Pembukaan order baru HARUS dilakukan manual via API/Dashboard (DANGO-ENGINE-003 belum diimplementasikan).",
    );
  } else {
    logger.error({ context, error: result.error }, "Cancel all orders on-chain gagal — order di Dango mungkin masih aktif");
  }
}
