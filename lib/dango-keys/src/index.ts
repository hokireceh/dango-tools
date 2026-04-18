import * as secp from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export const SESSION_EXPIRY_DAYS = 30;

function getAesKey(): Buffer {
  const secret = process.env.SESSION_KEY_SECRET ?? "";
  if (!secret) throw new Error("SESSION_KEY_SECRET env var is required");
  return Buffer.from(secret.padEnd(32, "0").slice(0, 32), "utf8");
}

export function computeKeyHash(pubkeyHex: string): string {
  return Buffer.from(sha256(Buffer.from(pubkeyHex, "hex"))).toString("hex").toUpperCase();
}

export function generateSessionKeypair(): {
  privkeyHex: string;
  pubkeyHex: string;
  keyHash: string;
  expireAt: string;
} {
  const privkey = secp.utils.randomSecretKey();
  const pubkey = secp.getPublicKey(privkey, true);
  const pubkeyHex = Buffer.from(pubkey).toString("hex");
  const expireAtMs = BigInt(Date.now()) + BigInt(SESSION_EXPIRY_DAYS) * 86_400_000n;
  const expireAtNs = expireAtMs * 1_000_000n;
  return {
    privkeyHex: Buffer.from(privkey).toString("hex"),
    pubkeyHex,
    keyHash: computeKeyHash(pubkeyHex),
    expireAt: expireAtNs.toString(),
  };
}

export function encryptPrivkey(privkeyHex: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getAesKey(), iv);
  const enc = Buffer.concat([cipher.update(privkeyHex, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

export function decryptPrivkey(encStr: string): string {
  const parts = encStr.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted privkey format");
  const [ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv("aes-256-gcm", getAesKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(encHex, "hex"), undefined, "utf8") + decipher.final("utf8");
}

export async function fetchUserIndex(walletAddress: string): Promise<number> {
  const resp = await fetch("https://api-mainnet.dango.zone/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query { accounts(address: "${walletAddress}", first: 1) { nodes { users { userIndex } } } }`,
    }),
  });
  const data = (await resp.json()) as {
    data?: { accounts: { nodes: Array<{ users: Array<{ userIndex: number }> }> } };
    errors?: Array<{ message: string }>;
  };
  if (data.errors?.length) throw new Error(data.errors[0].message);
  const nodes = data.data?.accounts?.nodes;
  if (!nodes?.length || !nodes[0].users?.length) {
    throw new Error(`userIndex tidak ditemukan untuk ${walletAddress}`);
  }
  return nodes[0].users[0].userIndex;
}
