import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Key,
  Loader2,
  Copy,
  Check,
  RotateCcw,
  ChevronRight,
} from "lucide-react";

interface SessionStatus {
  status: "not_configured" | "active" | "expired";
  walletAddress?: string;
  pubkey?: string;
  keyHash?: string;
  expiresAt?: string;
  nonce?: number;
  hasAuthorization?: boolean;
}

interface SessionInfo {
  session_key: string;
  expire_at: string;
}

interface InitResult {
  message: string;
  sessionInfo: SessionInfo;
  keyHash: string;
  walletAddress: string;
  userIndex: number;
  expiresAt: string;
  expiryDays: number;
  instruction: string;
}

function StatusBadge({ status }: { status: SessionStatus["status"] }) {
  if (status === "active")
    return (
      <Badge className="gap-1 bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/15">
        <CheckCircle2 className="w-3 h-3" /> Aktif
      </Badge>
    );
  if (status === "expired")
    return (
      <Badge className="gap-1 bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/15">
        <Clock className="w-3 h-3" /> Expired
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-muted text-muted-foreground border-border hover:bg-muted">
      <XCircle className="w-3 h-3" /> Belum dikonfigurasi
    </Badge>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleCopy}>
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </Button>
  );
}

export function SessionKeySetup() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [walletAddress, setWalletAddress] = useState("");
  const [initResult, setInitResult] = useState<InitResult | null>(null);
  const [authJson, setAuthJson] = useState("");
  const [loadingInit, setLoadingInit] = useState(false);
  const [loadingAuthorize, setLoadingAuthorize] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/session-key/status", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as SessionStatus;
      setSessionStatus(data);
    } catch {
      setSessionStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  async function handleInit() {
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress.trim())) {
      toast({ title: "Wallet address tidak valid", description: "Harus format 0x... (42 karakter)", variant: "destructive" });
      return;
    }
    setLoadingInit(true);
    try {
      const res = await fetch("/api/session-key/init", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ walletAddress: walletAddress.trim() }),
      });
      const data = await res.json() as InitResult & { error?: string };
      if (!res.ok) {
        toast({ title: "Gagal init session key", description: data.error ?? "Coba lagi", variant: "destructive" });
        return;
      }
      setInitResult(data);
      setStep(2);
    } catch {
      toast({ title: "Error", description: "Tidak dapat menghubungi server", variant: "destructive" });
    } finally {
      setLoadingInit(false);
    }
  }

  async function handleAuthorize() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(authJson.trim());
    } catch {
      toast({ title: "JSON tidak valid", description: "Paste authorization object yang valid dari Dango", variant: "destructive" });
      return;
    }
    setLoadingAuthorize(true);
    try {
      const res = await fetch("/api/session-key/authorize", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ authorization: parsed }),
      });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) {
        toast({ title: "Gagal authorize", description: data.error ?? "Coba lagi", variant: "destructive" });
        return;
      }
      toast({ title: "Session key aktif!", description: data.message ?? "Bot siap cancel order on-chain" });
      setStep(1);
      setInitResult(null);
      setAuthJson("");
      setWalletAddress("");
      await fetchStatus();
    } catch {
      toast({ title: "Error", description: "Tidak dapat menghubungi server", variant: "destructive" });
    } finally {
      setLoadingAuthorize(false);
    }
  }

  async function handleReset() {
    setLoadingReset(true);
    try {
      const res = await fetch("/api/session-key/reset", { method: "POST", headers: authHeaders });
      const data = await res.json() as { message?: string };
      toast({ title: "Session key dihapus", description: data.message });
      setStep(1);
      setInitResult(null);
      setAuthJson("");
      setWalletAddress("");
      await fetchStatus();
    } catch {
      toast({ title: "Error", description: "Tidak dapat menghubungi server", variant: "destructive" });
    } finally {
      setLoadingReset(false);
    }
  }

  const sessionInfoJson = initResult
    ? JSON.stringify(initResult.sessionInfo, null, 2)
    : "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Session Key On-Chain</CardTitle>
          </div>
          {loadingStatus ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : sessionStatus ? (
            <StatusBadge status={sessionStatus.status} />
          ) : null}
        </div>
        <CardDescription className="text-xs">
          Diperlukan agar bot bisa cancel order di Dango mainnet secara otomatis.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status detail */}
        {!loadingStatus && sessionStatus && sessionStatus.status !== "not_configured" && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet</span>
              <span className="font-mono truncate max-w-[220px]">{sessionStatus.walletAddress}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Authorized</span>
              <span>{sessionStatus.hasAuthorization ? "✅ Ya" : "❌ Belum"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nonce</span>
              <span>{sessionStatus.nonce}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Berlaku sampai</span>
              <span>{sessionStatus.expiresAt ? new Date(sessionStatus.expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span>
            </div>
          </div>
        )}

        <Separator />

        {/* Step wizard */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 1 — Inisialisasi session key</p>
            <div className="space-y-1.5">
              <Label htmlFor="wallet-addr" className="text-sm">Wallet Address</Label>
              <Input
                id="wallet-addr"
                placeholder="0x1234...abcd"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="font-mono text-sm"
                disabled={loadingInit}
              />
              <p className="text-xs text-muted-foreground">Alamat wallet Dango kamu (format 0x, 42 karakter)</p>
            </div>
            <Button onClick={handleInit} disabled={loadingInit || !walletAddress} className="w-full gap-2">
              {loadingInit ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {loadingInit ? "Generating..." : "Generate Session Key"}
            </Button>
          </div>
        )}

        {step === 2 && initResult && (
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 2 — Sign di Dango Exchange</p>
              <Alert className="bg-primary/5 border-primary/20">
                <AlertDescription className="text-xs space-y-1">
                  <p>1. Buka <a href="https://dango.exchange" target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">dango.exchange</a> dan login dengan wallet kamu</p>
                  <p>2. Buka menu <strong>Account → Session Keys</strong> (atau fitur sejenisnya)</p>
                  <p>3. Paste <strong>session_info</strong> di bawah ini ke form sign-nya</p>
                  <p>4. Tandatangani dengan passkey → copy objek <strong>authorization</strong> yang dihasilkan</p>
                </AlertDescription>
              </Alert>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">session_info (untuk di-paste ke Dango)</Label>
                  <CopyButton text={sessionInfoJson} />
                </div>
                <pre className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all border border-border/40">
                  {sessionInfoJson}
                </pre>
                <p className="text-xs text-muted-foreground">
                  Key hash: <span className="font-mono">{initResult.keyHash.slice(0, 16)}…</span> · Berlaku {initResult.expiryDays} hari ({new Date(initResult.expiresAt).toLocaleDateString("id-ID")})
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 3 — Submit authorization</p>
              <div className="space-y-1.5">
                <Label htmlFor="auth-json" className="text-sm">Authorization JSON</Label>
                <Textarea
                  id="auth-json"
                  placeholder={'{"key_hash": "...", "signature": "..."}'}
                  value={authJson}
                  onChange={(e) => setAuthJson(e.target.value)}
                  className="font-mono text-xs min-h-24 resize-none"
                  disabled={loadingAuthorize}
                />
                <p className="text-xs text-muted-foreground">Paste objek authorization dari Dango Exchange</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setStep(1)} disabled={loadingAuthorize}>
                  Kembali
                </Button>
                <Button className="flex-1 gap-2" onClick={handleAuthorize} disabled={loadingAuthorize || !authJson.trim()}>
                  {loadingAuthorize ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {loadingAuthorize ? "Menyimpan..." : "Activate Session Key"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Reset button — selalu tampil jika sudah ada session */}
        {step === 1 && !loadingStatus && sessionStatus && sessionStatus.status !== "not_configured" && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Reset Session Key</p>
                <p className="text-xs text-muted-foreground">Hapus dan buat ulang session key baru</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleReset}
                disabled={loadingReset}
              >
                {loadingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                Reset
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
