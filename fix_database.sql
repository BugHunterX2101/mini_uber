-- Add missing columns to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS latitude FLOAT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS longitude FLOAT;
