import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, Filter } from "lucide-react";
import * as XLSX from 'xlsx';

interface SkuLabelSummary {
  area: string;
  sku: string;
  total_labels_purchased: number;
  labels_used: number;
  labels_available: number;
  total_amount_spent: number;
  last_purchase_date: string;
}

const LabelAvailability = () => {
  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [sortField, setSortField] = React.useState<keyof SkuLabelSummary>("sku");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("asc");

  // Fetch all label purchases
  const { data: labelPurchases, isLoading: isLoadingPurchases } = useQuery({
    queryKey: ["label-purchases-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("label_purchases")
        .select("*")
        .order("purchase_date", { ascending: false });
      
      if (error) {
        console.error("Error fetching label purchases:", error);
        return [];
      }
      
      return data || [];
    },
  });

  // Fetch customers separately
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers-for-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("is_active", true)
        .order("dealer_name", { ascending: true });
      
      if (error) {
        console.error("Error fetching customers:", error);
        return [];
      }
      
      return data || [];
    },
  });

  // Fetch sales transactions
  const { data: salesTransactions, isLoading: isLoadingSales } = useQuery({
    queryKey: ["sales-transactions-for-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("*")
        .not("customer_id", "is", null)
        .not("sku", "is", null);
      
      if (error) {
        console.error("Error fetching sales transactions:", error);
        return [];
      }
      
      return data || [];
    },
  });

  // Fetch factory pricing to get bottles_per_case for each SKU
  const { data: factoryPricing } = useQuery({
    queryKey: ["factory-pricing-for-availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factory_pricing")
        .select("sku, bottles_per_case")
        .order("pricing_date", { ascending: false });
      
      if (error) {
        console.error("Error fetching factory pricing:", error);
        return [];
      }
      
      // Get the latest bottles_per_case for each SKU
      const skuMap = new Map<string, number>();
      data?.forEach((item) => {
        if (item.sku && item.bottles_per_case && !skuMap.has(item.sku)) {
          skuMap.set(item.sku, item.bottles_per_case);
        }
      });
      
      return skuMap;
    },
  });

  // Get available SKUs from customers table
  const getAvailableSKUs = React.useCallback(() => {
    if (!customers) return [];
    
    const seenSKUs = new Set<string>();
    const uniqueSKUs: string[] = [];
    
    customers.forEach(customer => {
      if (customer.sku && customer.sku.trim() !== '') {
        const trimmedSKU = customer.sku.trim();
        if (!seenSKUs.has(trimmedSKU)) {
          seenSKUs.add(trimmedSKU);
          uniqueSKUs.push(trimmedSKU);
        }
      }
    });
    
    return uniqueSKUs.sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const isLoading = isLoadingPurchases || isLoadingCustomers || isLoadingSales;

  // Calculate SKU-only summaries (global across all dealers/areas)
  const clientSummaries: SkuLabelSummary[] = React.useMemo(() => {
    const summaryMap = new Map<string, SkuLabelSummary>();
    const availableSKUs = new Set<string>(getAvailableSKUs());

    labelPurchases?.forEach((purchase) => {
      if (!purchase?.sku) return;
      const sku = String(purchase.sku).trim();
      if (!sku) return;
      availableSKUs.add(sku);

      const existing = summaryMap.get(sku);
      if (existing) {
        existing.total_labels_purchased += purchase.quantity || 0;
        existing.total_amount_spent += purchase.total_amount || 0;
        if (purchase.purchase_date && new Date(purchase.purchase_date) > new Date(existing.last_purchase_date)) {
          existing.last_purchase_date = purchase.purchase_date;
        }
      } else {
        summaryMap.set(sku, {
          area: "",
          sku,
          total_labels_purchased: purchase.quantity || 0,
          labels_used: 0,
          labels_available: 0,
          total_amount_spent: purchase.total_amount || 0,
          last_purchase_date: purchase.purchase_date || new Date().toISOString(),
        });
      }
    });

    salesTransactions?.forEach((sale) => {
      if (!sale?.sku || sale.transaction_type !== "sale") return;
      const sku = String(sale.sku).trim();
      if (!sku || sku.toLowerCase() === "payment") return;
      availableSKUs.add(sku);

      const bottlesPerCase = factoryPricing?.get(sku) || 1;
      const labelsUsedThisSale = (sale.quantity || 0) * bottlesPerCase;
      const existing = summaryMap.get(sku);
      if (existing) {
        existing.labels_used += labelsUsedThisSale;
      } else {
        summaryMap.set(sku, {
          area: "",
          sku,
          total_labels_purchased: 0,
          labels_used: labelsUsedThisSale,
          labels_available: -labelsUsedThisSale,
          total_amount_spent: 0,
          last_purchase_date: sale.transaction_date || new Date().toISOString(),
        });
      }
    });

    const summaries = Array.from(availableSKUs).map((sku) => {
      const summary = summaryMap.get(sku) || {
        area: "",
        sku,
        total_labels_purchased: 0,
        labels_used: 0,
        labels_available: 0,
        total_amount_spent: 0,
        last_purchase_date: new Date().toISOString(),
      };
      return {
        ...summary,
        labels_available: summary.total_labels_purchased - summary.labels_used,
      };
    });

    return summaries.sort((a, b) => a.sku.localeCompare(b.sku));
  }, [labelPurchases, salesTransactions, getAvailableSKUs, factoryPricing]);

  // Filter and sort the data
  const filteredAndSortedData = React.useMemo(() => {
    const filtered = clientSummaries.filter((summary) => {
      // Search filter
      const matchesSearch = 
        summary.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      let matchesStatus = true;
      if (statusFilter === "available") {
        matchesStatus = summary.labels_available > 2500;
      } else if (statusFilter === "low_stock") {
        matchesStatus = summary.labels_available > 0 && summary.labels_available <= 2500;
      } else if (statusFilter === "out_of_stock") {
        matchesStatus = summary.labels_available <= 0;
      }
      
      return matchesSearch && matchesStatus;
    });

    // Sort the filtered data
    filtered.sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      let comparison = 0;
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue;
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [clientSummaries, searchTerm, statusFilter, sortField, sortDirection]);

  // Handle sort
  const handleSort = (field: keyof SkuLabelSummary) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export to Excel
  const handleExport = () => {
    const exportData = filteredAndSortedData.map(item => ({
      'SKU': item.sku,
      'Labels Purchased': item.total_labels_purchased,
      'Labels Used': item.labels_used,
      'Labels Available': item.labels_available,
      'Last Purchase': new Date(item.last_purchase_date).toLocaleDateString(),
      'Status': item.labels_available > 2500 ? 'Available' : item.labels_available > 0 ? 'Low Stock' : item.labels_available < 0 ? 'Shortage' : 'Out of Stock'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Label Availability');
    XLSX.writeFile(wb, `label-availability-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Label Availability Summary</h3>
          {filteredAndSortedData.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Showing {filteredAndSortedData.length} of {clientSummaries.length} SKUs
            </div>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
            
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading label availability data...</p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="bg-slate-50 border-slate-200 text-slate-700 py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('sku')}
                >
                  <div className="flex items-center gap-2">
                    SKU
                    {sortField === 'sku' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="bg-slate-50 border-slate-200 text-slate-700 py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('total_labels_purchased')}
                >
                  <div className="flex items-center gap-2">
                    Labels Purchased
                    {sortField === 'total_labels_purchased' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="bg-slate-50 border-slate-200 text-slate-700 py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('labels_used')}
                >
                  <div className="flex items-center gap-2">
                    Labels Used
                    {sortField === 'labels_used' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="bg-slate-50 border-slate-200 text-slate-700 py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('labels_available')}
                >
                  <div className="flex items-center gap-2">
                    Labels Available
                    {sortField === 'labels_available' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="bg-slate-50 border-slate-200 text-slate-700 py-3 px-4 cursor-pointer hover:bg-slate-100"
                  onClick={() => handleSort('last_purchase_date')}
                >
                  <div className="flex items-center gap-2">
                    Last Purchase
                    {sortField === 'last_purchase_date' && (
                      <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="bg-slate-50 border-slate-200 text-slate-700 py-3 px-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedData.length > 0 ? (
                filteredAndSortedData.map((summary, index) => (
                    <TableRow key={`${summary.sku}_${index}`}>
                      <TableCell className="font-medium">
                        {summary.sku}
                      </TableCell>
                      <TableCell className="font-medium">
                        {summary.total_labels_purchased.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {summary.labels_used.toLocaleString()}
                      </TableCell>
                      <TableCell className={`font-medium ${summary.labels_available > 0 ? 'text-green-600' : summary.labels_available < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {summary.labels_available.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(summary.last_purchase_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          summary.labels_available > 2500
                            ? 'bg-green-100 text-green-800' 
                            : summary.labels_available > 0
                            ? 'bg-yellow-100 text-yellow-800'
                            : summary.labels_available < 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {summary.labels_available > 2500 ? 'Available' : summary.labels_available > 0 ? 'Low Stock' : summary.labels_available < 0 ? 'Shortage' : 'Out of Stock'}
                        </span>
                      </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {clientSummaries.length === 0 
                      ? "No label data found. Start by recording some label purchases in the Labels Purchase tab."
                      : "No results found matching your search criteria. Try adjusting your filters."
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabelAvailability;
