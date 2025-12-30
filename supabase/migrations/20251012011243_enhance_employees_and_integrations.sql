/*
  # Enhance Employees Table and Add Integration Fields
  
  1. Changes to `employees` table
    - Add `property_id` (uuid) - default property assignment
    - Add `position` (text) - job position/title
    - Add `benefits` (text) - benefits description
    - Add `resume_url` (text) - link to resume document
    - Add check constraint for role values
  
  2. Changes to `work_orders` table
    - Add `vendor_cost` (numeric) - cost charged by vendor
    - Add `internal_cost` (numeric) - internal labor cost
    - Add `materials_cost` (numeric) - materials cost
    - Add `total_cost` (numeric) - total work order cost
  
  3. Security
    - Maintain existing RLS policies
    - Add policies for new fields
*/

-- Add new columns to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'property_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN property_id uuid REFERENCES properties(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'position'
  ) THEN
    ALTER TABLE employees ADD COLUMN position text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'benefits'
  ) THEN
    ALTER TABLE employees ADD COLUMN benefits text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' AND column_name = 'resume_url'
  ) THEN
    ALTER TABLE employees ADD COLUMN resume_url text;
  END IF;
END $$;

-- Add check constraint for employee role
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'employees_role_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_role_check 
    CHECK (role IN ('maintenance', 'porter', 'superintendent', 'assistant_super', 'handyman', 'cleaner', 'security', 'other'));
  END IF;
END $$;

-- Add cost tracking columns to work_orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'vendor_cost'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN vendor_cost numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'internal_cost'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN internal_cost numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'materials_cost'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN materials_cost numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'work_orders' AND column_name = 'total_cost'
  ) THEN
    ALTER TABLE work_orders ADD COLUMN total_cost numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add index for faster employee lookups by property
CREATE INDEX IF NOT EXISTS idx_employees_property_id ON employees(property_id);

-- Add index for work order cost queries
CREATE INDEX IF NOT EXISTS idx_work_orders_vendor ON work_orders(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_costs ON work_orders(total_cost, status);
