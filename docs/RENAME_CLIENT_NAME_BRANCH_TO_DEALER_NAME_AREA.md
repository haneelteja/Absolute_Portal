# Hard Rename: client_name → dealer_name, branch → area

**Objective:** Replace `client_name` with `dealer_name` and `branch` with `area` across the entire application (UI, API, Supabase) with no backward compatibility.

---

## 1. Impact Analysis

### 1.1 Layers Affected

| Layer | Scope |
|-------|--------|
| **Supabase schema** | `customers` (client_name, branch), `orders` (branch), `orders_dispatch` (branch), `transport_expenses` (branch), `user_management` (associated_clients → associated_dealers, associated_branches → associated_areas). Indexes, unique constraints, RLS policies, functions. |
| **Backend / API** | Supabase client queries (`.select()`, `.eq()`, `.insert()`), RPC `get_orders_sorted`, `get_customer_receivables`, `user_has_data_access`, Edge Functions (e.g. `whatsapp-send`). |
| **React frontend** | Types (`src/types/index.ts`, `src/integrations/supabase/types.ts`), validation (`src/lib/validation/schemas.ts`), all components that display or edit customers/orders/transport/receivables/dashboard/reports/user-management. |

### 1.2 Tables and Columns

| Table | Old column(s) | New column(s) |
|-------|----------------|----------------|
| `customers` | `client_name`, `branch` | `dealer_name`, `area` |
| `orders` | `branch` | `area` (column `client` unchanged) |
| `orders_dispatch` | `branch` | `area` |
| `transport_expenses` | `branch` | `area` |
| `user_management` | `associated_clients`, `associated_branches` | `associated_dealers`, `associated_areas` |

### 1.3 UI Components Involved

- **OrderManagement** – order form (dealer/area), tables, filters.
- **ConfigurationManagement** – customer form (Dealer Name, Area), table columns, filters.
- **SalesEntry** – customer/area/SKU, transaction tables, exports.
- **TransportExpenses** – expense form (area), table, filters.
- **UserManagement** – dealer-area combinations, role access.
- **ManualPaymentReminder** – customer/dealer display.
- **Dashboard** – receivables (dealer).
- **Reports** – customer/dealer columns, SQL hints.
- **FactoryPayables** – customer/dealer in table.
- **Receivables** – customer/dealer.
- **EditTransactionDialog** – dealer display.
- **LabelPurchases / LabelAvailability** – any customer/dealer/branch references.

---

## 2. Database Migration (Supabase)

### 2.1 Migration File

**File:** `supabase/migrations/20260208120000_rename_client_name_branch_to_dealer_name_area.sql`

This migration:

1. Drops dependent functions and policies that reference old column names.
2. Drops indexes on `client_name` and `branch`.
3. Drops unique constraint `customers(client_name, branch)`.
4. Renames columns:
   - `customers`: `client_name` → `dealer_name`, `branch` → `area`
   - `orders`: `branch` → `area`
   - `orders_dispatch`: `branch` → `area` (if table/column exists)
   - `transport_expenses`: `branch` → `area` (if column exists)
   - `user_management`: `associated_clients` → `associated_dealers`, `associated_branches` → `associated_areas`
5. Recreates unique constraint `customers(dealer_name, area)` and indexes.
6. Recreates fulltext search index on `customers` using `dealer_name` and `area`.
7. Recreates `user_has_data_access(dealer_name, area_name)`, `user_has_access_to_dealer_area`, `get_customer_receivables()`, `get_orders_sorted()` with new column names.

### 2.2 Pre-migration Backup

```bash
# Optional: Supabase dashboard → Database → Backups (use point-in-time if available)
# Or export critical tables before running migration:
# In Supabase SQL Editor (or psql):
# pg_dump or use Dashboard backup / Point-in-time recovery
```

### 2.3 Execution Order

1. Ensure no long-running transactions hold locks on `customers` / `orders` / etc.
2. Run the migration (e.g. `supabase db push` or apply the SQL file in Supabase SQL Editor).
3. Verify with the queries in **Section 6**.

---

## 3. Backend / API Refactor

### 3.1 Done

- **Supabase types** (`src/integrations/supabase/types.ts`): `customers`, `sales_transactions`, `transport_expenses` use `dealer_name` and `area`.
- **Edge Function** `supabase/functions/whatsapp-send/index.ts`: selects and uses `dealer_name`; all references to `client_name` replaced.
- **Validation** (`src/lib/validation/schemas.ts`): `branch` → `area`, `associated_client_branches` → `associated_dealer_areas`.
- **Search** (`src/lib/search/searchService.ts`, `src/types/search.ts`): customer fields `dealer_name`, `area`; labels "Dealer Name", "Area".
- **Invoice/document services**: payload and types use `dealerName` and `area`.

### 3.2 Remaining (application code)

- All Supabase queries must use `dealer_name` and `area` (no `client_name` or `branch`).
- RPCs and Edge Functions must match the new schema (migration already updates DB functions).

---

## 4. React Frontend Refactor

### 4.1 Done

- **Types:** `src/types/index.ts` – Customer, SalesTransaction, FactoryPayable, TransportExpense, SaleForm, PaymentForm, CustomerForm, TransportExpenseForm use `dealer_name` and `area`.
- **OrderManagement:** Full refactor (dealer_name, area, getAvailableAreas, handleAreaChange, etc.).
- **ConfigurationManagement:** dealer_name, area, labels "Dealer Name", "Area".
- **invoiceService / documentGenerator:** dealerName, area in payload and placeholders.

### 4.2 Remaining Files (replace client_name → dealer_name, branch → area)

Apply consistently (property names, labels, and API/query fields). Prefer "Dealer Name" / "Area" in UI labels.

| File | Notes |
|------|--------|
| `src/components/sales/SalesEntry.tsx` | Form state, selects, filters, exports, customer display. |
| `src/components/sales/EditTransactionDialog.tsx` | Customer/dealer display. |
| `src/components/transport/TransportExpenses.tsx` | Form, table, filters (area). |
| `src/components/user-management/UserManagement.tsx` | associated_dealer_areas, dealer-area combinations, selects. |
| `src/components/user-management/ManualPaymentReminder.tsx` | Customer/dealer and area display. |
| `src/components/reports/Reports.tsx` | Receivables table, SQL hints (customers dealer_name, area). |
| `src/components/dashboard/Dashboard.tsx` | Receivables filters and columns (dealer_name, area). |
| `src/components/factory/FactoryPayables.tsx` | Customer/dealer in table and sort. |
| `src/components/receivables/Receivables.tsx` | Customer/dealer display. |
| `src/components/labels/LabelPurchases.tsx` | Any customer/dealer/branch. |
| `src/components/labels/LabelAvailability.tsx` | Any customer/dealer/branch. |
| `src/hooks/useInvoiceGeneration.ts` | Customer select (dealer_name), placeholders. |
| `src/hooks/useDatabase.ts` | Any client_name/branch in queries. |
| `src/hooks/usePaginatedQuery.ts` | Any client_name/branch. |
| `src/components/sales/hooks/useTransactionFilters.ts` | Filter state (area). |

### 4.3 User Management Terminology

- **associated_clients** → **associated_dealers**
- **associated_branches** → **associated_areas**
- **associated_client_branches** (form state) → **associated_dealer_areas**
- UI: "client-branch" → "dealer-area" (labels and placeholders).

---

## 5. Search & Replace Checklist

Use project-wide search (case-sensitive where it matters):

| Layer | Find | Replace |
|-------|------|---------|
| DB / migrations | `client_name` | `dealer_name` |
| DB / migrations | `branch` (column/constraint) | `area` |
| Types / API | `client_name` | `dealer_name` |
| Types / API | `.branch` / `branch:` (property) | `.area` / `area:` |
| UI labels | "Client Name" | "Dealer Name" |
| UI labels | "Branch" | "Area" |
| user_management | `associated_clients` | `associated_dealers` |
| user_management | `associated_branches` | `associated_areas` |
| user_management | `associated_client_branches` | `associated_dealer_areas` |
| Validation | `branch` (field name) | `area` |
| Validation | "Branch is required" | "Area is required" |

Avoid replacing:

- Variable names that mean “branch of logic” (e.g. code branch) if they are not the DB field.
- The word "branch" inside unrelated strings (e.g. "Git branch") unless part of this rename.

---

## 6. Verification & Validation

### 6.1 SQL: Confirm Schema

Run in Supabase SQL Editor after migration:

```sql
-- Customers: dealer_name and area exist; old names do not
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'customers'
  AND column_name IN ('dealer_name', 'area', 'client_name', 'branch');
-- Expect: dealer_name, area only.

-- Orders: area exists
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders' AND column_name IN ('area', 'branch');
-- Expect: area only.

-- user_management: new array columns
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_management'
  AND column_name IN ('associated_dealers', 'associated_areas', 'associated_clients', 'associated_branches');
-- Expect: associated_dealers, associated_areas only.
```

### 6.2 API / RPC

- Call `get_orders_sorted()` – response must have `area`, not `branch`.
- Call `get_customer_receivables()` – response must have `area` and dealer name from `dealer_name`.

### 6.3 UI

- Customer/Configuration: Create and edit with "Dealer Name" and "Area"; table shows new headers.
- Orders: Create order with area dropdown; tables show "Area".
- Sales / Transport / Reports / Dashboard: All customer/dealer and area fields show and submit correctly.

### 6.4 Final Grep

```bash
# From repo root (no matches expected in application code)
rg -n "client_name|\.branch\b" --glob '!*.md' --glob '!*.sql' src supabase/functions
# Resolve any remaining references.
```

---

## 7. Risk & Rollback Notes

### 7.1 Failure Points

- **Migration order:** If policies/functions are recreated before renames, they can reference non-existent columns. The migration is written to drop first, then rename, then recreate.
- **Deploy order:** Apply DB migration before deploying frontend/backend that use `dealer_name`/`area`. Otherwise the app will query old column names and fail.
- **Cached types:** Regenerate Supabase types after migration if you use codegen (`supabase gen types typescript`).

### 7.2 Rollback (using backup)

1. Restore from a Supabase backup taken before the migration (Dashboard → Database → Backups or PITR).
2. Redeploy application code that still uses `client_name` and `branch` (previous release).
3. If you cannot restore DB, a reverse migration would need to:
   - Drop new functions/policies,
   - Rename `dealer_name` → `client_name`, `area` → `branch`, and
   - Recreate old constraints, indexes, and functions.  
   Keep a copy of the pre-rename schema and policies for this.

### 7.3 Data

- Rename is metadata-only (no data transformation). Existing rows keep the same values under the new column names.

---

## Summary

- **Migration:** `supabase/migrations/20260208120000_rename_client_name_branch_to_dealer_name_area.sql` performs the full schema rename and function/policy updates.
- **Code:** Types, validation, search, invoice/docs, OrderManagement, ConfigurationManagement, whatsapp-send, and Supabase types are updated. Remaining work is the React components and hooks listed in **Section 4.2** and any other references found by the grep in **Section 6.4**.

After completing the remaining frontend files and running the migration, verify with Section 6 and the final grep so that only `dealer_name` and `area` remain in use.
