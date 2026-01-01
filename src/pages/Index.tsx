import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Dashboard from "@/components/dashboard/Dashboard";
import SalesEntry from "@/components/sales/SalesEntry";
import FactoryPayables from "@/components/factory/FactoryPayables";
import TransportExpenses from "@/components/transport/TransportExpenses";
import Labels from "@/components/labels/Labels";
import ConfigurationManagement from "@/components/configurations/ConfigurationManagement";
import Reports from "@/components/reports/Reports";
import Adjustments from "@/components/adjustments/Adjustments";
import UserManagement from "@/components/user-management/UserManagement";
import OrderManagement from "@/components/order-management/OrderManagement";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield } from "lucide-react";

const Index = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const { profile } = useAuth();

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "order-management":
        return <OrderManagement />;
      case "client-transactions":
        return <SalesEntry />;
      case "factory":
        return <FactoryPayables />;
      case "transport":
        return <TransportExpenses />;
      case "labels":
        return <Labels />;
      case "configurations":
        return <ConfigurationManagement />;
      case "reports":
        return <Reports />;
      case "adjustments":
        // Only allow managers to access adjustments
        if (profile?.role !== 'manager') {
          return (
            <Alert className="m-6">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Access denied. The Adjustments tab is only available to users with Manager role.
                Your current role: {profile?.role || 'Unknown'}
              </AlertDescription>
            </Alert>
          );
        }
        return <Adjustments />;
      case "user-management":
        // Only allow managers to access user management
        if (profile?.role !== 'manager') {
          return (
            <Alert className="m-6">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Access denied. The User Management tab is only available to users with Manager role.
                Your current role: {profile?.role || 'Unknown'}
              </AlertDescription>
            </Alert>
          );
        }
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-card px-4">
            <SidebarTrigger className="mr-4" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Sales Operations Portal - Aamodha Enterprises
              </h1>
            </div>
          </header>

          <main className="flex-1 p-6 bg-background">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;