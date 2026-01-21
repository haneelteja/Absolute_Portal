import React, { useMemo, useCallback, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Send } from "lucide-react";
import * as XLSX from "xlsx";

interface OrderRow {
  id: string;
  client: string;
  branch: string;
  sku: string;
  number_of_cases: number;
  tentative_delivery_date: string;
  status: "pending" | "dispatched";
  created_at: string;
  updated_at: string;
  client_name?: string;
}

interface DispatchRow {
  id: string;
  client: string;
  branch: string;
  sku: string;
  cases: number;
  delivery_date: string;
}

const OrderManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state for order registration
  const [orderForm, setOrderForm] = useState({
    expense_date: new Date().toISOString().split("T")[0],
    client_id: "",
    branch: "",
    number_of_cases: "",
    tentative_delivery_date: "",
  });

  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_orders_sorted");
      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("orders")
          .select(
            `id, client_name, client, branch, sku, number_of_cases, tentative_delivery_date, status, created_at, updated_at`
          )
          .order("status", { ascending: true })
          .order("tentative_delivery_date", { ascending: false });

        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }
      return data || [];
    },
  });

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, client_name, branch")
        .eq("is_active", true)
        .order("client_name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (newOrder: any) => {
      const { data, error } = await supabase
        .from("orders")
        .insert([newOrder])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Reset form
      setOrderForm({
        expense_date: new Date().toISOString().split("T")[0],
        client_id: "",
        branch: "",
        number_of_cases: "",
        tentative_delivery_date: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  // Dispatch order mutation
  const dispatchOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      // Get the order details first
      const { data: orderData } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!orderData) throw new Error("Order not found");

      // Insert into dispatch table
      const { error: dispatchError } = await supabase
        .from("orders_dispatch")
        .insert([{
          client: orderData.client || orderData.client_name,
          branch: orderData.branch,
          sku: orderData.sku,
          cases: orderData.number_of_cases,
          delivery_date: orderData.tentative_delivery_date,
        }]);

      if (dispatchError) throw dispatchError;

      // Delete from orders table
      const { error: deleteError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order dispatched successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders-dispatch"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dispatch order",
        variant: "destructive",
      });
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order deleted successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete order",
        variant: "destructive",
      });
    },
  });

  const { data: dispatchData, isLoading: dispatchLoading, error: dispatchError } = useQuery({
    queryKey: ["orders-dispatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders_dispatch")
        .select("id, client, branch, sku, cases, delivery_date")
        .order("delivery_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const normalizedOrders = useMemo(() => {
    if (!ordersData) return [] as OrderRow[];

    return (ordersData as OrderRow[])
      .map((order) => ({
        ...order,
        client: order.client || order.client_name || "",
      }))
      .sort((a, b) => {
        const statusA = a.status === "pending" ? 1 : 2;
        const statusB = b.status === "pending" ? 1 : 2;
        if (statusA !== statusB) return statusA - statusB;

        const dateA = new Date(a.tentative_delivery_date).getTime();
        const dateB = new Date(b.tentative_delivery_date).getTime();
        return dateB - dateA;
      });
  }, [ordersData]);

  const exportOrdersToExcel = useCallback(() => {
    if (!normalizedOrders.length) return;

    const exportData = normalizedOrders.map((order) => ({
      Client: order.client,
      Branch: order.branch,
      SKU: order.sku,
      "Number of Cases": order.number_of_cases,
      "Tentative Delivery Date": order.tentative_delivery_date,
      Status: order.status,
      "Created At": new Date(order.created_at).toLocaleString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Current Orders");
    const fileName = `Current_Orders_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [normalizedOrders]);

  const exportDispatchToExcel = useCallback(() => {
    if (!dispatchData || !dispatchData.length) return;

    const exportData = (dispatchData as DispatchRow[]).map((row) => ({
      Client: row.client,
      Branch: row.branch,
      SKU: row.sku,
      Cases: row.cases,
      "Delivery Date": row.delivery_date,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders Dispatch");
    const fileName = `Orders_Dispatch_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [dispatchData]);

  const renderStatus = (status: string) => {
    if (status === "pending") return <Badge variant="secondary">Pending</Badge>;
    if (status === "dispatched") return <Badge variant="outline">Dispatched</Badge>;
    return <Badge variant="secondary">Unknown</Badge>;
  };

  // Get unique branches for selected customer
  const getAvailableBranches = (clientId: string) => {
    if (!customers || !clientId) return [];
    const selectedCustomer = customers.find(c => c.id === clientId);
    if (!selectedCustomer) return [];
    
    const branches = customers
      .filter(c => c.client_name === selectedCustomer.client_name)
      .map(c => c.branch)
      .filter((branch, index, self) => self.indexOf(branch) === index)
      .sort();
    
    return branches;
  };

  // Handle order form submission
  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!orderForm.client_id || !orderForm.branch || !orderForm.number_of_cases) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const selectedCustomer = customers?.find(c => c.id === orderForm.client_id);
    if (!selectedCustomer) {
      toast({
        title: "Error",
        description: "Selected customer not found",
        variant: "destructive",
      });
      return;
    }

    const newOrder = {
      client: selectedCustomer.client_name,
      client_name: selectedCustomer.client_name,
      branch: orderForm.branch,
      sku: "", // Optional for now
      number_of_cases: parseInt(orderForm.number_of_cases),
      tentative_delivery_date: orderForm.tentative_delivery_date,
      status: "pending",
    };

    createOrderMutation.mutate(newOrder);
  };

  // Handle client change - auto-calculate delivery date
  const handleClientChange = (clientId: string) => {
    setOrderForm({
      ...orderForm,
      client_id: clientId,
      branch: "",
    });
  };

  // Handle date change and auto-calculate delivery
  const handleDateChange = (date: string) => {
    const selectedDate = new Date(date);
    const deliveryDate = new Date(selectedDate);
    deliveryDate.setDate(deliveryDate.getDate() + 5);

    setOrderForm({
      ...orderForm,
      expense_date: date,
      tentative_delivery_date: deliveryDate.toISOString().split("T")[0],
    });
  };

  // Get unique customers for form dropdown
  const getUniqueCustomers = useCallback(() => {
    if (!customers) return [];
    const seenIds = new Set<string>();
    const unique = [];
    
    for (const customer of customers) {
      if (!seenIds.has(customer.id)) {
        seenIds.add(customer.id);
        unique.push(customer);
      }
    }
    
    return unique.sort((a, b) => a.client_name.localeCompare(b.client_name));
  }, [customers]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Order Management</h2>
          <p className="text-sm text-muted-foreground">Create, manage, and dispatch customer orders.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportOrdersToExcel} disabled={!normalizedOrders.length}>
            Export Orders
          </Button>
          <Button variant="outline" onClick={exportDispatchToExcel} disabled={!dispatchData?.length}>
            Export Dispatch
          </Button>
        </div>
      </div>

      {/* Order Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Order</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOrderSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order-date">Date</Label>
                <Input
                  id="order-date"
                  type="date"
                  value={orderForm.expense_date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-client">Client *</Label>
                <Select value={orderForm.client_id} onValueChange={handleClientChange}>
                  <SelectTrigger id="order-client">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {getUniqueCustomers().map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.client_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-branch">Branch *</Label>
                <Select value={orderForm.branch} onValueChange={(value) => setOrderForm({ ...orderForm, branch: value })} disabled={!orderForm.client_id}>
                  <SelectTrigger id="order-branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableBranches(orderForm.client_id).map((branch, index) => (
                      <SelectItem key={index} value={branch}>
                        {branch}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-cases">No. of Cases *</Label>
                <Input
                  id="order-cases"
                  type="number"
                  min="1"
                  value={orderForm.number_of_cases}
                  onChange={(e) => setOrderForm({ ...orderForm, number_of_cases: e.target.value })}
                  placeholder="Number of cases"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="order-delivery">Tentative Delivery Date</Label>
                <Input
                  id="order-delivery"
                  type="date"
                  value={orderForm.tentative_delivery_date}
                  onChange={(e) => setOrderForm({ ...orderForm, tentative_delivery_date: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-800">Current Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersError && <p className="text-sm text-red-500">Failed to load orders.</p>}
          {ordersLoading ? (
            <p className="text-sm text-gray-600">Loading orders...</p>
          ) : (
            <Table className="table-auto w-full border-collapse">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-b">Client</TableHead>
                  <TableHead className="border-b">Branch</TableHead>
                  <TableHead className="border-b">SKU</TableHead>
                  <TableHead className="border-b text-right">Cases</TableHead>
                  <TableHead className="border-b">Delivery</TableHead>
                  <TableHead className="border-b">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {normalizedOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell>{order.client || "-"}</TableCell>
                    <TableCell>{order.branch || "-"}</TableCell>
                    <TableCell>{order.sku || "-"}</TableCell>
                    <TableCell className="text-right">{order.number_of_cases ?? "-"}</TableCell>
                    <TableCell>{order.tentative_delivery_date || "-"}</TableCell>
                    <TableCell>{renderStatus(order.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => dispatchOrderMutation.mutate(order.id)}
                          disabled={dispatchOrderMutation.isPending}
                          title="Dispatch this order"
                          className="text-green-600 hover:text-green-700"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this order?")) {
                              deleteOrderMutation.mutate(order.id);
                            }
                          }}
                          disabled={deleteOrderMutation.isPending}
                          title="Delete this order"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!normalizedOrders.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-gray-600 py-8">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium text-gray-800">Orders Dispatch</CardTitle>
        </CardHeader>
        <CardContent>
          {dispatchError && <p className="text-sm text-red-500">Failed to load dispatch data.</p>}
          {dispatchLoading ? (
            <p className="text-sm text-gray-600">Loading dispatch data...</p>
          ) : (
            <Table className="table-auto w-full border-collapse">
              <TableHeader>
                <TableRow>
                  <TableHead className="border-b">Client</TableHead>
                  <TableHead className="border-b">Branch</TableHead>
                  <TableHead className="border-b">SKU</TableHead>
                  <TableHead className="border-b text-right">Cases</TableHead>
                  <TableHead className="border-b">Delivery Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(dispatchData as DispatchRow[] | undefined)?.map((order) => (
                  <TableRow key={order.id} className="hover:bg-gray-50">
                    <TableCell>{order.client || "-"}</TableCell>
                    <TableCell>{order.branch || "-"}</TableCell>
                    <TableCell>{order.sku || "-"}</TableCell>
                    <TableCell className="text-right">{order.cases ?? "-"}</TableCell>
                    <TableCell>{order.delivery_date || "-"}</TableCell>
                  </TableRow>
                ))}
                {!dispatchData?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-gray-600 py-8">
                      No dispatch records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrderManagement;
