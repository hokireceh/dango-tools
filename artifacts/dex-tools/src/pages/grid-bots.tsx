import { useState } from "react";
import { useListGridBots, useDeleteGridBot, useToggleGridBot, useGetMarketSummary, getListGridBotsQueryKey, getGetMarketSummaryQueryKey, getGetBotStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Settings2, ExternalLink, TrendingUp, TrendingDown, Minus, Activity, Bot, BarChart3, Link2, RefreshCw } from "lucide-react";

type OrderType = "long" | "short" | "neutral";
type FilterTab = "all" | "active" | "inactive";

const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; icon: typeof TrendingUp; className: string }> = {
  long:    { label: "Long",    icon: TrendingUp,   className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  short:   { label: "Short",   icon: TrendingDown,  className: "bg-red-500/15 text-red-400 border-red-500/40" },
  neutral: { label: "Neutral", icon: Minus,         className: "bg-slate-500/15 text-slate-400 border-slate-500/40" },
};

const MODE_BADGE: Record<string, string> = {
  aggressive:   "bg-chart-3/20 text-chart-3 border-chart-3/50",
  moderate:     "bg-chart-4/20 text-chart-4 border-chart-4/50",
  conservative: "bg-primary/20 text-primary border-primary/50",
  off:          "bg-muted text-muted-foreground",
};

export default function GridBots() {
  const [filter, setFilter] = useState<FilterTab>("all");

  const { data: bots, isLoading } = useListGridBots();
  const { data: marketSummary, isLoading: isLoadingStats } = useGetMarketSummary();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleBot = useToggleGridBot();
  const deleteBot = useDeleteGridBot();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListGridBotsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMarketSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetBotStatsQueryKey() });
  };

  const handleToggle = (id: number) => {
    toggleBot.mutate({ id }, {
      onSuccess: () => { invalidateAll(); toast({ title: "Status bot diperbarui" }); },
      onError:   () => { toast({ title: "Gagal mengubah status bot", variant: "destructive" }); },
    });
  };

  const handleDelete = (id: number) => {
    deleteBot.mutate({ id }, {
      onSuccess: () => { invalidateAll(); toast({ title: "Bot dihapus" }); },
      onError:   () => { toast({ title: "Gagal menghapus bot", variant: "destructive" }); },
    });
  };

  const filteredBots = (bots ?? []).filter((b) => {
    if (filter === "active")   return b.isActive;
    if (filter === "inactive") return !b.isActive;
    return true;
  });

  const totalBots   = bots?.length ?? 0;
  const activeBots  = bots?.filter((b) => b.isActive).length ?? 0;
  const totalPnl    = bots?.reduce((sum, b) => sum + Number(b.totalPnl), 0) ?? 0;
  const totalReranges = marketSummary?.totalReranges ?? 0;

  const TABS: { key: FilterTab; label: string; count: number }[] = [
    { key: "all",      label: "Semua",   count: totalBots },
    { key: "active",   label: "Aktif",   count: activeBots },
    { key: "inactive", label: "Nonaktif", count: totalBots - activeBots },
  ];

  return (
    <div className="space-y-6" data-testid="grid-bots-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trading Bots</h1>
          <p className="text-muted-foreground text-sm">Buat dan kelola strategi grid trading otomatis kamu.</p>
        </div>
        <Link href="/grid-bot/new">
          <Button className="gap-2" data-testid="button-create-bot">
            <Plus className="h-4 w-4" />
            Buat Bot
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="bg-card/60">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Active Bots</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <p className="text-2xl font-bold font-mono-numbers">{activeBots}</p>
                )}
                {!isLoading && <p className="text-xs text-muted-foreground mt-0.5">dari {totalBots} bot</p>}
              </div>
              <Activity className="h-4 w-4 text-muted-foreground mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total PnL</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-20" />
                ) : (
                  <p className={`text-2xl font-bold font-mono-numbers ${totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toFixed(2)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">All time</p>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Rerange</p>
                {isLoadingStats ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <p className="text-2xl font-bold font-mono-numbers">{totalReranges}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Auto-triggered</p>
              </div>
              <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/60">
          <CardContent className="pt-5 pb-4 px-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Bot</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <p className="text-2xl font-bold font-mono-numbers">{totalBots}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Dibuat</p>
              </div>
              <Bot className="h-4 w-4 text-muted-foreground mt-0.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs + table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Bot Kamu</p>
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {!isLoading && (
                  <span className={`ml-1.5 text-[10px] ${filter === tab.key ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Status</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Pair</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Range Harga</TableHead>
                <TableHead>Grid</TableHead>
                <TableHead>Modal</TableHead>
                <TableHead>Rerange</TableHead>
                <TableHead className="text-right">PnL</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredBots.length > 0 ? (
                filteredBots.map((bot) => {
                  const orderCfg = ORDER_TYPE_CONFIG[(bot.orderType as OrderType) ?? "neutral"];
                  const OrderIcon = orderCfg.icon;
                  return (
                    <TableRow key={bot.id} className="group cursor-default" data-testid={`row-bot-${bot.id}`}>
                      <TableCell>
                        <Switch
                          checked={bot.isActive}
                          onCheckedChange={() => handleToggle(bot.id)}
                          disabled={toggleBot.isPending}
                          data-testid={`switch-bot-${bot.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link href={`/grid-bot/${bot.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
                          {bot.name}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{bot.pair}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`gap-1 ${orderCfg.className}`} data-testid={`badge-ordertype-${bot.id}`}>
                          <OrderIcon className="h-3 w-3" />
                          {orderCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        ${Number(bot.lowerPrice).toLocaleString()} – ${Number(bot.upperPrice).toLocaleString()}
                      </TableCell>
                      <TableCell>{bot.gridCount}</TableCell>
                      <TableCell className="font-mono">${Number(bot.investmentAmount).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={MODE_BADGE[bot.rerangeMode] ?? MODE_BADGE.off}>
                          {bot.rerangeMode}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-semibold ${bot.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}
                        data-testid={`text-pnl-${bot.id}`}
                      >
                        {bot.totalPnl >= 0 ? "+" : ""}${Number(bot.totalPnl).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Link href={`/grid-bot/${bot.id}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-edit-${bot.id}`}>
                            <Settings2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10" data-testid={`button-delete-${bot.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus {bot.name}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Bot dan semua log aktivitasnya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(bot.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Hapus Bot
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                /* Empty state */
                <TableRow>
                  <TableCell colSpan={10}>
                    <div className="flex flex-col items-center gap-4 py-14">
                      <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
                        <Activity className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-sm">
                          {filter !== "all" ? `Tidak ada bot ${filter === "active" ? "aktif" : "nonaktif"}` : "Belum ada bot"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                          {filter !== "all"
                            ? "Coba pilih filter lain."
                            : "Hubungkan session key Dango kamu, lalu buat bot trading pertamamu."}
                        </p>
                      </div>
                      {filter === "all" && (
                        <div className="flex items-center gap-2">
                          <Link href="/settings">
                            <Button variant="outline" size="sm" className="gap-2">
                              <Link2 className="h-3.5 w-3.5" />
                              Hubungkan Akun
                            </Button>
                          </Link>
                          <Link href="/grid-bot/new">
                            <Button size="sm" className="gap-2">
                              <Plus className="h-3.5 w-3.5" />
                              Buat Bot
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
