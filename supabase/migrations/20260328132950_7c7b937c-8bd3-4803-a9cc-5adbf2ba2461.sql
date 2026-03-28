-- Allow client users to see their own linked contact record
CREATE POLICY "Clients can view own linked contact"
  ON crm_contacts FOR SELECT
  TO authenticated
  USING (client_user_id = auth.uid());