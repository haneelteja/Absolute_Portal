// Saved Filters Service
import { supabase } from '@/integrations/supabase/client';
import type { SavedFilter, SearchModule, SearchFilter } from '@/types/search';
import { logger } from '@/lib/logger';

export class SavedFiltersService {
  /**
   * Get all saved filters for a user
   */
  static async getSavedFilters(
    module?: SearchModule,
    userId?: string
  ): Promise<SavedFilter[]> {
    try {
      let query = supabase
        .from('saved_filters')
        .select('*')
        .order('created_at', { ascending: false });

      if (module) {
        query = query.eq('module', module);
      }

      if (userId) {
        query = query.or(`created_by.eq.${userId},is_shared.eq.true`);
      } else {
        query = query.eq('is_shared', true);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching saved filters:', error);
        throw error;
      }

      return (data || []).map(this.mapToSavedFilter);
    } catch (error) {
      logger.error('Error in getSavedFilters:', error);
      return [];
    }
  }

  /**
   * Get a single saved filter by ID
   */
  static async getSavedFilter(id: string): Promise<SavedFilter | null> {
    try {
      const { data, error } = await supabase
        .from('saved_filters')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        logger.error('Error fetching saved filter:', error);
        return null;
      }

      return data ? this.mapToSavedFilter(data) : null;
    } catch (error) {
      logger.error('Error in getSavedFilter:', error);
      return null;
    }
  }

  /**
   * Save a new filter
   */
  static async saveFilter(
    name: string,
    module: SearchModule,
    filter: SearchFilter,
    options: {
      description?: string;
      isShared?: boolean;
      isDefault?: boolean;
      tags?: string[];
      userId: string;
    }
  ): Promise<SavedFilter | null> {
    try {
      const { data, error } = await supabase
        .from('saved_filters')
        .insert({
          name,
          description: options.description || null,
          module,
          filter: filter as unknown as Record<string, unknown>,
          is_shared: options.isShared || false,
          is_default: options.isDefault || false,
          created_by: options.userId,
          tags: options.tags || [],
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving filter:', error);
        throw error;
      }

      return data ? this.mapToSavedFilter(data) : null;
    } catch (error) {
      logger.error('Error in saveFilter:', error);
      return null;
    }
  }

  /**
   * Update a saved filter
   */
  static async updateFilter(
    id: string,
    updates: Partial<{
      name: string;
      description: string;
      filter: SearchFilter;
      isShared: boolean;
      isDefault: boolean;
      tags: string[];
    }>
  ): Promise<SavedFilter | null> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.filter) updateData.filter = updates.filter as unknown as Record<string, unknown>;
      if (updates.isShared !== undefined) updateData.is_shared = updates.isShared;
      if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;
      if (updates.tags) updateData.tags = updates.tags;

      const { data, error } = await supabase
        .from('saved_filters')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Error updating filter:', error);
        throw error;
      }

      return data ? this.mapToSavedFilter(data) : null;
    } catch (error) {
      logger.error('Error in updateFilter:', error);
      return null;
    }
  }

  /**
   * Delete a saved filter
   */
  static async deleteFilter(id: string, userId: string): Promise<boolean> {
    try {
      // Check if user owns the filter
      const { data: filter } = await supabase
        .from('saved_filters')
        .select('created_by')
        .eq('id', id)
        .single();

      if (!filter || filter.created_by !== userId) {
        throw new Error('Unauthorized: You can only delete your own filters');
      }

      const { error } = await supabase
        .from('saved_filters')
        .delete()
        .eq('id', id);

      if (error) {
        logger.error('Error deleting filter:', error);
        throw error;
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteFilter:', error);
      return false;
    }
  }

  /**
   * Get default filters for a module and user
   */
  static async getDefaultFilters(
    module: SearchModule,
    userId?: string
  ): Promise<SavedFilter | null> {
    try {
      let query = supabase
        .from('saved_filters')
        .select('*')
        .eq('module', module)
        .eq('is_default', true);

      if (userId) {
        query = query.or(`created_by.eq.${userId},is_shared.eq.true`);
      } else {
        query = query.eq('is_shared', true);
      }

      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        return null;
      }

      return this.mapToSavedFilter(data);
    } catch (error) {
      logger.error('Error in getDefaultFilters:', error);
      return null;
    }
  }

  /**
   * Duplicate a saved filter
   */
  static async duplicateFilter(
    id: string,
    newName: string,
    userId: string
  ): Promise<SavedFilter | null> {
    try {
      const original = await this.getSavedFilter(id);
      if (!original) {
        throw new Error('Filter not found');
      }

      return await this.saveFilter(
        newName,
        original.module,
        original.filter,
        {
          description: `Copy of ${original.name}`,
          isShared: false,
          isDefault: false,
          tags: original.tags,
          userId,
        }
      );
    } catch (error) {
      logger.error('Error in duplicateFilter:', error);
      return null;
    }
  }

  /**
   * Map database record to SavedFilter type
   */
  private static mapToSavedFilter(data: Record<string, unknown>): SavedFilter {
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | undefined,
      module: data.module as SearchModule,
      filter: data.filter as unknown as SearchFilter,
      is_shared: data.is_shared as boolean,
      is_default: data.is_default as boolean,
      created_by: data.created_by as string,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      tags: (data.tags as string[]) || [],
    };
  }
}
