import { useState, lazy, Suspense } from "react";
import OrderManagement from "@/components/order-management/OrderManagement";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Loader2, Bell, User } from "lucide-react";

// Lazy load route components for code splitting
const Dashboard               = lazy(() => import("@/components/dashboard/Dashboard"));
const SalesEntry              = lazy(() => import("@/components/sales/SalesEntry"));
const Production              = lazy(() => import("@/components/production/Production"));
const TransportExpenses       = lazy(() => import("@/components/transport/TransportExpenses"));
const Purchase                = lazy(() => import("@/components/purchase/Purchase"));
const Labels                  = lazy(() => import("@/components/labels/Labels"));
const MachineMaintenance      = lazy(() => import("@/components/machine-maintenance/MachineMaintenance"));
const ConfigurationManagement = lazy(() => import("@/components/configurations/ConfigurationManagement"));
const Reports                 = lazy(() => import("@/components/reports/Reports"));
const UserManagement          = lazy(() => import("@/components/user-management/UserManagement"));
const ApplicationConfigurationTab = lazy(() => import("@/components/user-management/ApplicationConfigurationTab"));
const WhatsAppConfigurationTab    = lazy(() => import("@/components/user-management/WhatsAppConfigurationTab"));

// Aether-style route loading state
const RouteLoader = () => (
  <div className="flex items-center justify-center h-full min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
      <p className="text-sm font-medium text-slate-400 tracking-wide">Loading…</p>
    </div>
  </div>
);

const ACCESS_DENIED = (role: string | undefined, feature: string) => (
  <div className="m-6">
    <Alert className="border-amber-200 bg-amber-50">
      <Shield className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <span className="font-semibold">{feature}</span> is restricted.{" "}
        Your current role <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">{role ?? "Unknown"}</span>{" "}
        does not have access.
      </AlertDescription>
    </Alert>
  </div>
);

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const { profile } = useAuth();

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Suspense fallback={<RouteLoader />}><Dashboard /></Suspense>;

      case "order-management":
        return <Suspense fallback={<RouteLoader />}><OrderManagement /></Suspense>;

      case "client-transactions":
        return <Suspense fallback={<RouteLoader />}><SalesEntry /></Suspense>;

      case "production":
        return <Suspense fallback={<RouteLoader />}><Production /></Suspense>;

      case "transport":
        return <Suspense fallback={<RouteLoader />}><TransportExpenses /></Suspense>;

      case "purchase":
        return <Suspense fallback={<RouteLoader />}><Purchase /></Suspense>;

      case "labels":
        return <Suspense fallback={<RouteLoader />}><Labels /></Suspense>;

      case "machine-maintenance":
        return <Suspense fallback={<RouteLoader />}><MachineMaintenance /></Suspense>;

      case "configurations":
        return <Suspense fallback={<RouteLoader />}><ConfigurationManagement /></Suspense>;

      case "reports":
        return <Suspense fallback={<RouteLoader />}><Reports /></Suspense>;

      case "user-management":
        if (profile?.role !== "manager")
          return ACCESS_DENIED(profile?.role, "User Management");
        return <Suspense fallback={<RouteLoader />}><UserManagement /></Suspense>;

      case "application-configuration":
        if (profile?.role !== "manager" && profile?.role !== "admin")
          return ACCESS_DENIED(profile?.role, "Application Configuration");
        return <Suspense fallback={<RouteLoader />}><ApplicationConfigurationTab /></Suspense>;

      case "whatsapp-configuration":
        if (profile?.role !== "manager" && profile?.role !== "admin")
          return ACCESS_DENIED(profile?.role, "WhatsApp Configuration");
        return <Suspense fallback={<RouteLoader />}><WhatsAppConfigurationTab /></Suspense>;

      default:
        return <Suspense fallback={<RouteLoader />}><Dashboard /></Suspense>;
    }
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-surface-bright overflow-hidden">
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />

        <div className="flex-1 flex flex-col min-w-0">
          {/* ── Top header bar ──────────────────────────────────────── */}
          <header className="sticky top-0 z-40 h-14 flex items-center gap-4 px-5
            bg-white/75 backdrop-blur-xl
            shadow-[0_1px_0_0_rgba(173,179,181,0.35)]">

            <SidebarTrigger className="text-slate-400 hover:text-indigo-600 transition-colors" />

            {/* Brand / page title */}
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight brand-gradient hidden sm:block">
                Absolute Industries Portal
              </h1>
            </div>

            {/* Right-side actions */}
            <div className="ml-auto flex items-center gap-2">
              <button className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60 transition-all active:scale-95">
                <Bell className="h-4 w-4" />
              </button>
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center cursor-pointer">
                <span className="text-[10px] font-bold text-white">
                  {(profile?.username || profile?.email || "U").slice(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
          </header>

          {/* ── Page content ────────────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
