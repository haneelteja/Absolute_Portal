// Example: How to integrate Advanced Search into existing components
// This shows how to add search to SalesEntry component

import React from 'react';
import { AdvancedSearch } from './AdvancedSearch';
import { FilterPanel } from './FilterPanel';
import { BulkOperations, BulkSelectCheckbox } from './BulkOperations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SearchModule } from '@/types/search';

/**
 * Example integration for SalesEntry component
 * 
 * To integrate search into your component:
 * 
 * 1. Import the search components
 * 2. Add AdvancedSearch component at the top
 * 3. Add FilterPanel in a sidebar or collapsible section
 * 4. Add BulkOperations for batch actions
 * 5. Use useAdvancedSearch hook to get filtered results
 */
export const SearchIntegrationExample: React.FC<{
  module: SearchModule;
}> = ({ module }) => {
  const [searchResults, setSearchResults] = React.useState<unknown[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <AdvancedSearch
            module={module}
            onResultsChange={setSearchResults}
            placeholder="Search transactions, customers, SKUs..."
            showFilters={true}
            showSort={true}
          />
        </CardContent>
      </Card>

      {/* Filters and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <FilterPanel module={module} />
            </CardContent>
          </Card>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Bulk Operations Bar */}
          <BulkOperations
            module={module}
            records={searchResults as Array<{ id: string }>}
            onSelectionChange={setSelectedIds}
          />

          {/* Your existing table/list component here */}
          {/* Example: */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Render your filtered results */}
              <p className="text-gray-600">
                {searchResults.length} results found
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/**
 * Usage in existing component:
 * 
 * ```tsx
 * import { AdvancedSearch } from '@/components/search/AdvancedSearch';
 * import { useAdvancedSearch } from '@/hooks/useAdvancedSearch';
 * 
 * const SalesEntry = () => {
 *   const {
 *     results,
 *     searchText,
 *     setSearchText,
 *     isLoading,
 *   } = useAdvancedSearch({
 *     module: 'sales_transactions',
 *   });
 * 
 *   // Use results.data instead of direct query
 *   const displayData = results?.data || [];
 * 
 *   return (
 *     <div>
 *       <AdvancedSearch module="sales_transactions" />
 *       {/* Your existing table with displayData */}
 *     </div>
 *   );
 * };
 * ```
 */
