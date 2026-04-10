import { useParams, Link } from "wouter";
import { 
  useGetGridBot, 
  useListBotLogs, 
  useTriggerRerange, 
  useToggleGridBot,
  getGetGridBotQueryKey,
  getListBotLogsQueryKey,
  getGetMarketSummaryQueryKey,
  getGetBotStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Activity, Settings2, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function GridBotDetail() {
  const { id } = useParams<{ id: string }>();
  const botId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: bot, isLoading: isLoadingBot } = useGetGridBot(botId, { 
    query: { enabled: !!botId, queryKey: getGetGridBotQueryKey(botId) } 
  });
  
  const { data: logs, isLoading: isLoadingLogs } = useListBotLogs(
    { botId, limit: 50 }, 
    { query: { enabled: !!botId, queryKey: getListBotLogsQueryKey({ botId, limit: 50 }) } }
  );

  const toggleBot = useToggleGridBot();
  const triggerRerange = useTriggerRerange();

  const handleToggle = () => {
    toggleBot.mutate({ id: botId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGridBotQueryKey(botId) });
        queryClient.invalidateQueries({ queryKey: getGetMarketSummaryQueryKey() });
        toast({ title: "Bot status updated" });
      },
      onError: () => {
        toast({ title: "Failed to update bot status", variant: "destructive" });
      }
    });
  };

  const handleManualRerange = () => {
    triggerRerange.mutate({ id: botId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetGridBotQueryKey(botId) });
        queryClient.invalidateQueries({ queryKey: getListBotLogsQueryKey({ botId, limit: 50 }) });
        queryClient.invalidateQueries({ queryKey: getGetMarketSummaryQueryKey() });
        toast({ title: "Manual rerange triggered successfully" });
      },
      onError: () => {
        toast({ title: "Failed to trigger rerange", variant: "destructive" });
      }
    });
  };

  if (isLoadingBot) {
    return <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>;
  }

  if (!bot) {
    return <div className="text-center mt-20 text-muted-foreground">Bot not found</div>;
  }

  const pnlData: { time: number; pnl: number }[] = [];

  const getModeBadgeColor = (mode: string) => {
    switch (mode) {
      case "aggressive": return "bg-chart-3/20 text-chart-3 border-chart-3/50";
      case "moderate": return "bg-chart-4/20 text-chart-4 border-chart-4/50";
      case "conservative": return "bg-primary/20 text-primary border-primary/50";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/grid-bot">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{bot.name}</h1>
              <Badge variant={bot.isActive ? "default" : "secondary"}>
                {bot.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm font-mono-numbers">{bot.pair} • Created {new Date(bot.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm border border-border px-3 py-1.5 rounded-md bg-card">
            <span className="text-muted-foreground">Status</span>
            <Switch checked={bot.isActive} onCheckedChange={handleToggle} disabled={toggleBot.isPending} />
          </div>
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleManualRerange}
            disabled={triggerRerange.isPending || !bot.isActive}
          >
            <Play className="h-4 w-4 text-chart-4" />
            Force Rerange
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold font-mono-numbers ${bot.totalPnl >= 0 ? "text-chart-2" : "text-chart-3"}`}>
              {bot.totalPnl >= 0 ? "+" : "-"}${Math.abs(bot.totalPnl).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-card">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold font-mono-numbers">
              ${bot.lowerPrice} <span className="text-muted-foreground mx-1">-</span> ${bot.upperPrice}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{bot.gridCount} grids total</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono-numbers">${bot.investmentAmount}</div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="py-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rerange Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Mode</span>
              <Badge variant="outline" className={getModeBadgeColor(bot.rerangeMode)}>{bot.rerangeMode}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
              <span>Count: {bot.rerangeCount}</span>
              {bot.lastRerangeAt && <span>Last: {new Date(bot.lastRerangeAt).toLocaleTimeString()}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card className="h-[400px] flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                PnL Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              {pnlData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  PnL data not available yet — no executed trades.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pnlData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis 
                      tickFormatter={(val) => `$${val}`} 
                      axisLine={false} 
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'PnL']}
                      labelFormatter={() => ''}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pnl" 
                      stroke={bot.totalPnl >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-3))"} 
                      strokeWidth={2} 
                      dot={false}
                      activeDot={{ r: 4, fill: bot.totalPnl >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--chart-3))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="xl:col-span-1">
          <Card className="h-full flex flex-col max-h-[400px]">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Activity Logs
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pr-2">
              {isLoadingLogs ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : logs && logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="relative pl-6 pb-4 border-l border-border last:border-0 last:pb-0">
                      <div className="absolute -left-1.5 top-0 bg-background">
                        {log.eventType === 'RERANGE' ? (
                          <Settings2 className="h-3 w-3 text-primary bg-background" />
                        ) : log.eventType === 'CREATED' ? (
                          <CheckCircle2 className="h-3 w-3 text-chart-2 bg-background" />
                        ) : log.eventType === 'ERROR' ? (
                          <AlertCircle className="h-3 w-3 text-chart-3 bg-background" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted-foreground mt-0.5 ml-0.5"></div>
                        )}
                      </div>
                      <div className="-mt-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{log.eventType}</span>
                          <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{log.message}</p>
                        {log.priceAtEvent && (
                          <span className="inline-block mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">
                            @ ${log.priceAtEvent.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-center text-muted-foreground py-8">
                  No activity logs yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
