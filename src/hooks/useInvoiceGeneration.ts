/**
 * React Hook for Invoice Generation
 * Handles invoice creation and updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  generateInvoiceNumber,
  createInvoiceRecord,
  getInvoiceByTransactionId,
  updateInvoiceFiles,
  markInvoiceRegenerated,
  prepareInvoiceData,
  calculateDueDate,
} from '@/services/invoiceService';
import { generateInvoiceDocuments } from '@/services/documentGenerator';
import { StorageService } from '@/services/cloudStorage/storageService';
import type { Invoice, SalesTransaction, Customer } from '@/types';
import { logger } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

interface CompanyConfig {
  name: string;
  address: string;
  phone: string;
  email: string;
  gstin?: string;
  terms?: string;
}

const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  name: import.meta.env.VITE_COMPANY_NAME || 'Aamodha Operations',
  address: import.meta.env.VITE_COMPANY_ADDRESS || 'Company Address',
  phone: import.meta.env.VITE_COMPANY_PHONE || '+91-XXXXXXXXXX',
  email: import.meta.env.VITE_COMPANY_EMAIL || 'info@company.com',
  gstin: import.meta.env.VITE_COMPANY_GSTIN,
  terms: import.meta.env.VITE_INVOICE_TERMS || 'Payment due within 30 days.',
};

/**
 * Hook to generate invoice for a transaction
 */
export function useInvoiceGeneration() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const storageService = new StorageService('google_drive');

  const generateMutation = useMutation({
    mutationFn: async ({
      transactionId,
      transaction,
      customer,
      companyConfig = DEFAULT_COMPANY_CONFIG,
    }: {
      transactionId: string;
      transaction: SalesTransaction;
      customer: Customer;
      companyConfig?: CompanyConfig;
    }) => {
      try {
        // Check if invoice already exists
        const existingInvoice = await getInvoiceByTransactionId(transactionId);
        if (existingInvoice) {
          logger.info('Invoice already exists, regenerating...');
          // Regenerate invoice
          return await regenerateInvoice(existingInvoice, transaction, customer, companyConfig);
        }

        // Generate invoice number
        const invoiceNumber = await generateInvoiceNumber('INV', true, true);

        // Prepare invoice data
        const invoiceData = prepareInvoiceData(transaction, customer, companyConfig);
        invoiceData.invoiceNumber = invoiceNumber;

        // Generate documents
        const documents = await generateInvoiceDocuments(invoiceData);

        // Upload to cloud storage
        const uploadResult = await storageService.uploadInvoiceDocuments(
          documents.wordBuffer,
          documents.pdfBuffer || null,
          invoiceNumber,
          invoiceData.invoiceDate
        );

        // Create invoice record
        const invoice = await createInvoiceRecord(
          transactionId,
          customer.id,
          invoiceNumber,
          invoiceData.invoiceDate,
          invoiceData.dueDate
        );

        // Update invoice with file information
        const updatedInvoice = await updateInvoiceFiles(
          invoice.id,
          uploadResult.word.fileId,
          uploadResult.pdf?.fileId || null,
          uploadResult.word.fileUrl,
          uploadResult.pdf?.fileUrl || null,
          uploadResult.folderPath
        );

        return updatedInvoice;
      } catch (error) {
        logger.error('Error generating invoice:', error);
        throw error;
      }
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice.transaction_id] });
      toast({
        title: 'Success',
        description: `Invoice ${invoice.invoice_number} generated successfully!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to generate invoice: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return generateMutation;
}

/**
 * Hook to get invoice by transaction ID
 */
export function useInvoice(transactionId: string | null) {
  return useQuery({
    queryKey: ['invoice', transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      return await getInvoiceByTransactionId(transactionId);
    },
    enabled: !!transactionId,
  });
}

/**
 * Hook to download invoice
 */
export function useInvoiceDownload() {
  const { toast } = useToast();

  const downloadMutation = useMutation({
    mutationFn: async ({
      invoice,
      format,
    }: {
      invoice: Invoice;
      format: 'word' | 'pdf';
    }) => {
      if (format === 'word' && invoice.word_file_url) {
        window.open(invoice.word_file_url, '_blank');
      } else if (format === 'pdf' && invoice.pdf_file_url) {
        window.open(invoice.pdf_file_url, '_blank');
      } else {
        throw new Error(`${format.toUpperCase()} file not available`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to download invoice: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return downloadMutation;
}

/**
 * Regenerate invoice (called when transaction is updated)
 */
async function regenerateInvoice(
  existingInvoice: Invoice,
  transaction: SalesTransaction,
  customer: Customer,
  companyConfig: CompanyConfig
): Promise<Invoice> {
  const storageService = new StorageService(existingInvoice.storage_provider);

  // Prepare invoice data with existing invoice number
  const invoiceData = prepareInvoiceData(transaction, customer, companyConfig);
  invoiceData.invoiceNumber = existingInvoice.invoice_number;

  // Generate new documents
  const documents = await generateInvoiceDocuments(invoiceData);

  // Delete old files
  if (existingInvoice.word_file_id || existingInvoice.pdf_file_id) {
    await storageService.deleteInvoiceFiles(
      existingInvoice.word_file_id,
      existingInvoice.pdf_file_id
    );
  }

  // Upload new files
  const uploadResult = await storageService.uploadInvoiceDocuments(
    documents.wordBuffer,
    documents.pdfBuffer || null,
    invoiceData.invoiceNumber,
    invoiceData.invoiceDate
  );

  // Update invoice record
  const updatedInvoice = await updateInvoiceFiles(
    existingInvoice.id,
    uploadResult.word.fileId,
    uploadResult.pdf?.fileId || null,
    uploadResult.word.fileUrl,
    uploadResult.pdf?.fileUrl || null,
    uploadResult.folderPath
  );

  // Mark as regenerated
  await markInvoiceRegenerated(existingInvoice.id);

  return updatedInvoice;
}
