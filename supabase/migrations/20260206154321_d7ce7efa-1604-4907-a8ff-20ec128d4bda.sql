
-- Update RLS on crm_contacts: shared access for all business areas
DROP POLICY IF EXISTS "Users can view own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Admins can view all contacts" ON public.crm_contacts;

CREATE POLICY "Business areas and admins can view all contacts"
  ON public.crm_contacts FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR
    has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR
    has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert contacts"
  ON public.crm_contacts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'contabilita'::app_role) OR
      has_role(auth.uid(), 'area_tecnica'::app_role) OR
      has_role(auth.uid(), 'gestione_corsi'::app_role) OR
      has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR
      has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Business areas and admins can update all contacts"
  ON public.crm_contacts FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR
    has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR
    has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can delete contacts"
  ON public.crm_contacts FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR
    has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR
    has_role(auth.uid(), 'medicina'::app_role)
  );

-- Update RLS on crm_activities
DROP POLICY IF EXISTS "Users can view own activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Users can insert own activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Users can update own activities" ON public.crm_activities;
DROP POLICY IF EXISTS "Users can delete own activities" ON public.crm_activities;

CREATE POLICY "Business areas and admins can view all activities"
  ON public.crm_activities FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert activities"
  ON public.crm_activities FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
      has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
      has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Business areas and admins can update all activities"
  ON public.crm_activities FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can delete all activities"
  ON public.crm_activities FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

-- Update RLS on crm_contracts
DROP POLICY IF EXISTS "Users can view own contracts" ON public.crm_contracts;
DROP POLICY IF EXISTS "Users can insert own contracts" ON public.crm_contracts;
DROP POLICY IF EXISTS "Users can update own contracts" ON public.crm_contracts;
DROP POLICY IF EXISTS "Users can delete own contracts" ON public.crm_contracts;

CREATE POLICY "Business areas and admins can view all contracts"
  ON public.crm_contracts FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert contracts"
  ON public.crm_contracts FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
      has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
      has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Business areas and admins can update all contracts"
  ON public.crm_contracts FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can delete all contracts"
  ON public.crm_contracts FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

-- Update RLS on crm_locations
DROP POLICY IF EXISTS "Users can view own locations" ON public.crm_locations;
DROP POLICY IF EXISTS "Users can insert own locations" ON public.crm_locations;
DROP POLICY IF EXISTS "Users can update own locations" ON public.crm_locations;
DROP POLICY IF EXISTS "Users can delete own locations" ON public.crm_locations;

CREATE POLICY "Business areas and admins can view all locations"
  ON public.crm_locations FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert locations"
  ON public.crm_locations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
      has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
      has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Business areas and admins can update all locations"
  ON public.crm_locations FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can delete all locations"
  ON public.crm_locations FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

-- Update RLS on crm_employees
DROP POLICY IF EXISTS "Users can view own employees" ON public.crm_employees;
DROP POLICY IF EXISTS "Users can insert own employees" ON public.crm_employees;
DROP POLICY IF EXISTS "Users can update own employees" ON public.crm_employees;
DROP POLICY IF EXISTS "Users can delete own employees" ON public.crm_employees;

CREATE POLICY "Business areas and admins can view all employees"
  ON public.crm_employees FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert employees"
  ON public.crm_employees FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
      has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
      has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Business areas and admins can update all employees"
  ON public.crm_employees FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can delete all employees"
  ON public.crm_employees FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

-- Update RLS on crm_employee_activities
DROP POLICY IF EXISTS "Users can view own employee activities" ON public.crm_employee_activities;
DROP POLICY IF EXISTS "Users can insert own employee activities" ON public.crm_employee_activities;
DROP POLICY IF EXISTS "Users can update own employee activities" ON public.crm_employee_activities;
DROP POLICY IF EXISTS "Users can delete own employee activities" ON public.crm_employee_activities;

CREATE POLICY "Business areas and admins can view all employee activities"
  ON public.crm_employee_activities FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert employee activities"
  ON public.crm_employee_activities FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
      has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
      has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Business areas and admins can update all employee activities"
  ON public.crm_employee_activities FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can delete all employee activities"
  ON public.crm_employee_activities FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

-- Update RLS on crm_interactions
DROP POLICY IF EXISTS "Users can view own interactions" ON public.crm_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.crm_interactions;
DROP POLICY IF EXISTS "Users can update own interactions" ON public.crm_interactions;
DROP POLICY IF EXISTS "Users can delete own interactions" ON public.crm_interactions;

CREATE POLICY "Business areas and admins can view all interactions"
  ON public.crm_interactions FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can insert interactions"
  ON public.crm_interactions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
      has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
      has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
    )
  );

CREATE POLICY "Business areas and admins can update all interactions"
  ON public.crm_interactions FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

CREATE POLICY "Business areas and admins can delete all interactions"
  ON public.crm_interactions FOR DELETE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR has_role(auth.uid(), 'medicina'::app_role)
  );

-- Add medicina document management policy
CREATE POLICY "Medicina can manage their documents"
  ON public.crm_client_documents FOR ALL
  USING (has_role(auth.uid(), 'medicina'::app_role) AND area = 'medicina')
  WITH CHECK (has_role(auth.uid(), 'medicina'::app_role) AND area = 'medicina');

-- Update business areas view policy to include medicina
DROP POLICY IF EXISTS "Business areas can view all client documents" ON public.crm_client_documents;

CREATE POLICY "Business areas can view all client documents"
  ON public.crm_client_documents FOR SELECT
  USING (
    has_role(auth.uid(), 'contabilita'::app_role) OR
    has_role(auth.uid(), 'area_tecnica'::app_role) OR
    has_role(auth.uid(), 'gestione_corsi'::app_role) OR
    has_role(auth.uid(), 'consulenti_tecnici'::app_role) OR
    has_role(auth.uid(), 'medicina'::app_role)
  );
