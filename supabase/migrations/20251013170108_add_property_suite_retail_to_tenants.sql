/*
  # Add property, suite, and retail fields to tenants

  1. Changes
    - Add `property_id` column to link tenant to property
    - Add `suite` column for suite/unit number
    - Add `retail` boolean flag to indicate if tenant is retail (vs residential)
    - Add foreign key constraint to properties table
    - Add index for property_id lookups

  2. Security
    - Existing RLS policies will continue to work
*/

-- Add new columns to tenants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN property_id uuid REFERENCES properties(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'suite'
  ) THEN
    ALTER TABLE tenants ADD COLUMN suite text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'retail'
  ) THEN
    ALTER TABLE tenants ADD COLUMN retail boolean DEFAULT false;
  END IF;
END $$;

-- Create index for property lookups
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
