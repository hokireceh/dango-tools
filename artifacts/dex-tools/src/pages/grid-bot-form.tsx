import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  useCreateGridBot,
  useGetMarketPrices,
  getGetMarketPricesQueryKey,
  getListGridBotsQueryKey,
  getGetMarketSummaryQueryKey,
  getGetBotStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, ArrowLeft, TrendingUp, TrendingDown, Minus, RefreshCw, Zap, Gauge, ShieldOff } from "lucide-react";
import { Link } from "wouter";

const COMMON_PAIRS = ["BTC/USDC", "ETH/USDC", "ATOM/USDC", "SOL/USDC", "OSMO/USDC", "INJ/USDC", "TIA/USDC"];

const formSchema = z.object({
  name: z.string().min(1, "Nama bot wajib diisi"),
  pair: z.string().min(1, "Pair trading wajib diisi"),
  orderType: z.enum(["long", "short", "neutral"]),
  lowerPrice: z.coerce.number().positive("Harus positif"),
  upperPrice: z.coerce.number().positive("Harus positif"),
  gridCount: z.coerce.number().int().min(2, "Minimal 2 grid"),
  investmentAmount: z.coerce.number().positive("Modal harus diisi"),
  executionMode: z.enum(["aggressive", "normal", "passive"]),
  rerangeMode: z.enum(["off", "conservative", "moderate", "aggressive"]),
  budgetStop: z.coerce.number().positive("Harus positif").nullable().optional(),
}).refine((data) => data.upperPrice > data.lowerPrice, {
  message: "Harga atas harus lebih besar dari harga bawah",
  path: ["upperPrice"],
});

type FormValues = z.infer<typeof formSchema>;

const ORDER_TYPE_INFO = {
  long: { label: "Long (Beli naik)", icon: TrendingUp, desc: "Profit ketika harga naik. Grid membeli di bawah dan menjual di atas.", color: "text-emerald-400" },
  short: { label: "Short (Jual turun)", icon: TrendingDown, desc: "Profit ketika harga turun. Grid menjual di atas dan membeli di bawah.", color: "text-red-400" },
  neutral: { label: "Neutral (Dua arah)", icon: Minus, desc: "Grid berjalan dua arah. Cocok untuk pasar sideways tanpa arah jelas.", color: "text-slate-400" },
};

export default function GridBotForm() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createBot = useCreateGridBot();
  const [customPair, setCustomPair] = useState(false);

  const { data: marketPrices, isLoading: pricesLoading, refetch: refetchPrices } = useGetMarketPrices({
    query: { queryKey: getGetMarketPricesQueryKey() }
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      pair: "BTC/USDC",
      orderType: "neutral",
      lowerPrice: 0,
      upperPrice: 0,
      gridCount: 10,
      investmentAmount: 100,
      executionMode: "normal",
      rerangeMode: "off",
      budgetStop: null,
    },
  });

  const watchedPair = form.watch("pair");
  const watchedOrderType = form.watch("orderType");
  const watchedRerangeMode = form.watch("rerangeMode");

  const currentMarket = marketPrices?.find((p) => p.pair === watchedPair);

  const handleAutoFillPrice = () => {
    if (!currentMarket) return;
    const price = currentMarket.price;
    const spread = 0.1;
    form.setValue("lowerPrice", parseFloat((price * (1 - spread)).toFixed(6)));
    form.setValue("upperPrice", parseFloat((price * (1 + spread)).toFixed(6)));
    toast({ title: `Harga diisi otomatis dari API: $${price.toLocaleString()}` });
  };

  useEffect(() => {
    if (currentMarket && form.getValues("lowerPrice") === 0) {
      handleAutoFillPrice();
    }
  }, [currentMarket]);

  const onSubmit = (values: FormValues) => {
    createBot.mutate({ data: values }, {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListGridBotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMarketSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBotStatsQueryKey() });
        toast({ title: "Grid Bot berhasil dibuat!" });
        setLocation(`/grid-bot/${data.id}`);
      },
      onError: (err) => {
        toast({ title: "Gagal membuat bot", description: String(err), variant: "destructive" });
      }
    });
  };

  const selectedOrderInfo = ORDER_TYPE_INFO[watchedOrderType];
  const OrderIcon = selectedOrderInfo.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="grid-bot-form-page">
      <div className="flex items-center gap-4">
        <Link href="/grid-bot">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat Grid Bot</h1>
          <p className="text-muted-foreground text-sm">Konfigurasi parameter grid bot on-chain baru.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Market Price Card */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Harga Pasar Live
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetchPrices()} disabled={pricesLoading} data-testid="button-refresh-prices">
                  <RefreshCw className={`h-3 w-3 ${pricesLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pricesLoading ? (
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded" />)}
                </div>
              ) : marketPrices && marketPrices.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {marketPrices.slice(0, 8).map((mp) => (
                    <button
                      key={mp.symbol}
                      type="button"
                      onClick={() => {
                        if (!customPair) form.setValue("pair", mp.pair);
                      }}
                      className={`text-left rounded p-2 border transition-colors ${
                        watchedPair === mp.pair
                          ? "border-primary bg-primary/15"
                          : "border-border hover:border-primary/50 hover:bg-card"
                      }`}
                      data-testid={`button-pair-${mp.symbol}`}
                    >
                      <div className="text-xs text-muted-foreground font-mono">{mp.symbol}/USDC</div>
                      <div className="font-mono font-semibold text-sm">${mp.price.toLocaleString()}</div>
                      <div className={`text-xs font-mono ${mp.change24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {mp.change24h >= 0 ? "+" : ""}{mp.change24h.toFixed(2)}%
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Harga tidak tersedia. Cek koneksi internet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parameter Bot</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Nama + Pair */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nama Bot</FormLabel>
                          <FormControl>
                            <Input placeholder="BTC Long Bot" {...field} data-testid="input-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pair"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trading Pair</FormLabel>
                          {customPair ? (
                            <div className="flex gap-2">
                              <FormControl>
                                <Input placeholder="TOKEN/USDC" {...field} data-testid="input-pair-custom" />
                              </FormControl>
                              <Button type="button" variant="outline" size="sm" onClick={() => setCustomPair(false)} className="shrink-0 text-xs">
                                Pilih
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Select onValueChange={(v) => { field.onChange(v); }} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-pair">
                                    <SelectValue placeholder="Pilih pair" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {COMMON_PAIRS.map((p) => (
                                    <SelectItem key={p} value={p}>{p}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button type="button" variant="outline" size="sm" onClick={() => setCustomPair(true)} className="shrink-0 text-xs">
                                Manual
                              </Button>
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Order Type */}
                  <FormField
                    control={form.control}
                    name="orderType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Order</FormLabel>
                        <div className="grid grid-cols-3 gap-3">
                          {(Object.entries(ORDER_TYPE_INFO) as [keyof typeof ORDER_TYPE_INFO, typeof ORDER_TYPE_INFO[keyof typeof ORDER_TYPE_INFO]][]).map(([value, cfg]) => {
                            const Icon = cfg.icon;
                            const isSelected = field.value === value;
                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => field.onChange(value)}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-md border text-sm transition-all ${
                                  isSelected
                                    ? `border-primary bg-primary/10 ${cfg.color}`
                                    : "border-border hover:border-primary/40 text-muted-foreground"
                                }`}
                                data-testid={`button-ordertype-${value}`}
                              >
                                <Icon className="h-5 w-5" />
                                <span className="font-medium text-xs">{cfg.label.split(" ")[0]}</span>
                              </button>
                            );
                          })}
                        </div>
                        {selectedOrderInfo && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5">
                            <OrderIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${selectedOrderInfo.color}`} />
                            {selectedOrderInfo.desc}
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Range Harga */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Range Harga</span>
                      {currentMarket && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          onClick={handleAutoFillPrice}
                          data-testid="button-autofill-price"
                        >
                          <Zap className="h-3 w-3" />
                          Isi dari API (${currentMarket.price.toLocaleString()})
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="lowerPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Harga Bawah ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" {...field} data-testid="input-lower-price" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="upperPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Harga Atas ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="any" {...field} data-testid="input-upper-price" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {currentMarket && (
                      <p className="text-xs text-muted-foreground font-mono">
                        24h: Low ${currentMarket.low24h.toLocaleString()} – High ${currentMarket.high24h.toLocaleString()} &nbsp;|&nbsp; Volume ${(currentMarket.volume24h / 1e6).toFixed(1)}M
                      </p>
                    )}
                  </div>

                  {/* Grid + Modal */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gridCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jumlah Grid</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} data-testid="input-grid-count" />
                          </FormControl>
                          <FormDescription className="text-xs">Min. 2 grid</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="investmentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Modal (USDC)</FormLabel>
                          <FormControl>
                            <Input type="number" step="any" {...field} data-testid="input-investment" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Execution Mode */}
                  <FormField
                    control={form.control}
                    name="executionMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Gauge className="h-4 w-4 text-muted-foreground" />
                          Execution Mode
                        </FormLabel>
                        <div className="grid grid-cols-3 gap-3">
                          {([
                            { value: "aggressive", label: "Aggressive", desc: "Refresh cepat, spread ketat, volume tinggi", color: "text-chart-3" },
                            { value: "normal",     label: "Normal",     desc: "Seimbang antara kecepatan dan kualitas fill", color: "text-primary" },
                            { value: "passive",    label: "Passive",    desc: "Spread lebar, fee lebih rendah, fill lebih sedikit", color: "text-chart-2" },
                          ] as const).map(({ value, label, desc, color }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => field.onChange(value)}
                              className={`flex flex-col gap-1 p-3 rounded-md border text-left text-sm transition-all ${
                                field.value === value
                                  ? `border-primary bg-primary/10 ${color}`
                                  : "border-border hover:border-primary/40 text-muted-foreground"
                              }`}
                            >
                              <span className="font-semibold text-xs">{label}</span>
                              <span className="text-[11px] leading-tight">{desc}</span>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Rerange Mode */}
                  <FormField
                    control={form.control}
                    name="rerangeMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Mode Auto-Rerange
                          {field.value === "aggressive" && (
                            <Tooltip>
                              <TooltipTrigger type="button">
                                <Info className="h-4 w-4 text-chart-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Cocok untuk pasar volatile. Di on-chain, pantau biaya transaksi.</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-rerange-mode">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="off">Off (Manual saja)</SelectItem>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="moderate">Moderate</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Budget Stop */}
                  <FormField
                    control={form.control}
                    name="budgetStop"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <ShieldOff className="h-4 w-4 text-muted-foreground" />
                          Budget Stop (opsional)
                          <Tooltip>
                            <TooltipTrigger type="button">
                              <Info className="h-3.5 w-3.5 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Bot otomatis berhenti jika PnL rugi melebihi jumlah ini.</p>
                            </TooltipContent>
                          </Tooltip>
                        </FormLabel>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                          <FormControl>
                            <Input
                              type="number"
                              step="any"
                              placeholder="Contoh: 50"
                              className="pl-7"
                              value={field.value ?? ""}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : e.target.value)}
                            />
                          </FormControl>
                        </div>
                        <FormDescription className="text-xs">
                          Kosongkan jika tidak ingin ada batas kerugian otomatis.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4 border-t border-border flex justify-end">
                    <Button type="submit" disabled={createBot.isPending} data-testid="button-submit">
                      {createBot.isPending ? "Mendeploy..." : "Deploy Grid Bot"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-4">
          {/* Rerange Mode Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Konfigurasi Mode Rerange</CardTitle>
              <CardDescription className="text-xs">Parameter tiap mode auto-rerange.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Mode</TableHead>
                    <TableHead className="text-xs">Threshold</TableHead>
                    <TableHead className="text-xs">Cooldown</TableHead>
                    <TableHead className="text-xs">Max/Hari</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { mode: "off", label: "Off", color: "text-muted-foreground", threshold: "—", cooldown: "—", max: "—" },
                    { mode: "conservative", label: "Conservative", color: "text-primary", threshold: "Keluar range", cooldown: "2 jam", max: "3x" },
                    { mode: "moderate", label: "Moderate", color: "text-chart-4", threshold: "50% ke tepi", cooldown: "2 jam", max: "3x" },
                    { mode: "aggressive", label: "Aggressive", color: "text-chart-3", threshold: "30% ke tepi", cooldown: "1 jam", max: "5x" },
                  ].map(({ mode, label, color, threshold, cooldown, max }) => (
                    <TableRow key={mode} className={watchedRerangeMode === mode ? "bg-muted/30" : ""}>
                      <TableCell className={`font-medium ${color}`}>{label}</TableCell>
                      <TableCell>{threshold}</TableCell>
                      <TableCell>{cooldown}</TableCell>
                      <TableCell>{max}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Order Type Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Penjelasan Tipe Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              {(Object.entries(ORDER_TYPE_INFO) as [keyof typeof ORDER_TYPE_INFO, typeof ORDER_TYPE_INFO[keyof typeof ORDER_TYPE_INFO]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={key} className="flex gap-2">
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />
                    <div>
                      <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <p className="mt-0.5">{cfg.desc}</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
