import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, FileText, X, Edit2, Trash2, DollarSign, Calendar, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';

interface Invoice {
  id: string;
  client_name: string;
  client_email?: string;
  property_id?: string;
  tenant_id?: string;
  period_start?: string;
  period_end?: string;
  status?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  due_date?: string;
  created_at: string;
  property?: {
    name: string;
  };
  tenant?: {
    name: string;
  };
  line_count?: number;
}

interface InvoiceLine {
  id: string;
  type?: string;
  ref_id?: string;
  description: string;
  qty?: number;
  unit_price?: number;
  amount?: number;
  workorder_id?: string;
  employee_id?: string;
  vendor_id?: string;
  locked?: boolean;
  work_order?: {
    category: string;
    description: string;
  };
  employee?: {
    name: string;
  };
  vendor?: {
    name: string;
  };
}

interface Property {
  id: string;
  name: string;
}

interface Tenant {
  id: string;
  name: string;
  property_id?: string;
  suite?: string;
}

interface WorkOrder {
  id: string;
  category: string;
  description: string;
  vendor_cost?: number;
  property: {
    name: string;
  };
}

interface Employee {
  id: string;
  name: string;
  hourly_rate?: number;
}

interface Vendor {
  id: string;
  name: string;
}

export function Invoicing() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [availableWorkOrders, setAvailableWorkOrders] = useState<WorkOrder[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [availableVendors, setAvailableVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    bill_to: 'property',
    client_name: '',
    client_email: '',
    property_id: '',
    tenant_id: '',
    period_start: '',
    period_end: '',
    status: 'draft',
    due_date: '',
    tax_rate: '8.875',
  });

  const [lineFormData, setLineFormData] = useState({
    type: 'labor',
    description: '',
    qty: '1',
    unit_price: '',
    workorder_id: '',
    employee_id: '',
    vendor_id: '',
    bill_vendor: false,
  });

  useEffect(() => {
    loadInvoices();
    loadProperties();
    loadTenants();
    loadWorkOrders();
    loadEmployees();
    loadVendors();
  }, []);

  useEffect(() => {
    if (formData.property_id) {
      const filtered = tenants.filter(t => t.property_id === formData.property_id);
      setFilteredTenants(filtered);
      if (formData.tenant_id && !filtered.find(t => t.id === formData.tenant_id)) {
        setFormData({ ...formData, tenant_id: '' });
      }
    } else {
      setFilteredTenants([]);
      setFormData({ ...formData, tenant_id: '' });
    }
  }, [formData.property_id, tenants]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const loadTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('id, name, property_id, suite')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const loadWorkOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          category,
          description,
          vendor_cost,
          property:properties(name)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAvailableWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, name, hourly_rate')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      setAvailableEmployees(data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setAvailableVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          property:properties(name),
          tenant:tenants(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const invoicesWithLines = await Promise.all(
        (data || []).map(async (invoice) => {
          const { count } = await supabase
            .from('invoice_lines')
            .select('*', { count: 'exact', head: true })
            .eq('invoice_id', invoice.id);

          return {
            ...invoice,
            line_count: count || 0,
          };
        })
      );

      setInvoices(invoicesWithLines);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceLines = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_lines')
        .select(`
          *,
          work_order:work_orders(category, description),
          employee:employees(name),
          vendor:vendors(name)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at');

      if (error) throw error;
      setInvoiceLines(data || []);
    } catch (error) {
      console.error('Error loading invoice lines:', error);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const clientName = formData.bill_to === 'tenant' && formData.tenant_id
        ? filteredTenants.find(t => t.id === formData.tenant_id)?.name || formData.client_name
        : formData.bill_to === 'property' && formData.property_id
        ? properties.find(p => p.id === formData.property_id)?.name || formData.client_name
        : formData.client_name;

      const { error } = await supabase.from('invoices').insert({
        org_id: profile?.org_id,
        client_name: clientName,
        client_email: formData.client_email || null,
        property_id: formData.property_id || null,
        tenant_id: formData.bill_to === 'tenant' ? (formData.tenant_id || null) : null,
        period_start: formData.period_start || null,
        period_end: formData.period_end || null,
        status: formData.status,
        due_date: formData.due_date || null,
        subtotal: 0,
        tax: 0,
        total: 0,
      });

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      loadInvoices();
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddInvoiceLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setSaving(true);

    try {
      const qty = parseFloat(lineFormData.qty) || 1;
      const unitPrice = parseFloat(lineFormData.unit_price) || 0;
      const amount = qty * unitPrice;

      const { error } = await supabase.from('invoice_lines').insert({
        org_id: profile?.org_id,
        invoice_id: selectedInvoice.id,
        type: lineFormData.type,
        description: lineFormData.description,
        qty,
        unit_price: unitPrice,
        amount,
        workorder_id: lineFormData.workorder_id || null,
        employee_id: lineFormData.employee_id || null,
        vendor_id: lineFormData.vendor_id || null,
      });

      if (error) throw error;

      await recalculateInvoiceTotal(selectedInvoice.id);
      setShowAddLineModal(false);
      resetLineForm();
      loadInvoiceLines(selectedInvoice.id);
      loadInvoices();
    } catch (error) {
      console.error('Error adding invoice line:', error);
      alert('Failed to add line item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInvoiceLine = async (lineId: string) => {
    if (!selectedInvoice || !confirm('Remove this line item?')) return;

    try {
      const { error } = await supabase
        .from('invoice_lines')
        .delete()
        .eq('id', lineId);

      if (error) throw error;

      await recalculateInvoiceTotal(selectedInvoice.id);
      loadInvoiceLines(selectedInvoice.id);
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice line:', error);
      alert('Failed to delete line item.');
    }
  };

  const recalculateInvoiceTotal = async (invoiceId: string) => {
    try {
      const { data: lines } = await supabase
        .from('invoice_lines')
        .select('amount')
        .eq('invoice_id', invoiceId);

      const subtotal = (lines || []).reduce((sum, line) => sum + (line.amount || 0), 0);
      const taxRate = parseFloat(formData.tax_rate) / 100 || 0.08875;
      const tax = subtotal * taxRate;
      const total = subtotal + tax;

      await supabase
        .from('invoices')
        .update({ subtotal, tax, total })
        .eq('id', invoiceId);
    } catch (error) {
      console.error('Error recalculating totals:', error);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;

      loadInvoices();
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice({ ...selectedInvoice, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('Failed to update invoice status.');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Delete this invoice? This will also delete all line items.')) return;

    try {
      await supabase.from('invoice_lines').delete().eq('invoice_id', invoiceId);

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      setShowDetailModal(false);
      setSelectedInvoice(null);
      loadInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice.');
    }
  };

  const resetForm = () => {
    setFormData({
      bill_to: 'property',
      client_name: '',
      client_email: '',
      property_id: '',
      tenant_id: '',
      period_start: '',
      period_end: '',
      status: 'draft',
      due_date: '',
      tax_rate: '8.875',
    });
  };

  const resetLineForm = () => {
    setLineFormData({
      type: 'labor',
      description: '',
      qty: '1',
      unit_price: '',
      workorder_id: '',
      employee_id: '',
      vendor_id: '',
      bill_vendor: false,
    });
  };

  const openDetailModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
    loadInvoiceLines(invoice.id);
  };

  const handleWorkOrderSelect = (workOrderId: string) => {
    const wo = availableWorkOrders.find(w => w.id === workOrderId);
    if (wo) {
      setLineFormData({
        ...lineFormData,
        workorder_id: workOrderId,
        description: `${wo.category} - ${wo.description}`,
        unit_price: wo.vendor_cost?.toString() || '',
      });
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const emp = availableEmployees.find(e => e.id === employeeId);
    if (emp) {
      setLineFormData({
        ...lineFormData,
        employee_id: employeeId,
        description: `Labor - ${emp.name}`,
        unit_price: emp.hourly_rate?.toString() || '',
      });
    }
  };

  const handleVendorSelect = (vendorId: string) => {
    const vendor = availableVendors.find(v => v.id === vendorId);
    if (vendor) {
      setLineFormData({
        ...lineFormData,
        vendor_id: vendorId,
        description: `Service - ${vendor.name}`,
      });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'sent': return 'bg-blue-100 text-blue-700';
      case 'paid': return 'bg-green-100 text-green-700';
      case 'void': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'draft': return <Edit2 className="w-4 h-4" />;
      case 'sent': return <Clock className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'void': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleNavigateToWorkOrder = (workOrderId: string) => {
    navigate('/work-orders', { state: { openWorkOrderId: workOrderId } });
  };

  const handleNavigateToEmployee = (employeeId: string) => {
    navigate('/employees', { state: { openEmployeeId: employeeId } });
  };

  const handleNavigateToVendor = (vendorId: string) => {
    navigate('/vendors', { state: { openVendorId: vendorId } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Invoicing</h1>
          <p className="text-gray-600">Create and manage client invoices</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {invoices.map((invoice) => (
          <div
            key={invoice.id}
            onClick={() => openDetailModal(invoice)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor(invoice.status)}`}>
                {getStatusIcon(invoice.status)}
                {invoice.status}
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{invoice.client_name}</h3>
            {invoice.property && (
              <p className="text-sm text-gray-500 mb-4">{invoice.property.name}</p>
            )}

            <div className="space-y-2 mb-4">
              {invoice.due_date && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                </div>
              )}
              {invoice.period_start && invoice.period_end && (
                <div className="text-xs text-gray-500">
                  Period: {new Date(invoice.period_start).toLocaleDateString()} - {new Date(invoice.period_end).toLocaleDateString()}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${invoice.total?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 mb-1">Line Items</div>
                  <div className="text-lg font-bold text-blue-600">{invoice.line_count || 0}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {invoices.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No invoices found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Create New Invoice</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bill To
                </label>
                <select
                  value={formData.bill_to}
                  onChange={(e) => setFormData({ ...formData, bill_to: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="property">Property (Building)</option>
                  <option value="tenant">Tenant</option>
                  <option value="custom">Custom Client</option>
                </select>
              </div>

              {formData.bill_to === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      required
                      placeholder="ABC Property Management"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Email
                    </label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      placeholder="billing@client.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>
              )}

              {(formData.bill_to === 'property' || formData.bill_to === 'tenant') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Property</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.bill_to === 'tenant' && formData.property_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Tenant</option>
                    {filteredTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} {tenant.suite && `- Suite ${tenant.suite}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period Start
                  </label>
                  <input
                    type="date"
                    value={formData.period_start}
                    onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Period End
                  </label>
                  <input
                    type="date"
                    value={formData.period_end}
                    onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="void">Void</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedInvoice.client_name}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Invoice #{selectedInvoice.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <select
                    value={selectedInvoice.status}
                    onChange={(e) => handleUpdateInvoiceStatus(selectedInvoice.id, e.target.value)}
                    className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedInvoice.status)}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="void">Void</option>
                  </select>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Subtotal</div>
                  <div className="text-lg font-bold text-gray-900">
                    ${selectedInvoice.subtotal?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Tax</div>
                  <div className="text-lg font-bold text-gray-900">
                    ${selectedInvoice.tax?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Total</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedInvoice.total?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Line Items</h3>
                <button
                  onClick={() => setShowAddLineModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Line Item
                </button>
              </div>

              {invoiceLines.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No line items yet</p>
              ) : (
                <div className="space-y-2">
                  {invoiceLines.map((line) => (
                    <div key={line.id} className="p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{line.description}</div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>Qty: {line.qty}</span>
                            <span>×</span>
                            <span>${line.unit_price?.toFixed(2)}</span>
                            {line.employee && (
                              <button
                                onClick={() => handleNavigateToEmployee(line.employee_id!)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Employee: {line.employee.name}
                              </button>
                            )}
                            {line.vendor && (
                              <button
                                onClick={() => handleNavigateToVendor(line.vendor_id!)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                Vendor: {line.vendor.name}
                              </button>
                            )}
                            {line.work_order && (
                              <button
                                onClick={() => handleNavigateToWorkOrder(line.workorder_id!)}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                WO: {line.work_order.category}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold text-gray-900">
                            ${line.amount?.toFixed(2)}
                          </div>
                          {!line.locked && (
                            <button
                              onClick={() => handleDeleteInvoiceLine(line.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleDeleteInvoice(selectedInvoice.id)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Delete Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddLineModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Add Line Item</h2>
              <button
                onClick={() => {
                  setShowAddLineModal(false);
                  resetLineForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddInvoiceLine} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <select
                  value={lineFormData.type}
                  onChange={(e) => setLineFormData({ ...lineFormData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="labor">Labor</option>
                  <option value="vendor">Vendor Service</option>
                  <option value="parts">Parts/Materials</option>
                  <option value="fee">Fee</option>
                  <option value="tax">Tax</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Work Order (Optional)
                </label>
                <select
                  value={lineFormData.workorder_id}
                  onChange={(e) => handleWorkOrderSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">None</option>
                  {availableWorkOrders.map((wo) => (
                    <option key={wo.id} value={wo.id}>
                      {wo.category} - {wo.property.name} - ${wo.vendor_cost?.toFixed(2) || '0.00'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Employee (Optional)
                </label>
                <select
                  value={lineFormData.employee_id}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">None</option>
                  {availableEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - ${emp.hourly_rate?.toFixed(2)}/hr
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link to Vendor (Optional)
                </label>
                <select
                  value={lineFormData.vendor_id}
                  onChange={(e) => handleVendorSelect(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">None</option>
                  {availableVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={lineFormData.description}
                  onChange={(e) => setLineFormData({ ...lineFormData, description: e.target.value })}
                  required
                  rows={2}
                  placeholder="Description of work performed"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={lineFormData.qty}
                    onChange={(e) => setLineFormData({ ...lineFormData, qty: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={lineFormData.unit_price}
                    onChange={(e) => setLineFormData({ ...lineFormData, unit_price: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Line Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${((parseFloat(lineFormData.qty) || 0) * (parseFloat(lineFormData.unit_price) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddLineModal(false);
                    resetLineForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Line Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
