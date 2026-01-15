// Advanced Search Hook with Debouncing and Real-time Results
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SearchService } from '@/lib/search/searchService';
import type { 
  SearchQuery, 
  SearchResult, 
  SearchModule,
  SearchFilter 
} from '@/types/search';
import { logger } from '@/lib/logger';

interface UseAdvancedSearchOptions {
  module: SearchModule;
  enabled?: boolean;
  debounceMs?: number;
  defaultFilters?: SearchFilter;
  onResultsChange?: (results: SearchResult<unknown>) => void;
}

export const useAdvancedSearch = <T = unknown>(
  options: UseAdvancedSearchOptions
) => {
  const {
    module,
    enabled = true,
    debounceMs = 300,
    defaultFilters,
    onResultsChange,
  } = options;

  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    query: '',
    filters: defaultFilters,
    sortBy: undefined,
    sortOrder: 'desc',
    page: 1,
    pageSize: 50,
    highlight: true,
  });

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState<SearchQuery>(searchQuery);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, debounceMs]);

  // Query key for React Query
  const queryKey = ['advanced-search', module, debouncedQuery];

  // Perform search
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const results = await SearchService.search<T>(debouncedQuery, module);
      onResultsChange?.(results);
      return results;
    },
    enabled: enabled && (!!debouncedQuery.query || !!debouncedQuery.filters?.conditions.length),
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
  });

  // Update search query
  const updateQuery = useCallback((updates: Partial<SearchQuery>) => {
    setSearchQuery((prev) => ({
      ...prev,
      ...updates,
      page: updates.page ?? 1, // Reset to page 1 when filters change
    }));
  }, []);

  // Update search text
  const setSearchText = useCallback((text: string) => {
    updateQuery({ query: text, page: 1 });
  }, [updateQuery]);

  // Update filters
  const setFilters = useCallback((filters: SearchFilter | undefined) => {
    updateQuery({ filters, page: 1 });
  }, [updateQuery]);

  // Add filter condition
  const addFilterCondition = useCallback((condition: SearchFilter['conditions'][0]) => {
    setSearchQuery((prev) => {
      const existingFilters = prev.filters || { conditions: [], logic: 'AND', module };
      return {
        ...prev,
        filters: {
          ...existingFilters,
          conditions: [...existingFilters.conditions, condition],
        },
        page: 1,
      };
    });
  }, [module]);

  // Remove filter condition
  const removeFilterCondition = useCallback((index: number) => {
    setSearchQuery((prev) => {
      if (!prev.filters) return prev;
      const newConditions = prev.filters.conditions.filter((_, i) => i !== index);
      return {
        ...prev,
        filters: {
          ...prev.filters,
          conditions: newConditions,
        },
        page: 1,
      };
    });
  }, []);

  // Update filter condition
  const updateFilterCondition = useCallback((
    index: number,
    condition: Partial<SearchFilter['conditions'][0]>
  ) => {
    setSearchQuery((prev) => {
      if (!prev.filters) return prev;
      const newConditions = [...prev.filters.conditions];
      newConditions[index] = { ...newConditions[index], ...condition };
      return {
        ...prev,
        filters: {
          ...prev.filters,
          conditions: newConditions,
        },
        page: 1,
      };
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery((prev) => ({
      ...prev,
      filters: defaultFilters,
      page: 1,
    }));
  }, [defaultFilters]);

  // Change page
  const setPage = useCallback((page: number) => {
    updateQuery({ page });
  }, [updateQuery]);

  // Change sort
  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') => {
    updateQuery({ sortBy, sortOrder });
  }, [updateQuery]);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery({
      query: '',
      filters: defaultFilters,
      sortBy: undefined,
      sortOrder: 'desc',
      page: 1,
      pageSize: 50,
      highlight: true,
    });
  }, [defaultFilters]);

  return {
    // Results
    results: data,
    isLoading,
    error,
    refetch,

    // Query state
    searchQuery: debouncedQuery,
    searchText: searchQuery.query || '',
    
    // Actions
    setSearchText,
    setFilters,
    addFilterCondition,
    removeFilterCondition,
    updateFilterCondition,
    clearFilters,
    setPage,
    setSort,
    clearSearch,
    updateQuery,
  };
};
