/**
 * Invoice Configuration Service
 * Manages application-level invoice-related configurations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface InvoiceConfiguration {
  id: string;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'boolean' | 'number';
  description: string;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

/**
 * Fetch all invoice configurations
 */
export async function getInvoiceConfigurations(): Promise<InvoiceConfiguration[]> {
  try {
    const { data, error } = await supabase
      .from('invoice_configurations')
      .select('*')
      .order('config_key', { ascending: true });

    if (error) {
      logger.error('Error fetching invoice configurations:', error);
      throw new Error(`Failed to fetch configurations: ${error.message}`);
    }

    return (data || []) as InvoiceConfiguration[];
  } catch (error) {
    logger.error('Error in getInvoiceConfigurations:', error);
    throw error;
  }
}

/**
 * Update a configuration value
 */
export async function updateInvoiceConfiguration(
  id: string,
  config_value: string
): Promise<InvoiceConfiguration> {
  try {
    // Get current user ID for updated_by field
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from('invoice_configurations')
      .update({
        config_value,
        updated_by: user?.id || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating invoice configuration:', error);
      throw new Error(`Failed to update configuration: ${error.message}`);
    }

    if (!data) {
      throw new Error('Configuration not found');
    }

    return data as InvoiceConfiguration;
  } catch (error) {
    logger.error('Error in updateInvoiceConfiguration:', error);
    throw error;
  }
}

/**
 * Get invoice folder path from configuration
 * Returns default if not found
 */
export async function getInvoiceFolderPath(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('invoice_configurations')
      .select('config_value')
      .eq('config_key', 'invoice_folder_path')
      .single();

    if (error || !data) {
      logger.warn('Invoice folder path not found, using default');
      return 'MyDrive/Invoice';
    }

    return data.config_value || 'MyDrive/Invoice';
  } catch (error) {
    logger.error('Error in getInvoiceFolderPath:', error);
    return 'MyDrive/Invoice'; // Fallback to default
  }
}

/**
 * Check if auto invoice generation is enabled
 * Returns true if not found (default enabled)
 */
export async function isAutoInvoiceEnabled(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('invoice_configurations')
      .select('config_value')
      .eq('config_key', 'auto_invoice_generation_enabled')
      .single();

    if (error || !data) {
      logger.warn('Auto invoice generation config not found, defaulting to enabled');
      return true; // Default to enabled
    }

    // Convert string to boolean
    return data.config_value === 'true';
  } catch (error) {
    logger.error('Error in isAutoInvoiceEnabled:', error);
    return true; // Fallback to enabled
  }
}

/**
 * Get storage provider from configuration
 * Returns default if not found
 */
export async function getStorageProvider(): Promise<'google_drive' | 'onedrive'> {
  try {
    const { data, error } = await supabase
      .from('invoice_configurations')
      .select('config_value')
      .eq('config_key', 'storage_provider')
      .single();

    if (error || !data) {
      logger.warn('Storage provider not found, using default');
      return 'google_drive';
    }

    const provider = data.config_value as string;
    if (provider === 'onedrive' || provider === 'google_drive') {
      return provider;
    }

    return 'google_drive'; // Default fallback
  } catch (error) {
    logger.error('Error in getStorageProvider:', error);
    return 'google_drive'; // Fallback to default
  }
}

/**
 * Validate folder path format (works for both Google Drive and OneDrive)
 */
export function validateFolderPath(path: string): { valid: boolean; error?: string } {
  if (!path || path.trim() === '') {
    return { valid: false, error: 'Folder path is required' };
  }

  if (path.length > 255) {
    return { valid: false, error: 'Path cannot exceed 255 characters' };
  }

  // Path validation for both Google Drive and OneDrive
  // Can contain letters, numbers, spaces, forward slashes, hyphens, underscores
  // Google Drive: Must start with "MyDrive/"
  // OneDrive: Can start with any folder name or be relative
  const pathPattern = /^[a-zA-Z0-9\s\/\-_]+$/;
  
  if (!pathPattern.test(path)) {
    return {
      valid: false,
      error: 'Invalid folder path format. Use format: FolderName/SubFolder or MyDrive/FolderName'
    };
  }

  return { valid: true };
}

/**
 * Get a JSON array config value (e.g. transport_vendors, expense_groups)
 */
export async function getListConfig(configKey: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('invoice_configurations')
      .select('config_value')
      .eq('config_key', configKey)
      .single();

    if (error || !data) return [];

    try {
      const parsed = JSON.parse(data.config_value || '[]');
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

/**
 * Get tentative delivery days from config (default 5)
 */
export async function getTentativeDeliveryDays(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('invoice_configurations')
      .select('config_value')
      .eq('config_key', 'tentative_delivery_days')
      .single();

    if (error || !data) return 5;

    const num = parseInt(String(data.config_value || '5'), 10);
    return isNaN(num) || num < 0 ? 5 : num;
  } catch {
    return 5;
  }
}

const INVOICE_NEXT_NUMBER_KEY = 'invoice_next_number';

function parsePositiveInt(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = parseInt(String(value).trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Derive next invoice number from existing invoices (fallback path)
 */
async function deriveNextInvoiceNumberFromInvoices(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error || !data || data.length === 0) return 1;

    let maxFound = 0;
    data.forEach((row) => {
      const raw = (row.invoice_number || '').trim();
      if (!raw) return;
      const direct = parsePositiveInt(raw);
      if (direct) {
        maxFound = Math.max(maxFound, direct);
        return;
      }
      const match = raw.match(/(\d+)(?!.*\d)/);
      if (match?.[1]) {
        const tail = parseInt(match[1], 10);
        if (Number.isFinite(tail)) {
          maxFound = Math.max(maxFound, tail);
        }
      }
    });

    return maxFound > 0 ? maxFound + 1 : 1;
  } catch {
    return 1;
  }
}

/**
 * Ensure invoice_next_number configuration exists and return row.
 */
async function ensureInvoiceNextNumberConfig(): Promise<{ id: string; config_value: string }> {
  const { data, error } = await supabase
    .from('invoice_configurations')
    .select('id, config_value')
    .eq('config_key', INVOICE_NEXT_NUMBER_KEY)
    .maybeSingle();

  if (!error && data?.id) {
    return { id: data.id, config_value: data.config_value || '1' };
  }

  const derived = await deriveNextInvoiceNumberFromInvoices();
  const { data: inserted, error: insertError } = await supabase
    .from('invoice_configurations')
    .insert({
      config_key: INVOICE_NEXT_NUMBER_KEY,
      config_value: String(derived),
      config_type: 'number',
      description: 'Invoice number configuration (next invoice number to be generated)',
    })
    .select('id, config_value')
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to initialize invoice number configuration: ${insertError?.message || 'Unknown error'}`);
  }

  return { id: inserted.id, config_value: inserted.config_value || String(derived) };
}

/**
 * Get the next invoice number that will be generated.
 */
export async function getNextInvoiceNumberConfigValue(): Promise<number> {
  const config = await ensureInvoiceNextNumberConfig();
  return parsePositiveInt(config.config_value) || 1;
}

/**
 * Set the next invoice number explicitly.
 */
export async function setNextInvoiceNumberConfigValue(nextNumber: number): Promise<void> {
  if (!Number.isFinite(nextNumber) || nextNumber < 1) {
    throw new Error('Next invoice number must be a positive integer');
  }

  const config = await ensureInvoiceNextNumberConfig();
  const { error } = await supabase
    .from('invoice_configurations')
    .update({ config_value: String(Math.floor(nextNumber)) })
    .eq('id', config.id);

  if (error) {
    throw new Error(`Failed to update next invoice number: ${error.message}`);
  }
}

/**
 * Consume and increment invoice_next_number.
 * Returns invoice number string to be used for the new invoice.
 */
export async function reserveNextInvoiceNumber(): Promise<string> {
  const config = await ensureInvoiceNextNumberConfig();
  const current = parsePositiveInt(config.config_value) || 1;
  const next = current + 1;

  const { error } = await supabase
    .from('invoice_configurations')
    .update({ config_value: String(next) })
    .eq('id', config.id);

  if (error) {
    throw new Error(`Failed to reserve next invoice number: ${error.message}`);
  }

  return String(current);
}
