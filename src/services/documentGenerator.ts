/**
 * Document Generator Service
 * Handles Word document generation and PDF conversion
 */

import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { saveAs } from 'file-saver';
import type { InvoiceData } from './invoiceService';
import { logger } from '@/lib/logger';

export interface GeneratedDocument {
  wordBuffer: ArrayBuffer;
  pdfBuffer?: ArrayBuffer;
  wordFileName: string;
  pdfFileName: string;
}

/**
 * Load invoice template from public folder
 * Note: Template should be placed in public/templates/invoice-template.docx
 */
async function loadInvoiceTemplate(): Promise<ArrayBuffer> {
  try {
    const response = await fetch('/templates/invoice-template.docx');
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }
    return await response.arrayBuffer();
  } catch (error) {
    logger.error('Error loading invoice template:', error);
    throw new Error(`Template loading failed: ${error.message}`);
  }
}

/**
 * Generate Word document from template and data
 */
export async function generateWordDocument(
  data: InvoiceData
): Promise<ArrayBuffer> {
  try {
    // Load template
    const templateBuffer = await loadInvoiceTemplate();
    const zip = new PizZip(templateBuffer);
    
    // Create docxtemplater instance
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Prepare data for template
    const templateData = {
      // Invoice header
      invoiceNumber: data.invoiceNumber,
      invoiceDate: formatDate(data.invoiceDate),
      dueDate: formatDate(data.dueDate),
      
      // Company details
      companyName: data.companyName,
      companyAddress: data.companyAddress,
      companyPhone: data.companyPhone,
      companyEmail: data.companyEmail,
      companyGSTIN: data.companyGSTIN || '',
      
      // Client details
      clientName: data.clientName,
      branch: data.branch || '',
      clientAddress: data.clientAddress || '',
      clientPhone: data.clientPhone || '',
      clientEmail: data.clientEmail || '',
      
      // Invoice items
      items: [
        {
          sku: data.sku,
          description: data.sku, // Can be enhanced with product description
          quantity: data.quantity,
          unitPrice: formatCurrency(data.pricePerCase),
          amount: formatCurrency(data.amount),
        }
      ],
      
      // Totals
      subtotal: formatCurrency(data.totalAmount),
      tax: formatCurrency(data.taxAmount || 0),
      totalAmount: formatCurrency(data.grandTotal),
      amountInWords: data.amountInWords,
      
      // Terms
      terms: data.terms,
    };

    // Render document
    doc.render(templateData);

    // Generate document buffer
    const buffer = doc.getZip().generate({
      type: 'arraybuffer',
      compression: 'DEFLATE',
    });

    return buffer;
  } catch (error) {
    logger.error('Error generating Word document:', error);
    if (error instanceof Error && error.message.includes('Unclosed')) {
      throw new Error('Template syntax error: Unclosed tag in template');
    }
    throw new Error(`Word document generation failed: ${error.message}`);
  }
}

/**
 * Convert Word document to PDF
 * Note: This requires a backend service or client-side library
 * For now, we'll use a placeholder that can be replaced with actual PDF conversion
 */
export async function convertWordToPDF(
  wordBuffer: ArrayBuffer
): Promise<ArrayBuffer> {
  // Option 1: Use backend API (recommended)
  // This would call a Supabase Edge Function or external API
  
  // Option 2: Use client-side library (limited)
  // Note: Direct Word to PDF conversion in browser is complex
  // Consider using a service like CloudConvert API or LibreOffice on server
  
  throw new Error(
    'PDF conversion not yet implemented. ' +
    'Please implement using a backend service (LibreOffice/CloudConvert) ' +
    'or use a PDF generation library to create PDF directly from data.'
  );
}

/**
 * Generate PDF directly from invoice data (alternative to Word conversion)
 * This uses a PDF library to create PDF from scratch
 */
export async function generatePDFDocument(
  data: InvoiceData
): Promise<ArrayBuffer> {
  // This would use a library like pdfkit or jspdf
  // For now, return a placeholder
  throw new Error(
    'PDF generation not yet implemented. ' +
    'Install pdfkit or jspdf and implement PDF generation.'
  );
}

/**
 * Generate both Word and PDF documents
 */
export async function generateInvoiceDocuments(
  data: InvoiceData
): Promise<GeneratedDocument> {
  try {
    // Generate Word document
    const wordBuffer = await generateWordDocument(data);
    
    // Generate file names
    const wordFileName = `${data.invoiceNumber}.docx`;
    const pdfFileName = `${data.invoiceNumber}.pdf`;
    
    // For now, PDF generation is not implemented
    // In production, you would:
    // 1. Convert Word to PDF using backend service, OR
    // 2. Generate PDF directly from data
    
    return {
      wordBuffer,
      wordFileName,
      pdfFileName,
    };
  } catch (error) {
    logger.error('Error generating invoice documents:', error);
    throw error;
  }
}

/**
 * Download Word document to user's computer
 */
export function downloadWordDocument(
  buffer: ArrayBuffer,
  fileName: string
): void {
  try {
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    saveAs(blob, fileName);
  } catch (error) {
    logger.error('Error downloading Word document:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Download PDF document to user's computer
 */
export function downloadPDFDocument(
  buffer: ArrayBuffer,
  fileName: string
): void {
  try {
    const blob = new Blob([buffer], {
      type: 'application/pdf',
    });
    saveAs(blob, fileName);
  } catch (error) {
    logger.error('Error downloading PDF document:', error);
    throw new Error(`Download failed: ${error.message}`);
  }
}

/**
 * Format date for display (DD-MM-YYYY)
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (error) {
    return dateString;
  }
}

/**
 * Format currency for display (₹X,XXX.XX)
 */
function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
