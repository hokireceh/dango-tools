import { Link, useLocation } from "wouter";
import { Activity, LayoutDashboard, Settings, Plus, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/grid-bot", label: "Grid Bots", icon: Activity },
    { href: "/grid-bot/new", label: "New Bot", icon: Plus },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
            <BarChart2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">Dango<span className="text-primary">DEX</span></span>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {links.map((link) => {
            const isActive = location === link.href || (link.href !== "/" && location.startsWith(link.href));
            return (
              <li key={link.href}>
                <Link href={link.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground cursor-pointer",
                      isActive ? "bg-sidebar-accent text-sidebar-accent-foreground border border-primary/20" : "text-muted-foreground"
                    )}
                  >
                    <link.icon className={cn("h-4 w-4", isActive ? "text-primary" : "")} />
                    {link.label}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground flex items-center justify-between">
          <span>Terminal v1.0</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span> Connected</span>
        </div>
      </div>
    </div>
  );
}
