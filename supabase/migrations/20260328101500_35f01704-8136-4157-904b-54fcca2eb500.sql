ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_target_user_id_fkey;
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;