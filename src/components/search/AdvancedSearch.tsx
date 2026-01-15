// Advanced Search Component with Multi-Field Search and Real-time Results
import React, { useState, useCallback } from 'react';
import { Search, X, Filter, SortAsc, SortDesc, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
import type { SearchModule } from '@/types/search';
import { SEARCH_CONFIGS } from '@/types/search';
import { cn } from '@/lib/utils';

interface AdvancedSearchProps {
  module: SearchModule;
  onResultsChange?: (results: unknown[]) => void;
  placeholder?: string;
  className?: string;
  showFilters?: boolean;
  showSort?: boolean;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  module,
  onResultsChange,
  placeholder,
  className,
  showFilters = true,
  showSort = true,
}) => {
  const config = SEARCH_CONFIGS[module];
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    searchText,
    setSearchText,
    results,
    isLoading,
    searchQuery,
    setSort,
    clearSearch,
  } = useAdvancedSearch({
    module,
    onResultsChange: (results) => {
      onResultsChange?.(results.data);
    },
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, [setSearchText]);

  const handleSortChange = useCallback((field: string) => {
    const currentSort = searchQuery.sortBy;
    const currentOrder = searchQuery.sortOrder;
    
    if (currentSort === field) {
      // Toggle order
      setSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to desc
      setSort(field, 'desc');
    }
  }, [searchQuery, setSort]);

  const activeFiltersCount = searchQuery.filters?.conditions.length || 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder || `Search ${config.module}...`}
          value={searchText}
          onChange={handleSearchChange}
          className="pl-10 pr-10"
        />
        {searchText && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
            onClick={clearSearch}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-10 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>

      {/* Search Results Summary */}
      {results && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Found {results.total} result{results.total !== 1 ? 's' : ''}
            {searchText && ` for "${searchText}"`}
          </span>
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">
              {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active
            </Badge>
          )}
        </div>
      )}

      {/* Advanced Options */}
      {(showFilters || showSort) && (
        <div className="flex items-center gap-2 flex-wrap">
          {showFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          )}

          {showSort && config.fields.filter(f => f.filterable).length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              {config.fields
                .filter(f => f.filterable)
                .slice(0, 3)
                .map((field) => {
                  const isActive = searchQuery.sortBy === field.name;
                  const isAsc = searchQuery.sortOrder === 'asc';
                  
                  return (
                    <Button
                      key={field.name}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSortChange(field.name)}
                      className="flex items-center gap-1"
                    >
                      {field.label}
                      {isActive && (
                        isAsc ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                      )}
                    </Button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Quick Search Operators Hint */}
      {searchText && searchText.includes(':') && (
        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
          <strong>Search operators:</strong> Use "field:value" format (e.g., "status:active", "date:&gt;2024-01-01")
        </div>
      )}
    </div>
  );
};
