
ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_target_user_id_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_target_user_id_fkey
  FOREIGN KEY (target_user_id) REFERENCES auth.users(id)
  ON DELETE SET NULL;
