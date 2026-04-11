import { sha256 } from "@noble/hashes/sha256";
import * as secp from "@noble/secp256k1";
import { db, dangoSessionTable } from "@workspace/db";
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
