/**
 * Reusable dialog for editing a single plain-text or multiline config value.
 */

import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditTextConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configKey: string;
  title: string;
  description: string;
  placeholder?: string;
  multiline?: boolean;
  queryKey?: string;
}

export const EditTextConfigDialog: React.FC<EditTextConfigDialogProps> = ({
  open,
  onOpenChange,
  configKey,
  title,
  description,
  placeholder = 'Enter value',
  multiline = false,
  queryKey = 'invoice-configurations',
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [value, setValue] = useState('');

  const { data: config, isLoading } = useQuery({
    queryKey: [queryKey, configKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_configurations')
        .select('id, config_value')
        .eq('config_key', configKey)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  useEffect(() => {
    if (open && config) {
      setValue(config.config_value ?? '');
    }
  }, [open, config]);

  const saveMutation = useMutation({
    mutationFn: async (newValue: string) => {
      const { error } = await supabase
        .from('invoice_configurations')
        .update({ config_value: newValue })
        .eq('config_key', configKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      queryClient.invalidateQueries({ queryKey: [queryKey, configKey] });
      toast({ title: 'Saved', description: 'Configuration saved successfully.' });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: 'Error', description: err.message || 'Failed to save', variant: 'destructive' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : multiline ? (
          <Textarea
            rows={6}
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="font-mono text-sm"
          />
        ) : (
          <Input
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate(value)}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
