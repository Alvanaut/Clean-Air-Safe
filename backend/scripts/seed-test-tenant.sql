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
  'CleanAirSafe Test',
  'CLEAN AIR SAFE',
  'alexis.vanautgaerden1@gmail.com',
  '3c419280-35a0-4c50-8922-3d461adaaf3a',  -- KSP Contract ID from API
  true,
  600,  -- 10 minutes in seconds
  1000,
  'active',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;
