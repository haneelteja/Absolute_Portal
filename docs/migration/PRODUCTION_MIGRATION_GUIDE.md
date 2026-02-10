# Production Environment Migration Guide

**Aamodha Operations Portal — Database & Integration Migration**

| Document Version | 1.0 |
|------------------|-----|
| Last Updated     | 2025-01-27 |
| Audience         | DevOps, Release Managers, Auditors |
| Classification   | Internal — Production Operations |

---

## Table of Contents

1. [Migration Overview](#1-migration-overview)
2. [Pre-Migration Checklist](#2-pre-migration-checklist)
3. [Step-by-Step Migration Procedures](#3-step-by-step-migration-procedures)
4. [Post-Migration Validation](#4-post-migration-validation)
5. [Rollback Plan](#5-rollback-plan)
6. [Security & Compliance](#6-security--compliance-considerations)
7. [Appendix](#7-appendix)

---

## 1. Migration Overview

### 1.1 Purpose

This document defines a safe, auditable process to migrate the complete Aamodha Operations Portal setup from a **source environment** (e.g. Dev or UAT) to a **target environment** (e.g. UAT or Production), including:

- Database schema, data, constraints, indexes, triggers, and functions
- Supabase Edge Functions
- Environment secrets and API keys
- Google Drive integration (OAuth, folder structure, config)
- WhatsApp integration (360Messenger API)

The process is designed for **minimal downtime**, **full data integrity**, and **rollback support** in case of failure.

### 1.2 Scope

| Component | In Scope | Notes |
|-----------|----------|--------|
| Database | ✅ All tables, data, RLS, indexes, triggers, functions | Schema + data |
| Edge Functions | ✅ All deployed functions | Version-controlled in repo |
| Secrets | ✅ Supabase secrets, API keys, tokens | No hardcoding |
| Google Drive | ✅ OAuth/refresh token, folder paths, upload/download | Config in DB + secrets |
| WhatsApp (360Messenger) | ✅ API key, templates, sender logic, retry | Config in DB + optional secrets |
| Frontend (Vercel) | ✅ Build env vars (e.g. `VITE_*`) | Set in Vercel per environment |
| Cron / Scheduled Jobs | ✅ Backup, cleanup, payment reminders | Configured in Supabase after migration |

### 1.3 Assumptions

- **Source** and **target** are separate Supabase projects (different project IDs).
- Source has been validated in Dev/UAT; no schema or config changes are required during migration.
- Migrations are run in **chronological order** by filename (Supabase migration timestamps).
- Only **authorized personnel** perform migration steps; access is logged.
- **No duplicate WhatsApp messages** are sent during cutover (e.g. by pausing cron or disabling WhatsApp in source before target go-live).
- Google Drive and WhatsApp credentials for the **target** environment are obtained and stored securely before migration (new OAuth app or same app with env-specific config).

### 1.4 Dependencies

- **Supabase CLI** installed and linked to target project for Edge Function deploy and secrets.
- **Database access** to source (read) and target (write) with sufficient privileges.
- **Vercel** (or hosting) project for target with env vars configured.
- **Google Cloud Console** (or existing OAuth app) for Google Drive refresh token for target.
- **360Messenger** account and API key for target (or shared key if same sender number).
- **pg_dump** / **psql** (or Supabase Dashboard SQL + export/import) for database migration.

### 1.5 Risk Summary

| Risk | Mitigation |
|------|------------|
| Data loss | Full backup before migration; restore procedure documented |
| Downtime | Phased migration; app points to target only after validation |
| Wrong secrets in target | Checklist; separate secret set per environment; no copy-paste from source |
| Duplicate WhatsApp messages | Disable/pause WhatsApp in source before enabling in target |
| Google Drive path mismatch | Document folder structure; validate upload/download after migration |
| Edge Function failure | Deploy and invoke test; rollback to previous version if needed |

### 1.6 Downtime Estimation

| Phase | Estimated duration | Notes |
|-------|--------------------|--------|
| Pre-migration (backups, checks) | 30–60 min | No app downtime |
| Schema apply (target empty) | 5–15 min | Target only |
| Data export (source) | 10–60 min | Depends on DB size |
| Data import (target) | 15–90 min | Depends on DB size |
| Edge Functions deploy | 10–20 min | Target only |
| Secrets and config | 15–30 min | Target only |
| Post-migration validation | 30–60 min | Recommended before cutover |
| **Cutover** (point app to target) | **&lt; 5 min** | Single redeploy / env change |

**Total hands-on time:** typically 2–4 hours. **User-facing downtime:** only during cutover (pointing frontend to target and redeploying), which can be kept under 5 minutes if Vercel env vars are set and a redeploy is triggered.

### 1.7 Data Backup Strategy Before Migration

- **Source:** Take a full database backup (Supabase scheduled backup or manual `pg_dump`) **before** any migration step. Retain for at least 30 days (or per org policy). Store in a secure, access-controlled location.
- **Target:** If the target project already has data (e.g. re-migration), take a full backup of target before overwriting.
- **Config snapshot:** Export `invoice_configurations`, `whatsapp_templates`, and optionally `whatsapp_message_logs` from source to SQL/CSV for traceability and quick restore of config if needed.
- **No production secrets in backups:** Ensure backup storage and access comply with security policy; backups may contain PII or business data.

---

## 2. Pre-Migration Checklist

Complete all items before starting migration. Sign-off recommended for audit.

### 2.1 Backups

- [ ] **Source database**: Full backup (Supabase Dashboard → Database → Backups, or `pg_dump`) taken and stored in a secure location.
- [ ] **Target database**: If target already has data, full backup of target taken.
- [ ] **Invoice/config data**: Export of `invoice_configurations` (and optionally `whatsapp_templates`, `whatsapp_message_logs` for reference) from source saved as SQL or CSV.
- [ ] **Backup retention**: Backup retention period and location documented (e.g. 30 days, same region as project).

### 2.2 Access Verification

- [ ] Source Supabase: Dashboard and (if used) CLI access verified; role used has read access to all tables and migrations.
- [ ] Target Supabase: Dashboard and CLI access verified; role has write access for schema, data, and Edge Function deploy.
- [ ] Supabase CLI: `supabase link --project-ref <TARGET_REF>` successful; no accidental link to source.
- [ ] Vercel (target): Team member has access to set environment variables and redeploy.
- [ ] Google Drive: Refresh token for target environment obtained and stored (e.g. in Supabase secrets).
- [ ] 360Messenger: API key (and sender number) for target confirmed; template approvals verified if using templates.

### 2.3 Environment Readiness

- [ ] Target Supabase project created and billing/region correct.
- [ ] Target Vercel project (or hosting) created; build succeeds with placeholder env vars.
- [ ] Migration run order agreed: all migrations from repo applied in timestamp order (see Appendix A).
- [ ] Maintenance window communicated (if applicable); stakeholders informed.
- [ ] Rollback owner assigned and rollback steps read and understood.

### 2.4 Pre-Migration Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Migration lead | | | |
| DevOps / Infra | | | |
| Security / Compliance (if required) | | | |

---

## 3. Step-by-Step Migration Procedures

Execute in order. Log each step (time, outcome, any errors).

### 3.1 Database Migration

#### 3.1.1 Pre-Migration Checks (Source)

1. **List migrations already applied on source**  
   In Source Supabase: SQL Editor → run:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
   ```
   Record the list of applied migration versions.

2. **Verify schema and key data**  
   Confirm critical tables exist and row counts are as expected:
   ```sql
   SELECT 'customers' AS tbl, COUNT(*) FROM customers
   UNION ALL SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
   UNION ALL SELECT 'invoice_configurations', COUNT(*) FROM invoice_configurations
   UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
   UNION ALL SELECT 'whatsapp_message_logs', COUNT(*) FROM whatsapp_message_logs
   UNION ALL SELECT 'backup_logs', COUNT(*) FROM backup_logs
   UNION ALL SELECT 'user_management', COUNT(*) FROM user_management;
   ```
   Keep a copy of this output for post-migration comparison.

3. **Export reference data (optional but recommended)**  
   Export `invoice_configurations` and `whatsapp_templates` from source for comparison or manual adjustment in target:
   ```bash
   # Example: export invoice_configurations to CSV via Supabase Dashboard or psql
   ```

#### 3.1.2 Apply Schema on Target (Empty Target)

If the **target database is empty**:

1. **Apply all migrations in order**  
   Migrations are in `supabase/migrations/` with naming `YYYYMMDDHHMMSS_description.sql`. Apply in chronological order.  
   - **Option A (Supabase CLI):**  
     ```bash
     cd <repo_root>
     supabase link --project-ref <TARGET_PROJECT_REF>
     supabase db push
     ```  
     This applies all migrations that are not yet in `schema_migrations`.  
   - **Option B (Manual):**  
     In Target Supabase SQL Editor, run each migration file in order (oldest timestamp first). Then insert into `supabase_migrations.schema_migrations` the version for each applied file so future `supabase db push` does not re-run them.

2. **Verify schema**  
   Run the same table-count query as in 3.1.1 step 2 on target. Table counts will be 0 for data tables; ensure all tables and indexes exist.

#### 3.1.3 Data Migration (Full Copy)

1. **Export from source**  
   Use Supabase Dashboard (Database → Backups) or `pg_dump` to create a full dump. For data-only migration while preserving target schema applied above, use data-only dump of required tables, or use full dump and then restore only data (see Supabase docs for restore).  
   **Recommended (pg_dump data-only for listed tables):**  
   ```bash
   pg_dump "<SOURCE_DATABASE_URL>" \
     --data-only \
     --table=public.customers \
     --table=public.sales_transactions \
     --table=public.invoice_configurations \
     --table=public.invoices \
     --table=public.invoice_number_sequence \
     --table=public.whatsapp_message_logs \
     --table=public.whatsapp_templates \
     --table=public.backup_logs \
     --table=public.user_management \
     --table=public.orders \
     --table=public.sku_configurations \
     --table=public.label_vendors \
     --table=public.factory_pricing \
     --table=public.label_purchases \
     --table=public.label_payments \
     --table=public.transport_expenses \
     --table=public.saved_filters \
     -f source_data_dump.sql
   ```  
   Add or remove tables to match your actual schema (e.g. `user_management`, `auth.users` if migrating auth). For `auth.users` and other auth tables, follow Supabase guidance (often re-create users or use Supabase Auth migration tools).

2. **Disable triggers (if restoring with pg_restore)**  
   If your restore process requires it, temporarily disable triggers on target, then re-enable after data load.

3. **Import into target**  
   - Ensure target has schema applied (3.1.2).  
   - Use `psql "<TARGET_DATABASE_URL>" -f source_data_dump.sql` or Supabase restore flow.  
   - Resolve any foreign key or sequence conflicts (e.g. set `session_replication_role = replica` during import if needed, then back to `origin`).

4. **Re-enable triggers and update sequences**  
   Run:
   ```sql
   SELECT setval(pg_get_serial_sequence(quote_ident(table_schema)||'.'||quote_ident(table_name), column_name), (SELECT COALESCE(MAX(column_name), 1) FROM table_name));
   ```
   for any serial/identity columns that must reflect max id (adjust per table).

5. **Verify data integrity**  
   Run the same row-count query as in 3.1.1 step 2 on target. Compare to source (after accounting for any tables you did not migrate).  
   Run spot checks: open a few customers, transactions, and invoices in the app (after app is pointed to target).

#### 3.1.4 Database Migration Sign-Off

- [ ] All migrations applied on target.
- [ ] Data imported and row counts/match checks done.
- [ ] RLS policies active; test select/update as a manager and as a regular user.
- [ ] Logged: time completed, who performed it, any issues.

---

### 3.2 Edge Functions Migration

#### 3.2.1 List of Edge Functions to Migrate

| Function | Purpose | Critical env / secrets |
|----------|---------|------------------------|
| `whatsapp-send` | Send WhatsApp via 360Messenger | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; config from DB |
| `whatsapp-retry` | Retry failed WhatsApp messages | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY |
| `google-drive-token` | Refresh Google Drive OAuth token | GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET |
| `google-drive-upload` | Upload files to Google Drive | SUPABASE_URL, SUPABASE_ANON_KEY (calls google-drive-token) |
| `onedrive-token` | Refresh OneDrive OAuth token | ONEDRIVE_REFRESH_TOKEN, ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_TENANT_ID |
| `onedrive-upload` | Upload files to OneDrive | SUPABASE_URL, SUPABASE_ANON_KEY |
| `database-backup` | Create DB backup and upload to Drive | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY; DATABASE_URL or SUPABASE_DB_URL |
| `cleanup-old-backups` | Delete old backup files | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY |
| `create-user` | Create user (invite flow) | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY; APP_URL; email secrets if sending email |
| `simple-create-user` | Simplified user creation | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| `send-welcome-email` | Welcome email (dispatcher) | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| `send-welcome-email-smtp` | SMTP welcome email | SMTP_* |
| `send-welcome-email-resend` | Resend welcome email | RESEND_API_KEY, RESEND_FROM_EMAIL |
| `send-welcome-email-mailgun` | Mailgun welcome email | MAILGUN_* |
| `send-welcome-email-direct` | Direct welcome email | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| `send-password-reset-email` | Password reset email | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |
| `send-password-reset-email-resend` | Resend password reset | RESEND_API_KEY, SUPABASE_*, PRODUCTION_APP_URL, RESEND_FROM_EMAIL |
| `delete-user` | Delete user | SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY |

**Note:** `test-create-user` is for testing only; exclude from production deploy or deploy only to non-production.

#### 3.2.2 Deployment Steps (Target)

1. **Link CLI to target project**  
   ```bash
   supabase link --project-ref <TARGET_PROJECT_REF>
   ```

2. **Deploy all production functions**  
   From repo root:
   ```bash
   supabase functions deploy whatsapp-send
   supabase functions deploy whatsapp-retry
   supabase functions deploy google-drive-token
   supabase functions deploy google-drive-upload
   supabase functions deploy onedrive-token
   supabase functions deploy onedrive-upload
   supabase functions deploy database-backup
   supabase functions deploy cleanup-old-backups
   supabase functions deploy create-user
   supabase functions deploy simple-create-user
   supabase functions deploy send-welcome-email
   supabase functions deploy send-welcome-email-smtp
   supabase functions deploy send-welcome-email-resend
   supabase functions deploy send-welcome-email-mailgun
   supabase functions deploy send-welcome-email-direct
   supabase functions deploy send-password-reset-email
   supabase functions deploy send-password-reset-email-resend
   supabase functions deploy delete-user
   ```
   Or deploy in a loop from a list of function names. Do **not** deploy `test-create-user` to production unless required.

3. **Set secrets** (see Section 3.3) before or immediately after deploy so invocations use correct credentials.

4. **Smoke test each critical function**  
   - Invoke `google-drive-token` (POST) and confirm 200 and valid `accessToken` (or expected error if refresh token not set).  
   - Invoke `whatsapp-send` with a test payload (and WhatsApp disabled in config or test number) to confirm no 500 and correct error handling.  
   - Optionally invoke `database-backup` once and check backup_logs and Drive.

#### 3.2.3 Version and Compatibility

- Edge Functions use Deno; runtime is determined by Supabase. Ensure repo uses a compatible Deno/std version (e.g. `https://deno.land/std@0.168.0/http/server.ts`).  
- After deploy, confirm in Supabase Dashboard → Edge Functions that each function shows “Deployed” and last deploy time.

---

### 3.3 Secrets & Environment Variables

#### 3.3.1 Secret Naming and Storage

- **Never hardcode** secrets in code or in this document.  
- **Supabase Edge Function secrets**: Set via Dashboard (Settings → Edge Functions → Secrets) or CLI:
  ```bash
  supabase secrets set SUPABASE_URL=https://<TARGET_REF>.supabase.co
  supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<target_service_role_key>
  supabase secrets set SUPABASE_ANON_KEY=<target_anon_key>
  ```
- **Per-environment**: Source and target must use **different** Supabase URLs and keys. Use a checklist so source values are never pasted into target.

#### 3.3.2 Required Supabase Secrets (Target)

| Secret | Required by | Description |
|--------|-------------|-------------|
| `SUPABASE_URL` | All Edge Functions that call Supabase | Target project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | whatsapp-send, whatsapp-retry, database-backup, cleanup-old-backups, create-user, simple-create-user, send-*, delete-user | Target service role key |
| `SUPABASE_ANON_KEY` | google-drive-upload, onedrive-upload, database-backup, cleanup-old-backups, whatsapp-retry | Target anon key |
| `DATABASE_URL` or `SUPABASE_DB_URL` | database-backup (for pg_dump) | Target DB connection string (pooler or direct) |
| `GOOGLE_REFRESH_TOKEN` | google-drive-token | OAuth refresh token for target Google Drive |
| `GOOGLE_CLIENT_ID` | google-drive-token | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | google-drive-token | OAuth client secret |
| `ONEDRIVE_*` | onedrive-token | OneDrive OAuth (if using OneDrive) |
| `SMTP_*` / `RESEND_*` / `MAILGUN_*` | send-welcome-email-*, send-password-reset-email-* | Per chosen email provider |
| `APP_URL` | create-user | Target app URL (e.g. https://app.example.com) |
| `PRODUCTION_APP_URL` | send-password-reset-email-resend | Target app URL for reset links |

#### 3.3.3 Database-Stored Configuration (Not Secrets in Supabase)

These are in `invoice_configurations` and are migrated with DB data. Ensure after data migration they are **correct for target**:

- `invoice_folder_path` — Google Drive (or OneDrive) folder path for invoices.
- `storage_provider` — `google_drive` or `onedrive`.
- `whatsapp_enabled`, `whatsapp_api_key`, `whatsapp_api_url`, `whatsapp_*_enabled`, `whatsapp_failure_notification_email`, etc.

**Validation:** After migration, in target DB run:
```sql
SELECT config_key, config_value FROM invoice_configurations WHERE config_key LIKE 'whatsapp_%' OR config_key IN ('invoice_folder_path','storage_provider');
```
Confirm values match target (e.g. target folder path, target WhatsApp API key if different).

#### 3.3.4 Frontend (Vercel) Environment Variables

Set in Vercel → Project → Settings → Environment Variables for **Production** (and Preview if needed):

- `VITE_SUPABASE_URL` = target Supabase URL  
- `VITE_SUPABASE_ANON_KEY` = target anon key  
- `VITE_APP_URL` = target app URL  
- Any other `VITE_*` used by the app (see `docs/setup/ENVIRONMENT_VARIABLES.md`).

Redeploy the frontend after setting variables.

#### 3.3.5 Secrets Validation Checklist

- [ ] All Supabase secrets for target set; no source values used.
- [ ] `invoice_configurations` in target reviewed and updated for target folder paths and WhatsApp config.
- [ ] Vercel env vars set for target and redeployed.
- [ ] No secrets committed to repo or documented with real values.

---

### 3.4 Google Drive Integration Migration

#### 3.4.1 OAuth / Service Account Setup (Target)

1. **Option A – Same Google Cloud project, different refresh token**  
   Use the same OAuth client; generate a **new refresh token** for the target environment (different user or same user, different redirect/env). Store in target Supabase secret `GOOGLE_REFRESH_TOKEN`.

2. **Option B – New Google Cloud project**  
   Create a new project, enable Google Drive API, create OAuth 2.0 credentials (Desktop or Web), and go through the consent flow to obtain refresh token. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN` in target Supabase secrets.

3. **Scopes**: Ensure Drive scope includes `https://www.googleapis.com/auth/drive.file` (or broader if required for backup folder access).

#### 3.4.2 Folder Structure and Configurable Paths

- **Invoice folder**: Stored in `invoice_configurations.invoice_folder_path` (e.g. `MyDrive/Invoice` or folder ID). After migration, create the same path (or desired path) in the target Google account and update `invoice_folder_path` in target DB if different.
- **Backup folder**: Stored in `invoice_configurations` (e.g. `backup_folder_path`). Create folder in target Drive and set config to match.
- **Behavior**: `google-drive-upload` uses `google-drive-token` for access token; it can accept `folderPath` or `folderId`. Ensure the path in config exists and the account has write access.

#### 3.4.3 Post-Migration Validation (Google Drive)

1. **Read/write**: From the app (or a small script), trigger an invoice generation that uploads to Google Drive. Confirm file appears in the expected folder.
2. **Download**: Confirm generated invoice PDF/Word can be downloaded from the app (URL from DB or Drive).
3. **Backup**: Trigger a manual database backup; confirm backup file appears in the backup folder and `backup_logs` has a success row.
4. **Retention**: If cleanup-old-backups is used, confirm it deletes only old backups and not recent ones (optional test in non-production first).

---

### 3.5 WhatsApp (360Messenger) Integration Migration

#### 3.5.1 API Key and Sender Configuration

- **API key**: Stored in `invoice_configurations.whatsapp_api_key`. Use target API key (or same key if same 360Messenger account). Update in target DB after data migration if different.
- **API URL**: `invoice_configurations.whatsapp_api_url` (e.g. `https://api.360messenger.com`). Same for all envs unless 360Messenger provides different endpoints.
- **Sender number**: Handled by 360Messenger account; ensure the number is approved and templates (if any) are approved for that number.

#### 3.5.2 Template and Approval Dependencies

- Templates are in `whatsapp_templates` (migrated with DB). If 360Messenger requires template names to match approved templates, ensure names/content align with what is approved in the 360Messenger dashboard for the target sender.
- **No duplicate messages**: Before enabling WhatsApp in target, disable or pause WhatsApp in source (e.g. set `whatsapp_enabled` to `false` in source `invoice_configurations`, or pause cron that triggers payment reminders).

#### 3.5.3 Post-Migration Validation (WhatsApp)

1. **Send test message**: Use “Manual payment reminder” (or equivalent) in the app against a test customer with a valid WhatsApp number. Confirm message received and `whatsapp_message_logs` shows `sent`.
2. **Retry mechanism**: Mark a message as failed (or use whatsapp-retry function) and confirm retry sends and log updates.
3. **Failure notification**: Trigger a failure (e.g. invalid number) and confirm `whatsapp_failure_notification_email` receives the alert (if configured).

---

## 4. Post-Migration Validation

### 4.1 Data Integrity Checks

- [ ] Row counts for key tables match source (or expected) (see 3.1.1 step 2).
- [ ] Spot check: same customer id, transaction id, invoice number in target as in source for a few records.
- [ ] Sequences/identity: New inserts get correct next IDs; no constraint errors.
- [ ] RLS: Log in as manager and as standard user; verify read/write as expected.

### 4.2 Integration Test Cases

| Test | Steps | Expected |
|------|--------|----------|
| Login | Log in with a known user | Success; dashboard loads |
| Sales / Transactions | Open sales view; filter; open a transaction | Data matches source |
| Invoices | Open invoices; generate one for a transaction | Invoice created; file in Drive |
| Google Drive upload | Generate invoice; check Drive folder | File present; link works |
| WhatsApp send | Send manual payment reminder to test number | Message received; log `sent` |
| Backup | Trigger manual backup from Application Configuration | backup_logs success; file in Drive |
| User creation | Create user (if applicable) | User created; welcome email if configured |

### 4.3 Smoke Tests (Minimal)

1. App loads and shows dashboard.  
2. One read (e.g. customers list) and one write (e.g. edit config or create test record) succeed.  
3. One Edge Function call succeeds (e.g. google-drive-token or whatsapp-send with WhatsApp disabled).  
4. No critical errors in Supabase logs (Edge Functions and Postgres).

---

## 5. Rollback Plan

### 5.1 Triggers for Rollback

- Migration step fails and cannot be resolved within the maintenance window.  
- Post-migration validation fails critically (e.g. data mismatch, RLS broken, integrations failing).  
- Business decision to revert to source.

### 5.2 Recovery Steps

1. **Application**: Point frontend (Vercel) back to **source** Supabase URL and anon key; redeploy. Users are back on source.
2. **Database (target)**: If target was partially filled, either leave as-is for forensic analysis or restore target from pre-migration backup (if taken). Do not overwrite source with target data.
3. **Edge Functions (target)**: No need to “rollback” functions unless a bad version was deployed; deploy previous version from git if required.
4. **Secrets**: Revert any manual changes to source secrets if they were accidentally modified. Target secrets can remain for retry.
5. **Communication**: Notify stakeholders; schedule post-mortem and next migration attempt.

### 5.3 Rollback Sign-Off

- [ ] Frontend reverted to source and verified.  
- [ ] Rollback owner confirmed.  
- [ ] Incident and rollback steps logged.

---

## 6. Security & Compliance Considerations

- **Access**: Only authorized personnel perform migration; use project roles and least privilege.  
- **Secrets**: Never log or document real secrets; use placeholders in runbooks.  
- **Backups**: Stored securely; access logged; retention as per policy.  
- **Audit**: Keep a log of steps (who, when, what command or action, outcome).  
- **Data**: Migrate only necessary data; ensure target RLS and policies are enabled and tested.  
- **Compliance**: If regulated (e.g. PII, financial data), ensure migration and storage meet data residency and encryption requirements.

---

## 7. Appendix

### Appendix A: Migration Files (Chronological Order)

Migrations in `supabase/migrations/` must be applied in this order (sorted by timestamp in filename). Confirm against repo before run:

```
20250103000000_create_orders_table.sql
20250103120000_create_orders_table.sql
20250103130000_create_user_management.sql
20250110000000_create_saved_filters_table.sql
20250110000001_create_fulltext_search_indexes.sql
20250110000002_create_search_function.sql
20250113000000_initial_setup.sql
20250114000000_fix_rls_policies.sql
20250115000000_populate_user_management_with_existing_users.sql
20250115000002_simple_user_management_fix.sql
20250115000003_final_user_management_fix.sql
20250115000004_emergency_user_management_fix.sql
20250115000005_disable_user_management_rls.sql
20250115000006_create_label_availabilities_simple.sql
20250115000007_disable_customers_rls.sql
20250115000008_fix_customers_schema.sql
20250115000009_fix_sales_transactions_schema.sql
20250115000010_create_missing_tables.sql
20250115000011_fix_profiles_rls.sql
20250115000016_fix_user_management_simple.sql
20250116000000_fix_user_management_rls.sql
20250116000001_add_total_amount_to_sales_transactions.sql
20250117000000_create_get_orders_sorted_function.sql
20250120000000_performance_indexes.sql
20250120000001_receivables_function.sql
20250125000000_promote_user_to_manager.sql
20250127000000_create_invoice_system.sql
20250127000001_create_invoice_configurations.sql
20250127000002_add_storage_provider_config.sql
20250127000003_create_backup_system.sql
20250127000004_create_whatsapp_integration.sql
20250127000005_add_whatsapp_number_to_customers.sql
20250827084750_95fd66dd-d255-4f38-bcc3-f7d5f8b574fb.sql
20250906131728_c7bee5a6-e24a-420a-b68e-dc585121f666.sql
20251002093653_add_pricing_date_to_customers.sql
20251004000001_fix_vendor_id_type.sql
20251004000002_force_fix_vendor_id.sql
20251004000003_fix_label_purchases_rls.sql
20251004000004_fix_profiles_rls.sql
20251004000006_fix_label_payments_rls.sql
20251024000000_fix_label_purchases_schema.sql
20251024000001_add_customer_id_to_factory_payables.sql
```

To generate the list: `dir supabase\migrations\*.sql /b` (Windows) or `ls -1 supabase/migrations/*.sql` (Unix), then sort by name; apply in that order.

### Appendix B: Sample Commands Summary

```bash
# Link to target
supabase link --project-ref <TARGET_REF>

# Push migrations (empty target)
supabase db push

# Deploy all production functions (example loop)
for f in whatsapp-send whatsapp-retry google-drive-token google-drive-upload onedrive-token onedrive-upload database-backup cleanup-old-backups create-user simple-create-user send-welcome-email send-welcome-email-smtp send-welcome-email-resend send-welcome-email-mailgun send-welcome-email-direct send-password-reset-email send-password-reset-email-resend delete-user; do
  supabase functions deploy $f
done

# Set secrets (replace with real values in secure channel)
supabase secrets set SUPABASE_URL=https://<ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<key>
supabase secrets set SUPABASE_ANON_KEY=<key>
```

### Appendix C: Configuration Template (invoice_configurations)

After data migration, ensure target has these keys (values are examples; use target-specific values):

| config_key | config_type | Example value |
|------------|-------------|----------------|
| invoice_folder_path | string | MyDrive/Invoice |
| storage_provider | string | google_drive |
| auto_invoice_generation_enabled | boolean | true |
| whatsapp_enabled | boolean | true |
| whatsapp_api_key | string | (from 360Messenger) |
| whatsapp_api_url | string | https://api.360messenger.com |
| whatsapp_invoice_enabled | boolean | true |
| whatsapp_payment_reminder_enabled | boolean | true |
| whatsapp_failure_notification_email | string | ops@example.com |
| backup_folder_path | string | MyDrive/Backups |

### Appendix D: Validation Script (SQL)

Run on **source** before migration and on **target** after migration; compare.

```sql
-- Save output as source_counts.txt / target_counts.txt
SELECT 'customers' AS table_name, COUNT(*) AS row_count FROM customers
UNION ALL SELECT 'sales_transactions', COUNT(*) FROM sales_transactions
UNION ALL SELECT 'invoices', COUNT(*) FROM invoices
UNION ALL SELECT 'invoice_configurations', COUNT(*) FROM invoice_configurations
UNION ALL SELECT 'whatsapp_message_logs', COUNT(*) FROM whatsapp_message_logs
UNION ALL SELECT 'whatsapp_templates', COUNT(*) FROM whatsapp_templates
UNION ALL SELECT 'backup_logs', COUNT(*) FROM backup_logs
UNION ALL SELECT 'user_management', COUNT(*) FROM user_management
ORDER BY table_name;
```

---

**End of Document**

For questions or updates, contact the migration lead or update this document in version control with a new version and date.
