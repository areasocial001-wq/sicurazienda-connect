
ALTER TABLE public.worker_leave_balances REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.worker_leave_balances;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
