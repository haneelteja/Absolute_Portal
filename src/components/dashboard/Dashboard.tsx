import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, memo, useCallback } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColumnFilter } from "@/components/ui/column-filter";
import { supabase } from "@/integrations/supabase/client";
import { getQueryConfig } from "@/lib/query-configs";
import { 
  DollarSign, 
  AlertTriangle, 
  TrendingUp, 
  Building2, 
  CreditCard,
  Eye,
  Phone,
  Download
} from "lucide-react";
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import ProductionInventory from "@/components/sales/ProductionInventory";

const Dashboard = memo(() => {
  const { toast } = useToast();
  
  // Filter and sort states for Client Receivables Outstanding table
  const [receivablesSearchTerm, setReceivablesSearchTerm] = useState("");
  const debouncedReceivablesSearchTerm = useDebouncedValue(receivablesSearchTerm, 300);
  const [receivablesColumnFilters, setReceivablesColumnFilters] = useState({
    client: "",
    area: "",
    totalSales: "",
    payments: "",
    outstanding: "",
    priority: "",
  });
  const [receivablesColumnSorts, setReceivablesColumnSorts] = useState<{
    [key: string]: 'asc' | 'desc' | null;
  }>({
    client: null,
    area: null,
    totalSales: null,
    payments: null,
    outstanding: null,
    priority: null,
  });

  // Fetch profit data for Profitability Summary
  const { data: profitData } = useQuery({
    queryKey: ["dashboard-profit"],
    ...getQueryConfig("dashboard-profit"),
    queryFn: async () => {
      // Get client transactions
      const { data: clientTransactions } = await supabase
        .from("sales_transactions")
        .select("amount, transaction_type");
      
      const totalSales = clientTransactions?.filter(t => t.transaction_type === 'sale')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // Get factory payables
      const { data: factoryTransactions } = await supabase
        .from("factory_payables")
        .select("amount, transaction_type");
      
      const factoryPayables = factoryTransactions?.filter(t => t.transaction_type === 'production')
        .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // Get transport expenses
      const { data: transportExpenses } = await supabase
        .from("transport_expenses")
        .select("amount");
      
      const transportTotal = transportExpenses?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
      
      // Get label expenses
      const { data: labelPurchases } = await supabase
        .from("label_purchases")
        .select("total_amount");
      
      const labelExpenses = labelPurchases?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;
      
      const profit = totalSales - (factoryPayables + transportTotal);
      
      return {
        totalSales,
        factoryPayables,
        transportExpenses: transportTotal,
        profit
      };
    },
  });

  // Pagination state for receivables table
  const [receivablesPage, setReceivablesPage] = useState(1);
  const receivablesPageSize = 25;

  // Fetch client receivables data (limited to recent transactions for performance)
  const { data: receivables } = useQuery({
    queryKey: ["receivables"],
    ...getQueryConfig("receivables"),
    queryFn: async () => {
      // Limit to last 90 days or max 2000 records for performance
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const { data: transactions } = await supabase
        .from("sales_transactions")
        .select(`
          id,
          customer_id,
          transaction_type,
          amount,
          transaction_date,
          created_at,
          customers (
            id,
            dealer_name,
            area
          )
        `)
        .gte("created_at", ninetyDaysAgo.toISOString())
        .order("created_at", { ascending: false })
        .limit(2000); // Safety limit

      if (!transactions) return [];

      // Group transactions by customer and calculate outstanding amounts chronologically
      const customerMap = new Map();
      
      transactions.forEach(transaction => {
        const customerId = transaction.customer_id;
        const customer = transaction.customers;
        
        if (!customerMap.has(customerId)) {
          customerMap.set(customerId, {
            customer,
            totalSales: 0,
            totalPayments: 0,
            transactions: []
          });
        }
        
        const customerData = customerMap.get(customerId);
        customerData.transactions.push(transaction);
        
        if (transaction.transaction_type === 'sale') {
          customerData.totalSales += transaction.amount || 0;
        } else if (transaction.transaction_type === 'payment') {
          customerData.totalPayments += transaction.amount || 0;
        }
      });

      // Calculate outstanding amounts chronologically for each customer
      const calculateCumulativeOutstanding = (
        customerTxs: Array<{
          transaction_type: 'sale' | 'payment';
          amount: number | null;
          transaction_date: string;
          created_at: string;
        }>
      ) => {
        // Sort all transactions chronologically (oldest first)
        const sortedTxs = customerTxs.sort((a, b) => {
          const dateA = new Date(a.transaction_date).getTime();
          const dateB = new Date(b.transaction_date).getTime();
          if (dateA === dateB) {
            // If same date, sort by created_at to maintain order
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }
          return dateA - dateB;
        });
        
        let cumulativeOutstanding = 0;
        sortedTxs.forEach(transaction => {
          if (transaction.transaction_type === 'sale') {
            cumulativeOutstanding += transaction.amount || 0;
          } else if (transaction.transaction_type === 'payment') {
            cumulativeOutstanding -= transaction.amount || 0;
          }
        });
        
        return cumulativeOutstanding;
      };

      // Convert to array and calculate outstanding amounts chronologically
      return Array.from(customerMap.values()).map(data => ({
        ...data,
        outstanding: calculateCumulativeOutstanding(data.transactions)
      })).filter(data => data.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
    },
  });

  // Fetch key metrics - depends on receivables being loaded
  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics", receivables],
    ...getQueryConfig("dashboard-metrics"),
    queryFn: async () => {
      // Total clients
      const { count: totalClients } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

      // Total outstanding from receivables (wait for receivables to be available)
      const totalOutstanding = receivables?.reduce((sum, r) => sum + (r.outstanding || 0), 0) || 0;

      // Factory outstanding
      const { data: factory } = await supabase
        .from("factory_payables")
        .select("amount, transaction_type");
      
      const totalProduction = factory
        ?.filter(f => f.transaction_type === "production")
        .reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
      
      const totalFactoryPayments = factory
        ?.filter(f => f.transaction_type === "payment")
        .reduce((sum, f) => sum + (f.amount || 0), 0) || 0;

      const factoryOutstanding = totalProduction - totalFactoryPayments;

      // High value customers (outstanding > 50000)
      const highValueCustomers = receivables?.filter(r => (r.outstanding || 0) > 50000).length || 0;

      // Recent transactions count (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentTransactions } = await supabase
        .from("sales_transactions")
        .select("*", { count: "exact", head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

      return {
        totalClients: totalClients || 0,
        totalOutstanding,
        factoryOutstanding,
        highValueCustomers,
        recentTransactions: recentTransactions || 0
      };
    },
    enabled: receivables !== undefined, // Only run when receivables is loaded
  });

  // Filter and sort handlers for Client Receivables Outstanding
  const handleReceivablesColumnFilterChange = useCallback((columnKey: string, value: string) => {
    setReceivablesColumnFilters(prev => ({
      ...prev,
      [columnKey]: value
    }));
  }, []);

  const handleReceivablesColumnSortChange = useCallback((columnKey: string, direction: 'asc' | 'desc' | null) => {
    setReceivablesColumnSorts(prev => {
      const newSorts = { ...prev };
      // Clear other sorts
      Object.keys(newSorts).forEach(key => {
        if (key !== columnKey) newSorts[key] = null;
      });
      newSorts[columnKey] = direction;
      return newSorts;
    });
  }, []);

  const clearAllReceivablesFilters = useCallback(() => {
    setReceivablesSearchTerm("");
    setReceivablesColumnFilters({
      client: "",
      area: "",
      totalSales: "",
      payments: "",
      outstanding: "",
      priority: "",
    });
    setReceivablesColumnSorts({
      client: null,
      area: null,
      totalSales: null,
      payments: null,
      outstanding: null,
      priority: null,
    });
  }, []);

  // Filtered and sorted Client Receivables Outstanding
  const filteredAndSortedReceivables = useMemo(() => {
    if (!receivables) return [];

    return receivables.filter(receivable => {
      // Global search (using debounced value)
      if (debouncedReceivablesSearchTerm) {
        const searchLower = debouncedReceivablesSearchTerm.toLowerCase();
        const matchesGlobalSearch = (
          receivable.customer.dealer_name?.toLowerCase().includes(searchLower) ||
          receivable.customer.area?.toLowerCase().includes(searchLower) ||
          receivable.totalSales?.toString().includes(searchLower) ||
          receivable.totalPayments?.toString().includes(searchLower) ||
          receivable.outstanding?.toString().includes(searchLower) ||
          (receivable.outstanding > 100000 ? "critical" : receivable.outstanding > 50000 ? "high" : "medium").includes(searchLower)
        );
        if (!matchesGlobalSearch) return false;
      }

      // Column filters
      if (receivablesColumnFilters.client && !receivable.customer.dealer_name?.toLowerCase().includes(receivablesColumnFilters.client.toLowerCase())) return false;
      if (receivablesColumnFilters.area && !receivable.customer.area?.toLowerCase().includes(receivablesColumnFilters.area.toLowerCase())) return false;
      if (receivablesColumnFilters.totalSales && receivable.totalSales?.toString() !== receivablesColumnFilters.totalSales) return false;
      if (receivablesColumnFilters.payments && receivable.totalPayments?.toString() !== receivablesColumnFilters.payments) return false;
      if (receivablesColumnFilters.outstanding && receivable.outstanding?.toString() !== receivablesColumnFilters.outstanding) return false;
      if (receivablesColumnFilters.priority) {
        const priority = receivable.outstanding > 100000 ? "critical" : receivable.outstanding > 50000 ? "high" : "medium";
        if (!priority.includes(receivablesColumnFilters.priority.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => {
      const activeSort = Object.entries(receivablesColumnSorts).find(([_, direction]) => direction !== null);
      if (!activeSort) {
        // Default sort by outstanding descending
        return (b.outstanding || 0) - (a.outstanding || 0);
      }

      const [columnKey, direction] = activeSort;
      let aValue: string | number | undefined;
      let bValue: string | number | undefined;

      switch (columnKey) {
        case 'client':
          aValue = a.customer.dealer_name || '';
          bValue = b.customer.dealer_name || '';
          break;
        case 'area':
          aValue = a.customer.area || '';
          bValue = b.customer.area || '';
          break;
        case 'totalSales':
          aValue = a.totalSales || 0;
          bValue = b.totalSales || 0;
          break;
        case 'payments':
          aValue = a.totalPayments || 0;
          bValue = b.totalPayments || 0;
          break;
        case 'outstanding':
          aValue = a.outstanding || 0;
          bValue = b.outstanding || 0;
          break;
        case 'priority':
          aValue = a.outstanding > 100000 ? 3 : a.outstanding > 50000 ? 2 : 1;
          bValue = b.outstanding > 100000 ? 3 : b.outstanding > 50000 ? 2 : 1;
          break;
        default:
          return 0;
      }

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (direction === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [receivables, debouncedReceivablesSearchTerm, receivablesColumnFilters, receivablesColumnSorts]);

  // Paginated receivables for display
  const paginatedReceivables = useMemo(() => {
    const startIndex = (receivablesPage - 1) * receivablesPageSize;
    const endIndex = startIndex + receivablesPageSize;
    return filteredAndSortedReceivables.slice(startIndex, endIndex);
  }, [filteredAndSortedReceivables, receivablesPage, receivablesPageSize]);

  const receivablesTotalPages = Math.ceil(filteredAndSortedReceivables.length / receivablesPageSize);

  // Export Client Receivables Outstanding to Excel
  const exportReceivablesToExcel = useCallback(() => {
    if (!filteredAndSortedReceivables || filteredAndSortedReceivables.length === 0) {
      toast({
        title: "No Data",
        description: "No receivables to export.",
        variant: "destructive",
      });
      return;
    }

    const exportData = filteredAndSortedReceivables.map(receivable => ({
      'Client': receivable.customer.dealer_name || '',
      'Branch': receivable.customer.area || 'N/A',
      'Total Sales': receivable.totalSales || 0,
      'Payments': receivable.totalPayments || 0,
      'Outstanding': receivable.outstanding || 0,
      'Priority': receivable.outstanding > 100000 ? 'Critical' : receivable.outstanding > 50000 ? 'High' : 'Medium',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Client Receivables');
    
    const fileName = `Client_Receivables_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: "Success",
      description: `Exported ${exportData.length} receivables to ${fileName}`,
    });
  }, [filteredAndSortedReceivables, toast]);

  // Derived collection-rate values (computed once, used in card)
  const collectionRate = (() => {
    if (!receivables?.length || !metrics) return null;
    const totalSales = receivables.reduce((sum, r) => sum + (r.totalSales || 0), 0);
    const rate = totalSales > 0
      ? Math.round(((totalSales - (metrics.totalOutstanding || 0)) / totalSales) * 100)
      : 0;
    return { rate, good: rate >= 70 };
  })();

  const criticalCount = receivables?.filter((r) => r.outstanding > 100_000).length ?? 0;
  const profitPositive = (profitData?.profit ?? 0) >= 0;

  return (
    <div className="bg-surface-bright p-6 space-y-8">

      {/* ── Page heading ─────────────────────────────────────────────── */}
      <header>
        <p className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1">
          Operations Overview
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-on-surface">
          Dashboard
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Financial summary and receivables at a glance.
        </p>
      </header>

      {/* ── KPI bento grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Total Sales */}
        <div className="glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Sales
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-on-surface">
              ₹{(profitData?.totalSales ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Total sales (90 days)</p>
          </div>
        </div>

        {/* Factory Costs */}
        <div className="glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Factory
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-on-surface">
              ₹{(profitData?.factoryPayables ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Production costs</p>
          </div>
        </div>

        {/* Transport */}
        <div className="glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Eye className="h-5 w-5 text-amber-500" />
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Transport
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-on-surface">
              ₹{(profitData?.transportExpenses ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Logistics expenses</p>
          </div>
        </div>

        {/* Net Profit */}
        <div className={`glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4`}>
          <div className="flex items-start justify-between">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${profitPositive ? "bg-indigo-50" : "bg-red-50"}`}>
              <DollarSign className={`h-5 w-5 ${profitPositive ? "text-indigo-500" : "text-red-500"}`} />
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              profitPositive ? "text-indigo-600 bg-indigo-50" : "text-red-600 bg-red-50"
            }`}>
              Profit
            </span>
          </div>
          <div>
            <p className={`text-2xl font-bold tracking-tight ${profitPositive ? "text-indigo-600" : "text-red-600"}`}>
              ₹{(profitData?.profit ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Net margin</p>
          </div>
        </div>

        {/* Client Outstanding */}
        <div className="glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-rose-400" />
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Receivables
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-on-surface">
              ₹{(metrics?.totalOutstanding ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Pending from clients</p>
          </div>
        </div>

        {/* Factory Outstanding */}
        <div className="glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-violet-400" />
            </div>
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Factory
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-on-surface">
              ₹{(metrics?.factoryOutstanding ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Elma factory payable</p>
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="w-11 h-11 rounded-2xl bg-orange-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            </div>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Alerts
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight text-on-surface">{criticalCount}</p>
            <div className="flex items-center gap-1.5 mt-1">
              {criticalCount > 0 ? (
                <AlertTriangle className="h-3 w-3 text-orange-400" />
              ) : (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              )}
              <p className="text-xs text-on-surface-variant font-medium">
                {criticalCount > 0 ? "Outstanding > ₹1 Lakh" : "No critical alerts"}
              </p>
            </div>
          </div>
        </div>

        {/* Collection Rate */}
        <div className="glass-card rounded-xl p-6 shadow-glass hover:-translate-y-0.5 hover:shadow-glass-lg transition-all duration-200 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              collectionRate?.good !== false ? "bg-sky-50" : "bg-rose-50"
            }`}>
              <Phone className={`h-5 w-5 ${collectionRate?.good !== false ? "text-sky-400" : "text-rose-400"}`} />
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
              collectionRate?.good !== false
                ? "text-sky-600 bg-sky-50"
                : "text-rose-600 bg-rose-50"
            }`}>
              Collection
            </span>
          </div>
          <div>
            <p className={`text-2xl font-bold tracking-tight ${
              collectionRate?.good !== false ? "text-sky-600" : "text-rose-600"
            }`}>
              {collectionRate?.rate ?? 0}%
            </p>
            <p className="text-xs text-on-surface-variant mt-1 font-medium">Payment efficiency</p>
          </div>
        </div>

      </div>

      {/* ── Production inventory ──────────────────────────────────────── */}
      <ProductionInventory />
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;