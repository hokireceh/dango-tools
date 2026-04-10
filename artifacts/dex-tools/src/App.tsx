import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { MainLayout } from "@/components/layout/main-layout";
import Dashboard from "@/pages/dashboard";
import GridBots from "@/pages/grid-bots";
import GridBotForm from "@/pages/grid-bot-form";
import GridBotDetail from "@/pages/grid-bot-detail";
import Settings from "@/pages/settings";
import Login from "@/pages/login";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { ApiError } from "@workspace/api-client-react";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        localStorage.removeItem("dex_auth_token");
        localStorage.removeItem("dex_auth_expires");
        window.dispatchEvent(new Event("dex:unauthorized"));
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

function GlobalLogoutHandler() {
  const { logout } = useAuth();

  useEffect(() => {
    function onUnauthorized() {
      logout();
    }
    window.addEventListener("dex:unauthorized", onUnauthorized);
    return () => window.removeEventListener("dex:unauthorized", onUnauthorized);
  }, [logout]);

  return null;
}

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <AuthGuard>
      <MainLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/grid-bot" component={GridBots} />
          <Route path="/grid-bot/new" component={GridBotForm} />
          <Route path="/grid-bot/:id" component={GridBotDetail} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </MainLayout>
    </AuthGuard>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <GlobalLogoutHandler />
            <Switch>
              <Route path="/login" component={Login} />
              <Route>
                <ProtectedRoutes />
              </Route>
            </Switch>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
