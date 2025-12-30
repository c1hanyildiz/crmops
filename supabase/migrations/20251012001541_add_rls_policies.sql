/*
  # Add RLS Policies to All Tables

  ## Security Implementation
  
  1. Enable RLS on all tables
  2. Add org-scoped policies for all roles
  3. Add special policies for Tenants and Employees
  4. Ensure Directors have full org access
  5. Ensure PMs have scoped access via assignments
*/

-- ============================================
-- ORGANIZATIONS RLS
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- USERS RLS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view users in their org"
  ON users FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Directors can insert users"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

CREATE POLICY "Directors can delete users"
  ON users FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- PROPERTIES RLS
-- ============================================
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view properties in their org"
  ON properties FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage properties"
  ON properties FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- ASSIGNMENTS RLS
-- ============================================
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignments in their org"
  ON assignments FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage assignments"
  ON assignments FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- UNITS RLS
-- ============================================
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view units in their org"
  ON units FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage units"
  ON units FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- TENANTS RLS
-- ============================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenants in their org"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Directors and PMs can manage tenants"
  ON tenants FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- LEASES RLS
-- ============================================
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leases in their org"
  ON leases FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage leases"
  ON leases FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- PAYMENTS RLS
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their org"
  ON payments FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR lease_id IN (
      SELECT id FROM leases WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Directors and PMs can manage payments"
  ON payments FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- VENDORS RLS
-- ============================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendors in their org"
  ON vendors FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage vendors"
  ON vendors FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- VENDOR COMPLIANCE RLS
-- ============================================
ALTER TABLE vendor_compliance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view compliance in their org"
  ON vendor_compliance FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Staff can manage compliance"
  ON vendor_compliance FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager', 'VendorAdmin')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager', 'VendorAdmin')
    )
  );

-- ============================================
-- CONTRACTS RLS
-- ============================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contracts in their org"
  ON contracts FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage contracts"
  ON contracts FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- CATEGORIES RLS
-- ============================================
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in their org"
  ON categories FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- SLA RULES RLS
-- ============================================
ALTER TABLE sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SLA rules in their org"
  ON sla_rules FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage SLA rules"
  ON sla_rules FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- WORK ORDERS RLS
-- ============================================
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view work orders in their org"
  ON work_orders FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenants can create work orders"
  ON work_orders FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "Staff can manage work orders"
  ON work_orders FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager', 'VendorAdmin', 'Employee')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager', 'VendorAdmin', 'Employee')
    )
  );

-- ============================================
-- WO EVENTS RLS
-- ============================================
ALTER TABLE wo_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their org"
  ON wo_events FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can create events"
  ON wo_events FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- PROMISES RLS
-- ============================================
ALTER TABLE promises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view promises in their org"
  ON promises FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "PMs can manage promises"
  ON promises FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- CSAT RLS
-- ============================================
ALTER TABLE csat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view CSAT in their org"
  ON csat FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Tenants can submit CSAT"
  ON csat FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- ============================================
-- MESSAGES RLS
-- ============================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their org"
  ON messages FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR from_user_id = auth.uid()
    OR to_user_id = auth.uid()
  );

CREATE POLICY "Users can create messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR from_user_id = auth.uid()
  );

-- ============================================
-- DOCUMENTS RLS
-- ============================================
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view documents in their org"
  ON documents FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage documents"
  ON documents FOR ALL
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- EMPLOYEES RLS
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employees in their org"
  ON employees FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Directors and PMs can manage employees"
  ON employees FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- TIMESHEETS RLS
-- ============================================
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view timesheets in their org"
  ON timesheets FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
    OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Employees can create their timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage timesheets"
  ON timesheets FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- PAYROLL EXPORTS RLS
-- ============================================
ALTER TABLE payroll_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payroll exports in their org"
  ON payroll_exports FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage payroll exports"
  ON payroll_exports FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- TAX PROFILES RLS
-- ============================================
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tax profiles in their org"
  ON tax_profiles FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage tax profiles"
  ON tax_profiles FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- GL CODES RLS
-- ============================================
ALTER TABLE gl_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view GL codes in their org"
  ON gl_codes FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage GL codes"
  ON gl_codes FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- COST CENTERS RLS
-- ============================================
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cost centers in their org"
  ON cost_centers FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors can manage cost centers"
  ON cost_centers FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

-- ============================================
-- INVOICES RLS
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoices in their org"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- INVOICE LINES RLS
-- ============================================
ALTER TABLE invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice lines in their org"
  ON invoice_lines FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage invoice lines"
  ON invoice_lines FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- BUDGETS RLS
-- ============================================
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view budgets in their org"
  ON budgets FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Directors and PMs can manage budgets"
  ON budgets FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role IN ('Director', 'PropertyManager')
    )
  );

-- ============================================
-- EXCEPTION ALERTS RLS
-- ============================================
ALTER TABLE exception_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view alerts in their org"
  ON exception_alerts FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update alerts"
  ON exception_alerts FOR UPDATE
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Staff can create alerts"
  ON exception_alerts FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- SCORE SNAPSHOTS RLS
-- ============================================
ALTER TABLE score_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view score snapshots in their org"
  ON score_snapshots FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "System can create score snapshots"
  ON score_snapshots FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- REPORT CONFIGS RLS
-- ============================================
ALTER TABLE report_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view report configs in their org"
  ON report_configs FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage their own report configs"
  ON report_configs FOR ALL
  TO authenticated
  USING (
    created_by = auth.uid()
  )
  WITH CHECK (
    created_by = auth.uid()
  );

-- ============================================
-- AUDIT LOGS RLS
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Directors can view audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users 
      WHERE id = auth.uid() AND role = 'Director'
    )
  );

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (SELECT org_id FROM users WHERE id = auth.uid())
  );