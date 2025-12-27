-- Insert mock sensor readings for testing graphs
-- Using sensor: ARCSOM - blue workspace (ed0206b8-1dba-467f-b9c1-09a306abd3bb)
-- Creating 12 readings over the last 2 hours (one every 10 minutes)

-- Helper: Generate timestamps for last 2 hours, every 10 minutes
INSERT INTO sensor_readings (sensor_id, co2_level, temperature, humidity, timestamp, source)
VALUES
  -- 2 hours ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 420, 21.5, 45.2, NOW() - INTERVAL '120 minutes', 1),

  -- 110 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 450, 21.8, 46.1, NOW() - INTERVAL '110 minutes', 1),

  -- 100 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 520, 22.1, 47.3, NOW() - INTERVAL '100 minutes', 1),

  -- 90 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 680, 22.5, 48.5, NOW() - INTERVAL '90 minutes', 1),

  -- 80 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 850, 22.8, 49.2, NOW() - INTERVAL '80 minutes', 1),

  -- 70 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 920, 23.2, 50.1, NOW() - INTERVAL '70 minutes', 1),

  -- 60 minutes ago (1 hour)
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 1050, 23.5, 51.3, NOW() - INTERVAL '60 minutes', 1),

  -- 50 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 1120, 23.7, 52.0, NOW() - INTERVAL '50 minutes', 1),

  -- 40 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 980, 23.4, 51.5, NOW() - INTERVAL '40 minutes', 1),

  -- 30 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 750, 23.0, 50.2, NOW() - INTERVAL '30 minutes', 1),

  -- 20 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 580, 22.6, 48.8, NOW() - INTERVAL '20 minutes', 1),

  -- 10 minutes ago
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 460, 22.2, 47.5, NOW() - INTERVAL '10 minutes', 1),

  -- Now (most recent)
  ('ed0206b8-1dba-467f-b9c1-09a306abd3bb', 430, 21.9, 46.8, NOW(), 1);

-- Update sensor with last reading info
UPDATE sensors
SET
  last_reading_co2 = 430,
  last_reading_temperature = 21.9,
  last_reading_humidity = 46.8,
  last_reading_at = NOW()
WHERE id = 'ed0206b8-1dba-467f-b9c1-09a306abd3bb';

-- Add readings for another sensor too (green workspace)
INSERT INTO sensor_readings (sensor_id, co2_level, temperature, humidity, timestamp, source)
VALUES
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 550, 20.5, 44.0, NOW() - INTERVAL '120 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 590, 20.8, 44.5, NOW() - INTERVAL '110 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 620, 21.0, 45.0, NOW() - INTERVAL '100 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 680, 21.3, 45.8, NOW() - INTERVAL '90 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 750, 21.6, 46.5, NOW() - INTERVAL '80 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 820, 21.9, 47.2, NOW() - INTERVAL '70 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 780, 21.7, 46.9, NOW() - INTERVAL '60 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 710, 21.4, 46.2, NOW() - INTERVAL '50 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 650, 21.2, 45.6, NOW() - INTERVAL '40 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 590, 20.9, 45.0, NOW() - INTERVAL '30 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 540, 20.7, 44.5, NOW() - INTERVAL '20 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 510, 20.5, 44.2, NOW() - INTERVAL '10 minutes', 1),
  ('2b5111c8-779f-48f1-abbf-851f382282b6', 490, 20.4, 44.0, NOW(), 1);

UPDATE sensors
SET
  last_reading_co2 = 490,
  last_reading_temperature = 20.4,
  last_reading_humidity = 44.0,
  last_reading_at = NOW()
WHERE id = '2b5111c8-779f-48f1-abbf-851f382282b6';
