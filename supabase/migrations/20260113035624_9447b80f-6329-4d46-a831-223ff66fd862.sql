-- Enable pg_net extension for HTTP calls (pg_cron is already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule daily document expiry check at 8:00 AM UTC
SELECT cron.schedule(
  'check-document-expiries-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
        url:='https://obzflzotzvwlmgyjxfpv.supabase.co/functions/v1/check-document-expiries',
        headers:=jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemZsem90enZ3bG1neWp4ZnB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY4MDcwOTAsImV4cCI6MjA2MjM4MzA5MH0.XSQYdMWpmiKE8r6MHcVJwdIJN5wPjxPGg1C6IFLqwvg'
        ),
        body:=jsonb_build_object('scheduled', true, 'time', now())
    ) as request_id;
  $$
);