import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, CheckCircle2, Trash2, Wrench } from 'lucide-react';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────
interface MaintenanceRecord {
  id: string;
  date: string;
  equipment: string;
  part: string;
  quantity: number;
  amount: number | null;
  delivery_date: string | null;
  status: 'pending' | 'received';
  created_at: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
async function fetchConfigValue(key: string): Promise<string> {
  const { data } = await supabase
    .from('invoice_configurations')
    .select('config_value')
    .eq('config_key', key)
    .single();
  return data?.config_value ?? '';
}

async function sendWhatsApp(apiKey: string, to: string, message: string): Promise<void> {
  if (!apiKey || !to || !message) return;
  try {
    await fetch('https://waba.360dialog.io/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'D360-API-KEY': apiKey,
      },
      body: JSON.stringify({
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body: message },
      }),
    });
  } catch {
    // WhatsApp is best-effort — silent fail
  }
}

function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

// ── Component ──────────────────────────────────────────────────────────────────
const MachineMaintenance: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = format(new Date(), 'yyyy-MM-dd');

  // Form state
  const [formDate, setFormDate] = useState(today);
  const [formEquipment, setFormEquipment] = useState('');
  const [formPart, setFormPart] = useState('');
  const [formQuantity, setFormQuantity] = useState('');

  // Received dialog state
  const [receivedDialogOpen, setReceivedDialogOpen] = useState(false);
  const [receivingRecord, setReceivingRecord] = useState<MaintenanceRecord | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [receivedDeliveryDate, setReceivedDeliveryDate] = useState(today);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: equipmentList = [] } = useQuery<string[]>({
    queryKey: ['machine-equipment-config'],
    queryFn: async () => {
      const val = await fetchConfigValue('machine_equipment');
      try {
        const parsed = JSON.parse(val || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
  });

  const { data: records = [], isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ['machine-maintenance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('machine_maintenance')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MaintenanceRecord[];
    },
  });

  const pendingRecords = records.filter((r) => r.status === 'pending');
  const receivedRecords = records.filter((r) => r.status === 'received');

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (values: {
      date: string;
      equipment: string;
      part: string;
      quantity: number;
    }) => {
      const { data, error } = await supabase
        .from('machine_maintenance')
        .insert([{ ...values, status: 'pending' }])
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceRecord;
    },
    onSuccess: async (record) => {
      queryClient.invalidateQueries({ queryKey: ['machine-maintenance'] });
      toast({ title: 'Request created', description: 'Maintenance request created successfully.' });
      setFormDate(today);
      setFormEquipment('');
      setFormPart('');
      setFormQuantity('');

      // WhatsApp notification
      const [apiKey, number, template] = await Promise.all([
        fetchConfigValue('whatsapp_api_key'),
        fetchConfigValue('machine_maintenance_whatsapp_number'),
        fetchConfigValue('machine_maintenance_request_template'),
      ]);
      const message = fillTemplate(template, {
        equipment: record.equipment,
        part: record.part,
        quantity: String(record.quantity),
        date: record.date,
      });
      await sendWhatsApp(apiKey, number, message);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (values: { id: string; amount: number; delivery_date: string }) => {
      const { data, error } = await supabase
        .from('machine_maintenance')
        .update({ status: 'received', amount: values.amount, delivery_date: values.delivery_date })
        .eq('id', values.id)
        .select()
        .single();
      if (error) throw error;
      return data as MaintenanceRecord;
    },
    onSuccess: async (record) => {
      queryClient.invalidateQueries({ queryKey: ['machine-maintenance'] });
      toast({ title: 'Marked as received', description: 'Request moved to received.' });
      setReceivedDialogOpen(false);
      setReceivingRecord(null);
      setReceivedAmount('');
      setReceivedDeliveryDate(today);

      // WhatsApp notification
      const [apiKey, number, template] = await Promise.all([
        fetchConfigValue('whatsapp_api_key'),
        fetchConfigValue('machine_maintenance_whatsapp_number'),
        fetchConfigValue('machine_maintenance_received_template'),
      ]);
      const message = fillTemplate(template, {
        equipment: record.equipment,
        part: record.part,
        quantity: String(record.quantity),
        amount: record.amount != null ? String(record.amount) : '',
        delivery_date: record.delivery_date ?? '',
      });
      await sendWhatsApp(apiKey, number, message);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('machine_maintenance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machine-maintenance'] });
      toast({ title: 'Deleted', description: 'Maintenance request deleted.' });
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleCreate = () => {
    if (!formDate || !formEquipment || !formPart || !formQuantity) {
      toast({ title: 'Validation', description: 'All fields are required.', variant: 'destructive' });
      return;
    }
    const qty = parseInt(formQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast({ title: 'Validation', description: 'Quantity must be a positive number.', variant: 'destructive' });
      return;
    }
    createMutation.mutate({ date: formDate, equipment: formEquipment, part: formPart, quantity: qty });
  };

  const handleOpenReceived = (record: MaintenanceRecord) => {
    setReceivingRecord(record);
    setReceivedAmount('');
    setReceivedDeliveryDate(today);
    setReceivedDialogOpen(true);
  };

  const handleConfirmReceived = () => {
    if (!receivingRecord) return;
    const amt = parseFloat(receivedAmount);
    if (isNaN(amt) || amt < 0) {
      toast({ title: 'Validation', description: 'Enter a valid amount.', variant: 'destructive' });
      return;
    }
    if (!receivedDeliveryDate) {
      toast({ title: 'Validation', description: 'Delivery date is required.', variant: 'destructive' });
      return;
    }
    receiveMutation.mutate({ id: receivingRecord.id, amount: amt, delivery_date: receivedDeliveryDate });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Wrench className="h-6 w-6 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">Machine Maintenance</h2>
      </div>

      {/* ── Create Request Form ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Create Maintenance Request</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="mm-date">Date</Label>
              <Input
                id="mm-date"
                type="date"
                value={formDate}
                max={today}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mm-equipment">Equipment</Label>
              <Select value={formEquipment} onValueChange={setFormEquipment}>
                <SelectTrigger id="mm-equipment">
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
                <SelectContent>
                  {equipmentList.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No equipment configured
                    </SelectItem>
                  ) : (
                    equipmentList.map((eq) => (
                      <SelectItem key={eq} value={eq}>
                        {eq}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="mm-part">Part</Label>
              <Input
                id="mm-part"
                placeholder="Enter part name"
                value={formPart}
                onChange={(e) => setFormPart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mm-quantity">Quantity</Label>
              <Input
                id="mm-quantity"
                type="number"
                min={1}
                placeholder="Quantity"
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
              />
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={handleCreate}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Request
          </Button>
        </CardContent>
      </Card>

      {/* ── Machine Parts Required ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Parts Required</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No pending requests</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRecords.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.equipment}</TableCell>
                      <TableCell>{record.part}</TableCell>
                      <TableCell className="text-right">{record.quantity}</TableCell>
                      <TableCell className="text-right text-gray-400">—</TableCell>
                      <TableCell className="text-gray-400">—</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-300 hover:bg-green-50"
                            onClick={() => handleOpenReceived(record)}
                            disabled={receiveMutation.isPending}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Received
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(record.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Machine Parts Received ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Parts Received</CardTitle>
        </CardHeader>
        <CardContent>
          {receivedRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No received requests</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">S.No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Delivery Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receivedRecords.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-center">{idx + 1}</TableCell>
                      <TableCell>{record.date}</TableCell>
                      <TableCell>{record.equipment}</TableCell>
                      <TableCell>{record.part}</TableCell>
                      <TableCell className="text-right">{record.quantity}</TableCell>
                      <TableCell className="text-right">
                        {record.amount != null ? `₹${record.amount.toLocaleString()}` : '—'}
                      </TableCell>
                      <TableCell>{record.delivery_date ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Received Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={receivedDialogOpen} onOpenChange={setReceivedDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Received</DialogTitle>
            <DialogDescription>
              Enter the amount and delivery date for this maintenance part.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Enter amount"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Delivery Date</Label>
              <Input
                type="date"
                value={receivedDeliveryDate}
                onChange={(e) => setReceivedDeliveryDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReceivedDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReceived} disabled={receiveMutation.isPending}>
              {receiveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MachineMaintenance;
