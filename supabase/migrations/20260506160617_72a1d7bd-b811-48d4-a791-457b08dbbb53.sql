ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS linked_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_calendar_events_linked_user_ids
ON public.calendar_events USING GIN (linked_user_ids);