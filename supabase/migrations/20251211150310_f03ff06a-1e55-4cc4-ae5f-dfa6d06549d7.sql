-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant usage on cron schema
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Schedule the check-expiries function to run daily at 8:00 AM
SELECT cron.schedule(
  'check-expiries-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url:='https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/check-expiries',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemZsem90enZ3bG1neWp4ZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjY3OTQsImV4cCI6MjA3MzYwMjc5NH0.ajn-6isd6JoZQDVLz4ZIz8u1kWMVcBfy990iDE6Pr5g"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
