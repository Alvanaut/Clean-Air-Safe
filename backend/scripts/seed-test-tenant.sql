-- Seed test tenant with KSP contract ID
-- This tenant will be used to test KSP synchronization

INSERT INTO tenants (
  id,
  name,
  company_name,
  contact_email,
  ksp_contract_id,
  sync_enabled,
  sync_interval_seconds,
  default_co2_threshold,
  status,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Tenant',
  'Test Company',
  'contact@example.com',
  'REPLACE_WITH_YOUR_KSP_CONTRACT_ID',  -- Get this from your KSP account
  true,
  600,  -- 10 minutes in seconds
  1000,
  'active',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;
