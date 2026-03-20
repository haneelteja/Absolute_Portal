import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { log } from "@/lib/logger";

import PortalRouter from "@/components/PortalRouter";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import SupabaseVerify from "./pages/SupabaseVerify";
import NotFound from "./pages/NotFound";
import ErrorBoundary from "@/components/ErrorBoundary";
import EmbeddedOrderManagement from "@/components/order-management/EmbeddedOrderManagement";
import MinimalTest from "@/pages/MinimalTest";

// ─── React Query client with global error logging ─────────────────────────────
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      log.error(
        "React Query fetch failed",
        {
          layer: "API",
          component: "QueryCache",
          fn: String(query.queryKey[0] ?? "unknown"),
          endpoint: query.queryKey.slice(1).join("/") || undefined,
        },
        error
      );
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      log.error(
        "React Query mutation failed",
        {
          layer: "API",
          component: "MutationCache",
          fn: mutation.options.mutationKey?.join("/") ?? "unknown mutation",
        },
        error
      );
    },
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <ErrorBoundary componentName="App">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <SidebarProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify" element={<SupabaseVerify />} />
                <Route path="/" element={<PortalRouter />} />
                <Route
                  path="/embedded-order-management"
                  element={
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <EmbeddedOrderManagement />
                    </React.Suspense>
                  }
                />
                <Route path="/minimal-test" element={<MinimalTest />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </SidebarProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
