# Cron Job Setup for Database Backups

**Quick Reference for Scheduling Automated Backups**

---

## Option 1: Supabase pg_cron (Recommended)

### Prerequisites
- Supabase project with pg_cron extension enabled
- Service role key available

### Setup Steps

1. **Enable pg_cron Extension:**
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. **Schedule Daily Backup (1:00 AM UTC):**
```sql
SELECT cron.schedule(
  'daily-database-backup',
  '0 1 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/database-backup',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [SERVICE_ROLE_KEY]',
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'automatic')
  );
  $$
);
```

3. **Schedule Daily Cleanup (2:00 AM UTC):**
```sql
SELECT cron.schedule(
  'daily-backup-cleanup',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[YOUR_PROJECT_REF].supabase.co/functions/v1/cleanup-old-backups',
    headers := jsonb_build_object(
      'Authorization', 'Bearer [SERVICE_ROLE_KEY]',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Replace Placeholders:
- `[YOUR_PROJECT_REF]` - Your Supabase project reference (e.g., `qkvmdrtfhpcvwvqjuyuu`)
- `[SERVICE_ROLE_KEY]` - Your Supabase service role key

### Verify Jobs:
```sql
-- List all scheduled jobs
SELECT * FROM cron.job;

-- View job run history
SELECT * FROM cron.job_run_details 
WHERE jobid IN (
  SELECT jobid FROM cron.job WHERE jobname IN ('daily-database-backup', 'daily-backup-cleanup')
)
ORDER BY start_time DESC
LIMIT 20;
```

### Remove Jobs (if needed):
```sql
-- Remove backup job
SELECT cron.unschedule('daily-database-backup');

-- Remove cleanup job
SELECT cron.unschedule('daily-backup-cleanup');
```

---

## Option 2: GitHub Actions

Create `.github/workflows/daily-backup.yml`:

```yaml
name: Daily Database Backup

on:
  schedule:
    - cron: '0 1 * * *' # 1:00 AM UTC daily
  workflow_dispatch: # Allow manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backup
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"trigger": "automatic"}' \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/database-backup

  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cleanup
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}' \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/cleanup-old-backups
```

**Secrets Required:**
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PROJECT_REF`

---

## Option 3: Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/backup",
      "schedule": "0 1 * * *"
    },
    {
      "path": "/api/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Create API routes:
- `api/backup.ts` - Calls backup Edge Function
- `api/cleanup.ts` - Calls cleanup Edge Function

---

## Option 4: External Cron Service

### Using cron-job.org:

1. Create account at https://cron-job.org
2. Create new cron job:
   - **URL:** `https://[PROJECT].supabase.co/functions/v1/database-backup`
   - **Schedule:** `0 1 * * *` (1:00 AM UTC)
   - **Method:** POST
   - **Headers:**
     - `Authorization: Bearer [SERVICE_ROLE_KEY]`
     - `Content-Type: application/json`
   - **Body:** `{"trigger": "automatic"}`

3. Repeat for cleanup job (2:00 AM UTC)

---

## Timezone Notes

- Cron schedules use UTC time
- 1:00 AM UTC = 6:30 AM IST (India Standard Time)
- Adjust schedule if different timezone required

**Example:** For 1:00 AM IST:
- IST is UTC+5:30
- Schedule: `0 19:30 * * *` (previous day 7:30 PM UTC)

---

## Testing Cron Jobs

### Manual Trigger (pg_cron):
```sql
-- Manually trigger backup job
SELECT cron.schedule('test-backup', 'now', $$SELECT 1$$);
```

### Manual Trigger (HTTP):
```bash
curl -X POST \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "automatic"}' \
  https://[PROJECT].supabase.co/functions/v1/database-backup
```

---

**Status:** Ready for Configuration
