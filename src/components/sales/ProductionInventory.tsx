/**
 * Production Inventory Summary
 * Shows inventory per SKU: total production - recorded sales
 * Replaces Label Availability in Dealer Transactions
 */

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package } from "lucide-react";

interface InventoryBySku {
  sku: string;
  production: number;
  sales: number;
  inventory: number;
}

const ProductionInventory = () => {
  const { data: productionRecords = [] } = useQuery({
    queryKey: ["production-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("production")
        .select("sku, no_of_cases")
        .order("production_date", { ascending: false });
      if (error) throw error;
      return (data || []) as { sku: string; no_of_cases: number }[];
    },
  });

  const { data: salesRecords = [] } = useQuery({
    queryKey: ["sales-transactions-for-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_transactions")
        .select("sku, quantity")
        .eq("transaction_type", "sale")
        .not("sku", "is", null);
      if (error) throw error;
      return (data || []) as { sku: string; quantity: number | null }[];
    },
  });

  const inventoryBySku: InventoryBySku[] = useMemo(() => {
    const productionMap = new Map<string, number>();
    productionRecords.forEach((r) => {
      const cur = productionMap.get(r.sku) ?? 0;
      productionMap.set(r.sku, cur + (r.no_of_cases || 0));
    });

    const salesMap = new Map<string, number>();
    salesRecords.forEach((r) => {
      if (r.sku) {
        const cur = salesMap.get(r.sku) ?? 0;
        salesMap.set(r.sku, cur + (r.quantity || 0));
      }
    });

    const allSkus = new Set([...productionMap.keys(), ...salesMap.keys()]);
    return Array.from(allSkus)
      .map((sku) => ({
        sku,
        production: productionMap.get(sku) ?? 0,
        sales: salesMap.get(sku) ?? 0,
        inventory: (productionMap.get(sku) ?? 0) - (salesMap.get(sku) ?? 0),
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [productionRecords, salesRecords]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5 text-emerald-600" />
        <h3 className="text-lg font-semibold">Production Inventory (Production − Sales)</h3>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">SKU</TableHead>
              <TableHead className="text-right font-semibold">Production (cases)</TableHead>
              <TableHead className="text-right font-semibold">Sales (cases)</TableHead>
              <TableHead className="text-right font-semibold">Inventory (cases)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventoryBySku.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No production or sales data yet
                </TableCell>
              </TableRow>
            ) : (
            inventoryBySku.map((row) => (
              <TableRow key={row.sku}>
                <TableCell>{row.sku}</TableCell>
                <TableCell className="text-right">{row.production.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.sales.toLocaleString()}</TableCell>
                <TableCell
                  className={`text-right font-medium ${
                    row.inventory < 0 ? "text-red-600" : row.inventory === 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {row.inventory.toLocaleString()}
                </TableCell>
              </TableRow>
            ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProductionInventory;
