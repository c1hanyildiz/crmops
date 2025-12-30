/*
  # Highline Ops Multi-Tenant Property Management System - Part 1: Tables

  ## Overview
  Complete schema for NYC commercial/multifamily property operations with multi-tenant support.
  
  ## Tables Created
  All core tables with foreign key relationships but without RLS policies initially.
  Policies will be added in a second migration to avoid circular dependencies.
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  timezone text DEFAULT 'America/New_York',
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- USERS (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Director', 'PropertyManager', 'VendorAdmin', 'Tenant', 'Employee')),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'invited', 'disabled')),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PROPERTIES
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address1 text NOT NULL,
  address2 text,
  city text NOT NULL,
  state text NOT NULL,
  zip text NOT NULL,
  type text CHECK (type IN ('office', 'mf', 'retail', 'industrial', 'medical', 'mixed')),
  rsf integer,
  director_id uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- ASSIGNMENTS (PM to Property mapping)
-- ============================================
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  pm_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(property_id, pm_user_id)
);

-- ============================================
-- UNITS
-- ============================================
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  label text NOT NULL,
  beds integer,
  baths numeric(3,1),
  sqft integer,
  status text DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'make-ready')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- TENANTS (separate from users table)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  background_check_status text DEFAULT 'n/a' CHECK (background_check_status IN ('pending', 'passed', 'failed', 'n/a')),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- LEASES
-- ============================================
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  monthly_rent numeric(10,2) NOT NULL,
  deposit numeric(10,2) DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'ended')),
  doc_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lease_id uuid NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount numeric(10,2) NOT NULL,
  method text CHECK (method IN ('stripe', 'ach', 'check', 'cash')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  provider_txn_id text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- VENDORS
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  trade_category text CHECK (trade_category IN ('hvac', 'electrical', 'plumbing', 'fire', 'elevators', 'bms', 'security', 'cleaning', 'landscaping', 'facade', 'pest', 'waste', 'handyman')),
  rating integer CHECK (rating >= 0 AND rating <= 100),
  service_area text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- VENDOR COMPLIANCE
-- ============================================
CREATE TABLE IF NOT EXISTS vendor_compliance (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type text CHECK (type IN ('coi', 'permit')),
  file_url text,
  coverage_start date,
  coverage_end date,
  status text CHECK (status IN ('valid', 'expiring', 'expired')),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- CONTRACTS
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date,
  cap_amount numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- CATEGORIES
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SLA RULES
-- ============================================
CREATE TABLE IF NOT EXISTS sla_rules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
  hours_to_due integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, category, priority)
);

-- ============================================
-- WORK ORDERS
-- ============================================
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES units(id),
  tenant_id uuid REFERENCES tenants(id),
  category text CHECK (category IN ('hvac', 'electrical', 'plumbing', 'fire', 'elevators', 'bms', 'security', 'cleaning', 'landscaping', 'facade', 'pest', 'waste', 'handyman', 'general')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'emergency')),
  status text DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'scheduled', 'in-progress', 'waiting-parts', 'completed', 'closed', 'canceled')),
  description text NOT NULL,
  photos text[],
  sla_due_at timestamptz,
  assigned_vendor_id uuid REFERENCES vendors(id),
  assigned_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- WO EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS wo_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workorder_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  type text CHECK (type IN ('status', 'message', 'note', 'photo', 'system')),
  message text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PROMISES
-- ============================================
CREATE TABLE IF NOT EXISTS promises (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workorder_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  pm_user_id uuid NOT NULL REFERENCES users(id),
  promise_type text CHECK (promise_type IN ('ETA', 'FollowUp')),
  promised_at timestamptz DEFAULT now(),
  due_at timestamptz NOT NULL,
  fulfilled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- CSAT
-- ============================================
CREATE TABLE IF NOT EXISTS csat (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workorder_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  score int CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  thread_id uuid,
  from_user_id uuid REFERENCES users(id),
  to_user_id uuid REFERENCES users(id),
  to_tenant_id uuid REFERENCES tenants(id),
  channel text CHECK (channel IN ('email', 'sms', 'inapp')),
  subject text,
  body text NOT NULL,
  attachments text[],
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_type text NOT NULL,
  owner_id uuid NOT NULL,
  label text NOT NULL,
  file_url text NOT NULL,
  tags jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- EMPLOYEES
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  name text NOT NULL,
  email text,
  phone text,
  role text CHECK (role IN ('superintendent', 'porter', 'handyman', 'pm_assistant', 'other')),
  union_flag boolean DEFAULT false,
  hourly_rate numeric(10,2) DEFAULT 0,
  burden_pct numeric(5,2) DEFAULT 0,
  skills jsonb,
  certs jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- TIMESHEETS
-- ============================================
CREATE TABLE IF NOT EXISTS timesheets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  workorder_id uuid REFERENCES work_orders(id),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours_reg numeric(5,2) DEFAULT 0,
  hours_ot numeric(5,2) DEFAULT 0,
  notes text,
  approved_by uuid REFERENCES users(id),
  approved_at timestamptz,
  locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- PAYROLL EXPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_exports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  file_url text,
  status text DEFAULT 'generated' CHECK (status IN ('generated', 'exported', 'void')),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- TAX PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS tax_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  jurisdiction text NOT NULL,
  tax_rate numeric(5,4) NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- GL CODES
-- ============================================
CREATE TABLE IF NOT EXISTS gl_codes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, code)
);

-- ============================================
-- COST CENTERS
-- ============================================
CREATE TABLE IF NOT EXISTS cost_centers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, code)
);

-- ============================================
-- INVOICES
-- ============================================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text,
  property_id uuid REFERENCES properties(id),
  period_start date,
  period_end date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'void')),
  subtotal numeric(10,2) DEFAULT 0,
  tax numeric(10,2) DEFAULT 0,
  total numeric(10,2) DEFAULT 0,
  due_date date,
  qb_export_ref text,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INVOICE LINES
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type text CHECK (type IN ('labor', 'vendor', 'parts', 'fee', 'tax')),
  ref_id text,
  description text NOT NULL,
  qty numeric(10,2) DEFAULT 1,
  unit_price numeric(10,2) DEFAULT 0,
  amount numeric(10,2) DEFAULT 0,
  gl_code text,
  cost_center text,
  workorder_id uuid REFERENCES work_orders(id),
  employee_id uuid REFERENCES employees(id),
  vendor_id uuid REFERENCES vendors(id),
  locked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- BUDGETS
-- ============================================
CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  category text NOT NULL,
  period_month integer CHECK (period_month >= 1 AND period_month <= 12),
  period_year integer,
  amount numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, property_id, category, period_month, period_year)
);

-- ============================================
-- EXCEPTION ALERTS
-- ============================================
CREATE TABLE IF NOT EXISTS exception_alerts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  rule_code text NOT NULL,
  severity text CHECK (severity IN ('info', 'warn', 'critical')),
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'ack', 'closed')),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- SCORE SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS score_snapshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id uuid REFERENCES properties(id),
  vendor_id uuid REFERENCES vendors(id),
  pm_user_id uuid REFERENCES users(id),
  kind text CHECK (kind IN ('TSI', 'PM_COMMS', 'VENDOR')),
  score integer CHECK (score >= 0 AND score <= 100),
  period_month integer,
  period_year integer,
  calc_json jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- REPORT CONFIGS
-- ============================================
CREATE TABLE IF NOT EXISTS report_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  dimensions jsonb,
  measures jsonb,
  filters jsonb,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  pre_values jsonb,
  post_values jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_properties_org_id ON properties(org_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_org_id ON work_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_property_id ON work_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_assigned_vendor_id ON work_orders(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org_id ON vendors(org_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_id ON timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_lease_id ON payments(lease_id);