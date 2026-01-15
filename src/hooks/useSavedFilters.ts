// Saved Filters Hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SavedFiltersService } from '@/lib/search/savedFiltersService';
import type { SavedFilter, SearchModule, SearchFilter } from '@/types/search';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useSavedFilters = (module?: SearchModule) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get saved filters
  const { data: savedFilters = [], isLoading } = useQuery({
    queryKey: ['saved-filters', module, user?.id],
    queryFn: () => SavedFiltersService.getSavedFilters(module, user?.id),
    enabled: !!user,
  });

  // Get default filter
  const { data: defaultFilter } = useQuery({
    queryKey: ['default-filter', module, user?.id],
    queryFn: () => SavedFiltersService.getDefaultFilters(module || 'sales_transactions', user?.id),
    enabled: !!user && !!module,
  });

  // Save filter mutation
  const saveFilterMutation = useMutation({
    mutationFn: async (params: {
      name: string;
      module: SearchModule;
      filter: SearchFilter;
      description?: string;
      isShared?: boolean;
      isDefault?: boolean;
      tags?: string[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return SavedFiltersService.saveFilter(
        params.name,
        params.module,
        params.filter,
        {
          description: params.description,
          isShared: params.isShared,
          isDefault: params.isDefault,
          tags: params.tags,
          userId: user.id,
        }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast({
        title: 'Success',
        description: 'Filter saved successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save filter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Update filter mutation
  const updateFilterMutation = useMutation({
    mutationFn: async (params: {
      id: string;
      updates: Partial<{
        name: string;
        description: string;
        filter: SearchFilter;
        isShared: boolean;
        isDefault: boolean;
        tags: string[];
      }>;
    }) => {
      return SavedFiltersService.updateFilter(params.id, params.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast({
        title: 'Success',
        description: 'Filter updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update filter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Delete filter mutation
  const deleteFilterMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error('User not authenticated');
      return SavedFiltersService.deleteFilter(id, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast({
        title: 'Success',
        description: 'Filter deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete filter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  // Duplicate filter mutation
  const duplicateFilterMutation = useMutation({
    mutationFn: async (params: { id: string; newName: string }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return SavedFiltersService.duplicateFilter(params.id, params.newName, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-filters'] });
      toast({
        title: 'Success',
        description: 'Filter duplicated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to duplicate filter: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });

  return {
    savedFilters,
    defaultFilter,
    isLoading,
    saveFilter: saveFilterMutation.mutate,
    updateFilter: updateFilterMutation.mutate,
    deleteFilter: deleteFilterMutation.mutate,
    duplicateFilter: duplicateFilterMutation.mutate,
    isSaving: saveFilterMutation.isPending,
    isUpdating: updateFilterMutation.isPending,
    isDeleting: deleteFilterMutation.isPending,
  };
};
