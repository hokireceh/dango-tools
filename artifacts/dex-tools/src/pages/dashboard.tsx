import { useGetMarketSummary, useGetBotStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Activity, Bot, BarChart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: marketSummary, isLoading: isLoadingMarket } = useGetMarketSummary();
  const { data: botStats, isLoading: isLoadingStats } = useGetBotStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">System overview and aggregate performance metrics.</p>
        </div>
        <Link href="/grid-bot/new">
          <Button className="gap-2">
            <Bot className="h-4 w-4" />
            New Grid Bot
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Bots</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMarket ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold font-mono-numbers">{marketSummary?.activeBots || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Out of {marketSummary?.totalBots || 0} total bots
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PnL</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMarket ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-2xl font-bold font-mono-numbers ${(marketSummary?.totalPnl || 0) >= 0 ? "text-chart-2" : "text-chart-3"}`}>
                  {(marketSummary?.totalPnl || 0) >= 0 ? "+" : "-"}${Math.abs(marketSummary?.totalPnl || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  {(marketSummary?.totalPnl || 0) >= 0 ? <ArrowUpRight className="h-3 w-3 mr-1 text-chart-2" /> : <ArrowDownRight className="h-3 w-3 mr-1 text-chart-3" />}
                  All time
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg PnL per Bot</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-2xl font-bold font-mono-numbers ${(botStats?.avgPnl || 0) >= 0 ? "text-chart-2" : "text-chart-3"}`}>
                  {(botStats?.avgPnl || 0) >= 0 ? "+" : "-"}${Math.abs(botStats?.avgPnl || 0).toFixed(2)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Auto-Reranges</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingMarket ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono-numbers">{marketSummary?.totalReranges || 0}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity Logs</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingMarket ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : marketSummary?.recentActivity && marketSummary.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {marketSummary.recentActivity.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{log.eventType} (Bot #{log.botId})</span>
                      <span className="text-muted-foreground">{log.message}</span>
                    </div>
                    <div className="text-muted-foreground text-xs text-right">
                      <div>{new Date(log.createdAt).toLocaleTimeString()}</div>
                      {log.priceAtEvent && <div>@ ${log.priceAtEvent.toFixed(2)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No recent activity</div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Bot Statistics by Mode</CardTitle>
          </CardHeader>
          <CardContent>
             {isLoadingStats ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : botStats?.byMode ? (
              <div className="space-y-4">
                {Object.entries(botStats.byMode).map(([mode, count]) => (
                  <div key={mode} className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">{mode}</span>
                    <span className="font-mono-numbers">{count as number} bots</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No stats available</div>
            )}
            
            {botStats?.topPerformer && (
              <div className="mt-6 pt-6 border-t border-border">
                <h4 className="text-sm font-semibold mb-2">Top Performer</h4>
                <div className="flex justify-between items-center text-sm">
                  <Link href={`/grid-bot/${botStats.topPerformer.id}`} className="font-medium hover:underline text-primary">
                    {botStats.topPerformer.name} ({botStats.topPerformer.pair})
                  </Link>
                  <span className="font-mono-numbers text-chart-2">+${botStats.topPerformer.totalPnl.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
