import { useListGridBots, useDeleteGridBot, useToggleGridBot, getListGridBotsQueryKey, getGetMarketSummaryQueryKey, getGetBotStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Settings2, ExternalLink, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type OrderType = "long" | "short" | "neutral";

const ORDER_TYPE_CONFIG: Record<OrderType, { label: string; icon: typeof TrendingUp; className: string }> = {
  long: { label: "Long", icon: TrendingUp, className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  short: { label: "Short", icon: TrendingDown, className: "bg-red-500/15 text-red-400 border-red-500/40" },
  neutral: { label: "Neutral", icon: Minus, className: "bg-slate-500/15 text-slate-400 border-slate-500/40" },
};

const MODE_BADGE: Record<string, string> = {
  aggressive: "bg-chart-3/20 text-chart-3 border-chart-3/50",
  moderate: "bg-chart-4/20 text-chart-4 border-chart-4/50",
  conservative: "bg-primary/20 text-primary border-primary/50",
  off: "bg-muted text-muted-foreground",
};

export default function GridBots() {
  const { data: bots, isLoading } = useListGridBots();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const toggleBot = useToggleGridBot();
  const deleteBot = useDeleteGridBot();

  const handleToggle = (id: number) => {
    toggleBot.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGridBotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMarketSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBotStatsQueryKey() });
        toast({ title: "Status bot diperbarui" });
      },
      onError: () => {
        toast({ title: "Gagal mengubah status bot", variant: "destructive" });
      }
    });
  };

  const handleDelete = (id: number) => {
    deleteBot.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGridBotsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMarketSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetBotStatsQueryKey() });
        toast({ title: "Bot dihapus" });
      },
      onError: () => {
        toast({ title: "Gagal menghapus bot", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6" data-testid="grid-bots-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grid Bots</h1>
          <p className="text-muted-foreground text-sm">Kelola dan pantau grid trading aktif kamu.</p>
        </div>
        <Link href="/grid-bot/new">
          <Button className="gap-2" data-testid="button-create-bot">
            <Plus className="h-4 w-4" />
            Buat Bot
          </Button>
        </Link>
      </div>

      <div className="border border-border rounded-md overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Status</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead>Tipe Order</TableHead>
              <TableHead>Range Harga</TableHead>
              <TableHead>Grid</TableHead>
              <TableHead>Modal</TableHead>
              <TableHead>Mode Rerange</TableHead>
              <TableHead className="text-right">PnL</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : bots && bots.length > 0 ? (
              bots.map((bot) => {
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
                    <TableCell className={`text-right font-mono font-semibold ${bot.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`} data-testid={`text-pnl-${bot.id}`}>
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
              <TableRow>
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  Belum ada bot. Buat satu untuk mulai trading.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
