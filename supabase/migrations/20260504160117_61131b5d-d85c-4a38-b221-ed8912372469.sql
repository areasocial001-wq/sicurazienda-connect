
CREATE TEMP TABLE _dup_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT id, LOWER(TRIM(name)) AS key, client_user_id, created_at,
    ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name))
      ORDER BY (client_user_id IS NOT NULL) DESC, created_at ASC) AS rn
  FROM crm_contacts WHERE name IS NOT NULL AND TRIM(name) <> ''
),
groups AS (SELECT key FROM ranked GROUP BY key HAVING COUNT(*) > 1),
masters AS (SELECT r.key, r.id AS master_id FROM ranked r JOIN groups g USING (key) WHERE r.rn = 1)
SELECT r.id AS dup_id, m.master_id FROM ranked r JOIN masters m USING (key) WHERE r.id <> m.master_id;

WITH ordered AS (
  SELECT dm.master_id, c.*,
    ROW_NUMBER() OVER (PARTITION BY dm.master_id ORDER BY c.updated_at DESC) AS rn
  FROM _dup_map dm JOIN crm_contacts c ON c.id = dm.dup_id
),
agg AS (
  SELECT
    master_id,
    (array_agg(email ORDER BY rn) FILTER (WHERE email IS NOT NULL AND email <> ''))[1] AS email,
    (array_agg(phone ORDER BY rn) FILTER (WHERE phone IS NOT NULL AND phone <> ''))[1] AS phone,
    (array_agg(company ORDER BY rn) FILTER (WHERE company IS NOT NULL AND company <> ''))[1] AS company,
    (array_agg(role ORDER BY rn) FILTER (WHERE role IS NOT NULL AND role <> ''))[1] AS role,
    (array_agg(source ORDER BY rn) FILTER (WHERE source IS NOT NULL AND source <> ''))[1] AS source,
    (array_agg(notes ORDER BY rn) FILTER (WHERE notes IS NOT NULL AND notes <> ''))[1] AS notes,
    (array_agg(address ORDER BY rn) FILTER (WHERE address IS NOT NULL AND address <> ''))[1] AS address,
    (array_agg(city ORDER BY rn) FILTER (WHERE city IS NOT NULL AND city <> ''))[1] AS city,
    (array_agg(province ORDER BY rn) FILTER (WHERE province IS NOT NULL AND province <> ''))[1] AS province,
    (array_agg(postal_code ORDER BY rn) FILTER (WHERE postal_code IS NOT NULL AND postal_code <> ''))[1] AS postal_code,
    (array_agg(region ORDER BY rn) FILTER (WHERE region IS NOT NULL AND region <> ''))[1] AS region,
    (array_agg(vat_number ORDER BY rn) FILTER (WHERE vat_number IS NOT NULL AND vat_number <> ''))[1] AS vat_number,
    (array_agg(fiscal_code ORDER BY rn) FILTER (WHERE fiscal_code IS NOT NULL AND fiscal_code <> ''))[1] AS fiscal_code,
    (array_agg(pec ORDER BY rn) FILTER (WHERE pec IS NOT NULL AND pec <> ''))[1] AS pec,
    (array_agg(pec_fe ORDER BY rn) FILTER (WHERE pec_fe IS NOT NULL AND pec_fe <> ''))[1] AS pec_fe,
    (array_agg(sdi_code ORDER BY rn) FILTER (WHERE sdi_code IS NOT NULL AND sdi_code <> ''))[1] AS sdi_code,
    (array_agg(website ORDER BY rn) FILTER (WHERE website IS NOT NULL AND website <> ''))[1] AS website,
    (array_agg(legal_name ORDER BY rn) FILTER (WHERE legal_name IS NOT NULL AND legal_name <> ''))[1] AS legal_name,
    (array_agg(legal_form ORDER BY rn) FILTER (WHERE legal_form IS NOT NULL AND legal_form <> ''))[1] AS legal_form,
    (array_agg(ateco_code ORDER BY rn) FILTER (WHERE ateco_code IS NOT NULL AND ateco_code <> ''))[1] AS ateco_code,
    (array_agg(ateco_letter ORDER BY rn) FILTER (WHERE ateco_letter IS NOT NULL AND ateco_letter <> ''))[1] AS ateco_letter,
    (array_agg(code ORDER BY rn) FILTER (WHERE code IS NOT NULL AND code <> ''))[1] AS code,
    (array_agg(owner_name ORDER BY rn) FILTER (WHERE owner_name IS NOT NULL AND owner_name <> ''))[1] AS owner_name,
    (array_agg(rating ORDER BY rn) FILTER (WHERE rating IS NOT NULL AND rating <> ''))[1] AS rating,
    (array_agg(external_id ORDER BY rn) FILTER (WHERE external_id IS NOT NULL AND external_id <> ''))[1] AS external_id,
    MIN(activity_start_date) AS activity_start_date,
    MAX(activity_end_date) AS activity_end_date,
    MAX(last_contact_at) AS last_contact_at,
    MIN(next_followup_at) AS next_followup_at,
    COALESCE(array_agg(DISTINCT t) FILTER (WHERE t IS NOT NULL), '{}'::text[]) AS tags
  FROM ordered LEFT JOIN LATERAL unnest(COALESCE(tags, '{}'::text[])) AS t ON true
  GROUP BY master_id
)
UPDATE crm_contacts m SET
  email = COALESCE(NULLIF(m.email,''), agg.email),
  phone = COALESCE(NULLIF(m.phone,''), agg.phone),
  company = COALESCE(NULLIF(m.company,''), agg.company),
  role = COALESCE(NULLIF(m.role,''), agg.role),
  source = COALESCE(NULLIF(m.source,''), agg.source),
  notes = COALESCE(NULLIF(m.notes,''), agg.notes),
  address = COALESCE(NULLIF(m.address,''), agg.address),
  city = COALESCE(NULLIF(m.city,''), agg.city),
  province = COALESCE(NULLIF(m.province,''), agg.province),
  postal_code = COALESCE(NULLIF(m.postal_code,''), agg.postal_code),
  region = COALESCE(NULLIF(m.region,''), agg.region),
  vat_number = COALESCE(NULLIF(m.vat_number,''), agg.vat_number),
  fiscal_code = COALESCE(NULLIF(m.fiscal_code,''), agg.fiscal_code),
  pec = COALESCE(NULLIF(m.pec,''), agg.pec),
  pec_fe = COALESCE(NULLIF(m.pec_fe,''), agg.pec_fe),
  sdi_code = COALESCE(NULLIF(m.sdi_code,''), agg.sdi_code),
  website = COALESCE(NULLIF(m.website,''), agg.website),
  legal_name = COALESCE(NULLIF(m.legal_name,''), agg.legal_name),
  legal_form = COALESCE(NULLIF(m.legal_form,''), agg.legal_form),
  ateco_code = COALESCE(NULLIF(m.ateco_code,''), agg.ateco_code),
  ateco_letter = COALESCE(NULLIF(m.ateco_letter,''), agg.ateco_letter),
  code = COALESCE(NULLIF(m.code,''), agg.code),
  owner_name = COALESCE(NULLIF(m.owner_name,''), agg.owner_name),
  rating = COALESCE(NULLIF(m.rating,''), agg.rating),
  external_id = COALESCE(NULLIF(m.external_id,''), agg.external_id),
  activity_start_date = COALESCE(m.activity_start_date, agg.activity_start_date),
  activity_end_date = COALESCE(m.activity_end_date, agg.activity_end_date),
  last_contact_at = GREATEST(m.last_contact_at, agg.last_contact_at),
  next_followup_at = COALESCE(m.next_followup_at, agg.next_followup_at),
  tags = (SELECT ARRAY(SELECT DISTINCT unnest(COALESCE(m.tags,'{}'::text[]) || COALESCE(agg.tags,'{}'::text[])))),
  updated_at = now()
FROM agg WHERE m.id = agg.master_id;

UPDATE calendar_events SET contact_id = dm.master_id FROM _dup_map dm WHERE calendar_events.contact_id = dm.dup_id;
UPDATE course_enrollments SET contact_id = dm.master_id FROM _dup_map dm WHERE course_enrollments.contact_id = dm.dup_id;
UPDATE crm_activities SET contact_id = dm.master_id FROM _dup_map dm WHERE crm_activities.contact_id = dm.dup_id;
UPDATE crm_client_documents SET contact_id = dm.master_id FROM _dup_map dm WHERE crm_client_documents.contact_id = dm.dup_id;
UPDATE crm_contracts SET contact_id = dm.master_id FROM _dup_map dm WHERE crm_contracts.contact_id = dm.dup_id;
UPDATE crm_employees SET contact_id = dm.master_id FROM _dup_map dm WHERE crm_employees.contact_id = dm.dup_id;
UPDATE crm_interactions SET contact_id = dm.master_id FROM _dup_map dm WHERE crm_interactions.contact_id = dm.dup_id;
UPDATE crm_locations SET contact_id = dm.master_id FROM _dup_map dm WHERE crm_locations.contact_id = dm.dup_id;
UPDATE medical_annual_reports SET contact_id = dm.master_id FROM _dup_map dm WHERE medical_annual_reports.contact_id = dm.dup_id;
UPDATE medical_health_files SET contact_id = dm.master_id FROM _dup_map dm WHERE medical_health_files.contact_id = dm.dup_id;
UPDATE medical_inspections SET contact_id = dm.master_id FROM _dup_map dm WHERE medical_inspections.contact_id = dm.dup_id;
UPDATE medical_protocols SET contact_id = dm.master_id FROM _dup_map dm WHERE medical_protocols.contact_id = dm.dup_id;
UPDATE medical_visits SET contact_id = dm.master_id FROM _dup_map dm WHERE medical_visits.contact_id = dm.dup_id;
UPDATE notes SET contact_id = dm.master_id FROM _dup_map dm WHERE notes.contact_id = dm.dup_id;

DELETE FROM crm_contacts c USING _dup_map dm WHERE c.id = dm.dup_id;
