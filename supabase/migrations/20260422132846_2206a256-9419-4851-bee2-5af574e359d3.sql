
-- Step 1: Per ogni contatto, unisci i duplicati copiando i dati dal record "nuovo" (con dati) al record "vecchio" (con location_id)
-- Match: stesso contact_id + stesso nome+cognome (case-insensitive, trimmed)
WITH old_records AS (
  SELECT 
    id,
    contact_id,
    UPPER(TRIM(first_name)) AS fn,
    UPPER(TRIM(last_name)) AS ln,
    ROW_NUMBER() OVER (PARTITION BY contact_id, UPPER(TRIM(first_name)), UPPER(TRIM(last_name)) ORDER BY created_at) AS rn
  FROM crm_employees
  WHERE location_id IS NOT NULL
    AND fiscal_code IS NULL
    AND birth_date IS NULL
    AND hire_date IS NULL
),
new_records AS (
  SELECT 
    id,
    contact_id,
    UPPER(TRIM(first_name)) AS fn,
    UPPER(TRIM(last_name)) AS ln,
    fiscal_code,
    birth_date,
    birth_place,
    hire_date,
    termination_date,
    role,
    status,
    email,
    phone,
    first_name,
    last_name,
    ROW_NUMBER() OVER (PARTITION BY contact_id, UPPER(TRIM(first_name)), UPPER(TRIM(last_name)) ORDER BY updated_at DESC) AS rn
  FROM crm_employees
  WHERE location_id IS NULL
    AND (fiscal_code IS NOT NULL OR birth_date IS NOT NULL OR hire_date IS NOT NULL)
),
matches AS (
  SELECT 
    o.id AS old_id,
    n.id AS new_id,
    n.fiscal_code,
    n.birth_date,
    n.birth_place,
    n.hire_date,
    n.termination_date,
    n.role,
    n.status,
    n.email,
    n.phone,
    n.first_name AS proper_first_name,
    n.last_name AS proper_last_name
  FROM old_records o
  INNER JOIN new_records n 
    ON o.contact_id = n.contact_id 
    AND o.fn = n.fn 
    AND o.ln = n.ln
  WHERE o.rn = 1 AND n.rn = 1
)
UPDATE crm_employees e
SET 
  fiscal_code = m.fiscal_code,
  birth_date = m.birth_date,
  birth_place = m.birth_place,
  hire_date = m.hire_date,
  termination_date = COALESCE(m.termination_date, e.termination_date),
  role = COALESCE(m.role, e.role),
  status = CASE WHEN m.termination_date IS NOT NULL THEN 'inactive' ELSE COALESCE(m.status, e.status) END,
  email = COALESCE(m.email, e.email),
  phone = COALESCE(m.phone, e.phone),
  first_name = m.proper_first_name,
  last_name = m.proper_last_name,
  updated_at = now()
FROM matches m
WHERE e.id = m.old_id;

-- Step 2: Elimina i duplicati "nuovi" (senza location) che sono stati uniti, e tutte le loro attività collegate
WITH old_records AS (
  SELECT 
    contact_id,
    UPPER(TRIM(first_name)) AS fn,
    UPPER(TRIM(last_name)) AS ln
  FROM crm_employees
  WHERE location_id IS NOT NULL
),
to_delete AS (
  SELECT n.id
  FROM crm_employees n
  INNER JOIN old_records o
    ON o.contact_id = n.contact_id
    AND o.fn = UPPER(TRIM(n.first_name))
    AND o.ln = UPPER(TRIM(n.last_name))
  WHERE n.location_id IS NULL
)
DELETE FROM crm_employees WHERE id IN (SELECT id FROM to_delete);
