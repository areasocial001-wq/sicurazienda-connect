
DROP POLICY IF EXISTS "System can insert versions" ON note_versions;
CREATE POLICY "Service role can insert versions"
  ON note_versions FOR INSERT
  TO service_role
  WITH CHECK (true);
