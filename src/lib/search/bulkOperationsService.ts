// Bulk Operations Service
import { supabase } from '@/integrations/supabase/client';
import type { BulkOperation, SearchModule } from '@/types/search';
import { logger } from '@/lib/logger';

export class BulkOperationsService {
  /**
   * Create a new bulk operation
   */
  static async createBulkOperation(
    type: BulkOperation['type'],
    module: SearchModule,
    recordIds: string[],
    payload?: Record<string, unknown>,
    userId?: string
  ): Promise<BulkOperation | null> {
    try {
      if (!userId) {
        throw new Error('User ID required for bulk operations');
      }

      const { data, error } = await supabase
        .from('bulk_operations')
        .insert({
          type,
          module,
          record_ids: recordIds,
          payload: payload || null,
          status: 'pending',
          progress: 0,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        logger.error('Error creating bulk operation:', error);
        throw error;
      }

      return this.mapToBulkOperation(data);
    } catch (error) {
      logger.error('Error in createBulkOperation:', error);
      return null;
    }
  }

  /**
   * Execute bulk update
   */
  static async executeBulkUpdate(
    module: SearchModule,
    recordIds: string[],
    updates: Record<string, unknown>
  ): Promise<{ success: number; failed: number; errors: Array<{ recordId: string; error: string }> }> {
    const errors: Array<{ recordId: string; error: string }> = [];
    let success = 0;

    for (const recordId of recordIds) {
      try {
        const { error } = await supabase
          .from(module)
          .update(updates)
          .eq('id', recordId);

        if (error) {
          errors.push({ recordId, error: error.message });
        } else {
          success++;
        }
      } catch (error) {
        errors.push({
          recordId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed: errors.length, errors };
  }

  /**
   * Execute bulk delete
   */
  static async executeBulkDelete(
    module: SearchModule,
    recordIds: string[]
  ): Promise<{ success: number; failed: number; errors: Array<{ recordId: string; error: string }> }> {
    const errors: Array<{ recordId: string; error: string }> = [];
    let success = 0;

    for (const recordId of recordIds) {
      try {
        const { error } = await supabase
          .from(module)
          .delete()
          .eq('id', recordId);

        if (error) {
          errors.push({ recordId, error: error.message });
        } else {
          success++;
        }
      } catch (error) {
        errors.push({
          recordId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed: errors.length, errors };
  }

  /**
   * Execute bulk assign (for user assignment, etc.)
   */
  static async executeBulkAssign(
    module: SearchModule,
    recordIds: string[],
    assignTo: { field: string; value: string }
  ): Promise<{ success: number; failed: number; errors: Array<{ recordId: string; error: string }> }> {
    return this.executeBulkUpdate(module, recordIds, {
      [assignTo.field]: assignTo.value,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Get bulk operation status
   */
  static async getBulkOperation(id: string): Promise<BulkOperation | null> {
    try {
      const { data, error } = await supabase
        .from('bulk_operations')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error fetching bulk operation:', error);
        return null;
      }

      return data ? this.mapToBulkOperation(data) : null;
    } catch (error) {
      logger.error('Error in getBulkOperation:', error);
      return null;
    }
  }

  /**
   * Update bulk operation status
   */
  static async updateBulkOperationStatus(
    id: string,
    status: BulkOperation['status'],
    progress?: number,
    errors?: Array<{ recordId: string; error: string }>
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (progress !== undefined) {
        updateData.progress = progress;
      }

      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }

      if (errors) {
        updateData.errors = errors;
      }

      const { error } = await supabase
        .from('bulk_operations')
        .update(updateData)
        .eq('id', id);

      if (error) {
        logger.error('Error updating bulk operation:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error in updateBulkOperationStatus:', error);
      return false;
    }
  }

  /**
   * Get user's bulk operations
   */
  static async getUserBulkOperations(userId: string): Promise<BulkOperation[]> {
    try {
      const { data, error } = await supabase
        .from('bulk_operations')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        logger.error('Error fetching bulk operations:', error);
        return [];
      }

      return (data || []).map(this.mapToBulkOperation);
    } catch (error) {
      logger.error('Error in getUserBulkOperations:', error);
      return [];
    }
  }

  /**
   * Map database record to BulkOperation type
   */
  private static mapToBulkOperation(data: Record<string, unknown>): BulkOperation {
    return {
      id: data.id as string,
      type: data.type as BulkOperation['type'],
      module: data.module as SearchModule,
      recordIds: (data.record_ids as string[]) || [],
      payload: (data.payload as Record<string, unknown>) || undefined,
      status: data.status as BulkOperation['status'],
      progress: (data.progress as number) || 0,
      errors: (data.errors as Array<{ recordId: string; error: string }>) || [],
      created_by: data.created_by as string,
      created_at: data.created_at as string,
      completed_at: data.completed_at as string | undefined,
    };
  }
}
