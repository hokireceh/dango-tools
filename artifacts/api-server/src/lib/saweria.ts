import { execFile } from "child_process";

const SAWERIA_API = "https://backend.saweria.co";

const SAWERIA_USERNAME = process.env.SAWERIA_USERNAME ?? "zahwafe"; // intentional default
const SAWERIA_USER_ID = process.env.SAWERIA_USER_ID ?? "d8e876df-405c-4e08-9708-9808b9037ea5"; // intentional default

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
      try {
        resolve(JSON.parse(stdout) as Record<string, unknown>);
      } catch {
        reject(new Error(`Non-JSON response dari Saweria: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

function curlGet(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const args = ["-s", "--compressed", "-m", "30", url, ...CURL_HEADERS];
    execFile("curl", args, { maxBuffer: 2 * 1024 * 1024 }, (err, stdout) => {
      if (err) return reject(new Error(`curl error: ${err.message}`));
      try {
        resolve(JSON.parse(stdout) as Record<string, unknown>);
      } catch {
        reject(new Error(`Non-JSON response: ${stdout.slice(0, 200)}`));
      }
    });
  });
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const wait = delayMs * Math.pow(2, i);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("withRetry: exhausted");
}

export type CalculateResult = {
  amount_to_pay: number;
  pg_fee: number;
  platform_fee: number;
};

export async function calculateAmount(amount: number): Promise<CalculateResult> {
  return withRetry(async () => {
    const payload = {
      agree: true, notUnderage: true,
      message: "-", amount,
      payment_type: "qris", vote: "", giphy: null, yt: "", ytStart: 0,
      mediaType: null, image_guess: null, image_guess_answer: "",
      amountToPay: "", currency: "IDR", pgFee: "", platformFee: "",
      customer_info: { first_name: "user", email: "user@hokireceh.app", phone: "" },
    };
    const res = await curlPost(
      `${SAWERIA_API}/donations/${SAWERIA_USERNAME}/calculate_pg_amount`,
      payload,
    );
    const data = res?.data as CalculateResult | undefined;
    if (!data?.amount_to_pay) throw new Error("calculateAmount: respons tidak valid");
    return data;
  });
}

export type DonationResult = {
  id: string;
  qr_string: string;
  amount: number;
};

export async function createDonation(
  amount: number,
  name: string,
  email: string,
): Promise<DonationResult> {
  return withRetry(async () => {
    const payload = {
      agree: true, notUnderage: true,
      message: "Akses Dango DEX Tools — Hokireceh",
      amount,
      payment_type: "qris", vote: "", currency: "IDR",
      customer_info: { first_name: name, email, phone: "" },
    };
    const res = await curlPost(
      `${SAWERIA_API}/donations/snap/${SAWERIA_USER_ID}`,
      payload,
    );
    const data = res?.data as DonationResult | undefined;
    if (!data?.qr_string) {
      throw new Error((res?.message as string) ?? "createDonation: respons tidak valid");
    }
    return data;
  });
}

export type PaymentStatus = {
  id: string;
  status: string;
  amount: number;
};

export async function checkPaymentStatus(donationId: string): Promise<PaymentStatus | null> {
  try {
    const res = await curlGet(`${SAWERIA_API}/donations/qris/snap/${donationId}`);
    const d = res?.data as { id: string; transaction_status: string; amount_raw: number } | undefined;
    if (d) {
      return { id: d.id, status: d.transaction_status, amount: d.amount_raw };
    }
  } catch {
    // silent — caller handles null
  }
  return null;
}

export function isSaweriaConfigured(): boolean {
  return Boolean(SAWERIA_USERNAME && SAWERIA_USER_ID);
}
