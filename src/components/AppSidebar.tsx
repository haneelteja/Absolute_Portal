import {
  BarChart3,
  DollarSign,
  Users,
  Factory,
  Truck,
  Tag,
  UserPlus,
  FileText,
  Cog,
  LogOut,
  User,
  ShoppingCart,
  Shield,
  Settings,
  MessageSquare,
  Package,
  Wrench,
  Droplets,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

interface AppSidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

interface MenuItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard",                 title: "Dashboard",            icon: BarChart3 },
  { id: "order-management",          title: "Orders",               icon: ShoppingCart },
  { id: "client-transactions",       title: "Dealer Transactions",  icon: DollarSign },
  { id: "production",                title: "Production",           icon: Factory },
  { id: "transport",                 title: "Transport",            icon: Truck },
  { id: "purchase",                  title: "Purchase",             icon: Package },
  { id: "labels",                    title: "Labels",               icon: Tag },
  { id: "machine-maintenance",       title: "Machine Maintenance",  icon: Wrench },
  { id: "configurations",            title: "Configurations",       icon: Cog },
  { id: "reports",                   title: "Reports",              icon: FileText },
  { id: "user-management",           title: "User Management",      icon: Shield,       roles: ["manager"] },
  { id: "application-configuration", title: "App Configuration",    icon: Settings,     roles: ["manager", "admin"] },
  { id: "whatsapp-configuration",    title: "WhatsApp Config",      icon: MessageSquare, roles: ["manager", "admin"] },
];

const ROLE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  admin:    { bg: "bg-red-100",    text: "text-red-700",    label: "Admin" },
  manager:  { bg: "bg-indigo-100", text: "text-indigo-700", label: "Manager" },
  employee: { bg: "bg-emerald-100",text: "text-emerald-700",label: "Employee" },
  viewer:   { bg: "bg-slate-100",  text: "text-slate-600",  label: "Viewer" },
};

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const { profile, signOut } = useAuth();

  const visibleItems = menuItems.filter((item) => {
    if (item.roles && profile?.role) return item.roles.includes(profile.role);
    return true;
  });

  const roleStyle = ROLE_STYLES[profile?.role ?? "viewer"] ?? ROLE_STYLES.viewer;
  const initials = (profile?.username || profile?.email || "U")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r-0 bg-slate-50/80">
      {/* ── Brand header ──────────────────────────────────────────── */}
      <div className="px-5 py-5 flex items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow shadow-indigo-200">
          <Droplets className="h-4 w-4 text-white" />
        </div>
        <div className="group-data-[collapsible=icon]:hidden overflow-hidden">
          <p className="text-sm font-bold tracking-tight bg-gradient-to-br from-indigo-600 to-purple-500 bg-clip-text text-transparent leading-tight">
            Absolute Industries
          </p>
          <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
            Portal
          </p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────── */}
      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {visibleItems.map((item) => {
                const active = activeView === item.id;
                return (
                  <SidebarMenuItem key={item.id}>
                    <button
                      onClick={() => setActiveView(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-150
                        group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2.5
                        ${
                          active
                            ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
                            : "text-slate-500 hover:text-indigo-600 hover:translate-x-0.5 hover:bg-indigo-50/50"
                        }
                      `}
                    >
                      <item.icon
                        className={`h-4 w-4 shrink-0 ${active ? "text-indigo-600" : "text-slate-400"}`}
                      />
                      <span className="group-data-[collapsible=icon]:hidden truncate">
                        {item.title}
                      </span>
                      {active && (
                        <span className="group-data-[collapsible=icon]:hidden ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                      )}
                    </button>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <SidebarFooter className="px-3 pb-4 space-y-1">
        {/* Divider */}
        <div className="mx-3 border-t border-slate-200/70 group-data-[collapsible=icon]:mx-0" />

        {/* User profile + sign out */}
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl group-data-[collapsible=icon]:justify-center">
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="group-data-[collapsible=icon]:hidden flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">
              {profile?.username || profile?.email || "User"}
            </p>
            <span className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full ${roleStyle.bg} ${roleStyle.text}`}>
              {roleStyle.label}
            </span>
          </div>
          <button
            onClick={signOut}
            title="Sign out"
            className="group-data-[collapsible=icon]:hidden p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Collapsed sign-out */}
        <button
          onClick={signOut}
          title="Sign out"
          className="hidden group-data-[collapsible=icon]:flex w-full justify-center p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
