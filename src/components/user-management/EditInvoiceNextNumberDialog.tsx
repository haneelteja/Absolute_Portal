import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import {
  getNextInvoiceNumberConfigValue,
  setNextInvoiceNumberConfigValue,
} from '@/services/invoiceConfigService';

interface EditInvoiceNextNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditInvoiceNextNumberDialog: React.FC<EditInvoiceNextNumberDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nextNumber, setNextNumber] = useState<string>('1');

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-configurations', 'invoice_next_number'],
    queryFn: getNextInvoiceNumberConfigValue,
    enabled: open,
  });

  useEffect(() => {
    if (open && data) {
      setNextNumber(String(data));
    }
  }, [open, data]);

  const saveMutation = useMutation({
    mutationFn: async (value: string) => {
      const parsed = parseInt(value, 10);
      if (!Number.isFinite(parsed) || parsed < 1) {
        throw new Error('Next invoice number must be a positive integer');
      }
      await setNextInvoiceNumberConfigValue(parsed);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-configurations'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-configurations', 'invoice_next_number'] });
      toast({
        title: 'Success',
        description: 'Invoice number configuration updated.',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update invoice number configuration',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(nextNumber);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invoice Number Configuration</DialogTitle>
          <DialogDescription>
            Set the next invoice number to generate. The next created invoice will use this number, then continue incrementing.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invoice-next-number">Next Invoice Number</Label>
              <Input
                id="invoice-next-number"
                type="number"
                min={1}
                step={1}
                value={nextNumber}
                onChange={(e) => setNextNumber(e.target.value)}
                placeholder="1"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

