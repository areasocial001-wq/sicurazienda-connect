-- Allow service role to manage tokens (for edge function callbacks)
CREATE POLICY "Service role can manage tokens" 
  ON public.google_calendar_tokens 
  FOR ALL 
  USING (true)
  WITH CHECK (true);