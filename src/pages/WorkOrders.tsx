import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Filter, Clock, AlertCircle, X, Building2, User, Calendar, FileText, DollarSign, Wrench } from 'lucide-react';

interface WorkOrder {
  id: string;
  property_id: string;
  tenant_id?: string;
  assigned_vendor_id?: string;
  category: string;
  priority: string;
  status: string;
  description: string;
  vendor_cost?: number;
  internal_cost?: number;
  materials_cost?: number;
  total_cost?: number;
  sla_due_at?: string;
  created_at: string;
  properties?: { name: string };
  tenants?: { name: string };
  vendor?: { name: string };
}

interface Property {
  id: string;
  name: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface Vendor {
  id: string;
  name: string;
  trade_category?: string;
}

export function WorkOrders() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    property_id: '',
    tenant_id: '',
    assigned_vendor_id: '',
    category: 'general',
    priority: 'normal',
    status: 'new',
    description: '',
    vendor_cost: '',
    internal_cost: '',
    materials_cost: '',
  });

  useEffect(() => {
    loadWorkOrders();
    loadProperties();
    loadTenants();
    loadVendors();
  }, [filter]);

  useEffect(() => {
    const state = location.state as { openWorkOrderId?: string };
    if (state?.openWorkOrderId && workOrders.length > 0) {
      const wo = workOrders.find(w => w.id === state.openWorkOrderId);
      if (wo) {
        openDetailModal(wo);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, workOrders]);

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('id, name, trade_category')
        .order('name');

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error loading vendors:', error);
    }
  };

  const loadWorkOrders = async () => {
    try {
      let query = supabase
        .from('work_orders')
        .select(`
          *,
          properties(name),
          tenants(name),
          vendor:vendors(name)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    } finally {
      setLoading(false);
    }
  };

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
        .select('id, name')
        .order('name');

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error loading tenants:', error);
    }
  };

  const calculateTotalCost = () => {
    const vendor = parseFloat(formData.vendor_cost) || 0;
    const internal = parseFloat(formData.internal_cost) || 0;
    const materials = parseFloat(formData.materials_cost) || 0;
    return vendor + internal + materials;
  };

  const handleCreateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const vendorCost = parseFloat(formData.vendor_cost) || 0;
      const internalCost = parseFloat(formData.internal_cost) || 0;
      const materialsCost = parseFloat(formData.materials_cost) || 0;
      const totalCost = vendorCost + internalCost + materialsCost;

      const { error } = await supabase.from('work_orders').insert({
        org_id: profile?.org_id,
        property_id: formData.property_id,
        tenant_id: formData.tenant_id || null,
        assigned_vendor_id: formData.assigned_vendor_id || null,
        category: formData.category,
        priority: formData.priority,
        status: formData.status,
        description: formData.description,
        vendor_cost: vendorCost,
        internal_cost: internalCost,
        materials_cost: materialsCost,
        total_cost: totalCost,
      });

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      loadWorkOrders();
    } catch (error) {
      console.error('Error creating work order:', error);
      alert('Failed to create work order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWorkOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkOrder) return;
    setSaving(true);

    try {
      const vendorCost = parseFloat(formData.vendor_cost) || 0;
      const internalCost = parseFloat(formData.internal_cost) || 0;
      const materialsCost = parseFloat(formData.materials_cost) || 0;
      const totalCost = vendorCost + internalCost + materialsCost;

      const { error } = await supabase
        .from('work_orders')
        .update({
          property_id: formData.property_id,
          tenant_id: formData.tenant_id || null,
          assigned_vendor_id: formData.assigned_vendor_id || null,
          category: formData.category,
          priority: formData.priority,
          status: formData.status,
          description: formData.description,
          vendor_cost: vendorCost,
          internal_cost: internalCost,
          materials_cost: materialsCost,
          total_cost: totalCost,
        })
        .eq('id', selectedWorkOrder.id);

      if (error) throw error;

      setShowEditModal(false);
      setShowDetailModal(false);
      resetForm();
      loadWorkOrders();
    } catch (error) {
      console.error('Error updating work order:', error);
      alert('Failed to update work order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      property_id: '',
      tenant_id: '',
      assigned_vendor_id: '',
      category: 'general',
      priority: 'normal',
      status: 'new',
      description: '',
      vendor_cost: '',
      internal_cost: '',
      materials_cost: '',
    });
  };

  const openDetailModal = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setShowDetailModal(true);
  };

  const openEditModal = (workOrder: WorkOrder) => {
    setSelectedWorkOrder(workOrder);
    setFormData({
      property_id: workOrder.property_id,
      tenant_id: workOrder.tenant_id || '',
      assigned_vendor_id: workOrder.assigned_vendor_id || '',
      category: workOrder.category,
      priority: workOrder.priority,
      status: workOrder.status,
      description: workOrder.description,
      vendor_cost: workOrder.vendor_cost?.toString() || '',
      internal_cost: workOrder.internal_cost?.toString() || '',
      materials_cost: workOrder.materials_cost?.toString() || '',
    });
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'normal': return 'bg-blue-100 text-blue-700';
      case 'low': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleNavigateToProperty = (propertyId: string) => {
    navigate('/properties', { state: { openPropertyId: propertyId } });
  };

  const handleNavigateToTenant = (tenantId: string) => {
    navigate('/tenants', { state: { openTenantId: tenantId } });
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Work Orders</h1>
          <p className="text-gray-600">Track and manage maintenance requests</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          New Work Order
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {['all', 'new', 'in-progress', 'completed', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
              filter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {workOrders.map((workOrder) => (
          <div
            key={workOrder.id}
            onClick={() => openDetailModal(workOrder)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{workOrder.category}</h3>
                  <p className="text-xs text-gray-500">
                    {new Date(workOrder.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getPriorityColor(workOrder.priority)}`}>
                {workOrder.priority}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{workOrder.description}</p>

            <div className="space-y-2 mb-4">
              {workOrder.properties && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Building2 className="w-4 h-4" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToProperty(workOrder.property_id);
                    }}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {workOrder.properties.name}
                  </button>
                </div>
              )}
              {workOrder.tenants && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToTenant(workOrder.tenant_id!);
                    }}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {workOrder.tenants.name}
                  </button>
                </div>
              )}
              {workOrder.vendor && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Wrench className="w-4 h-4" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToVendor(workOrder.assigned_vendor_id!);
                    }}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {workOrder.vendor.name}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(workOrder.status)}`}>
                {workOrder.status}
              </span>
              {workOrder.total_cost && workOrder.total_cost > 0 && (
                <div className="flex items-center gap-1 text-green-600 font-bold text-sm">
                  <DollarSign className="w-4 h-4" />
                  {workOrder.total_cost.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {workOrders.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No work orders found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Create Work Order</h2>
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

            <form onSubmit={handleCreateWorkOrder} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant (Optional)
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Vendor (Optional)
                </label>
                <select
                  value={formData.assigned_vendor_id}
                  onChange={(e) => setFormData({ ...formData, assigned_vendor_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} {vendor.trade_category && `(${vendor.trade_category})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="hvac">HVAC</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="fire">Fire Safety</option>
                    <option value="elevators">Elevators</option>
                    <option value="bms">Building Management System</option>
                    <option value="security">Security</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="facade">Facade</option>
                    <option value="pest">Pest Control</option>
                    <option value="waste">Waste Management</option>
                    <option value="handyman">Handyman</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
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
                  <option value="new">New</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  placeholder="Describe the work to be done..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.vendor_cost}
                    onChange={(e) => setFormData({ ...formData, vendor_cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.internal_cost}
                    onChange={(e) => setFormData({ ...formData, internal_cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materials ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.materials_cost}
                    onChange={(e) => setFormData({ ...formData, materials_cost: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Total Cost:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${calculateTotalCost().toFixed(2)}
                  </span>
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
                  {saving ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Edit Work Order</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpdateWorkOrder} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant (Optional)
                  </label>
                  <select
                    value={formData.tenant_id}
                    onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign to Vendor (Optional)
                </label>
                <select
                  value={formData.assigned_vendor_id}
                  onChange={(e) => setFormData({ ...formData, assigned_vendor_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} {vendor.trade_category && `(${vendor.trade_category})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="hvac">HVAC</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="fire">Fire Safety</option>
                    <option value="elevators">Elevators</option>
                    <option value="bms">Building Management System</option>
                    <option value="security">Security</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="landscaping">Landscaping</option>
                    <option value="facade">Facade</option>
                    <option value="pest">Pest Control</option>
                    <option value="waste">Waste Management</option>
                    <option value="handyman">Handyman</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
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
                  <option value="new">New</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.vendor_cost}
                    onChange={(e) => setFormData({ ...formData, vendor_cost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Internal Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.internal_cost}
                    onChange={(e) => setFormData({ ...formData, internal_cost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Materials ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.materials_cost}
                    onChange={(e) => setFormData({ ...formData, materials_cost: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">Total Cost:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ${calculateTotalCost().toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
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
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetailModal && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedWorkOrder.category}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Created {new Date(selectedWorkOrder.created_at).toLocaleDateString()}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(selectedWorkOrder.priority)}`}>
                    {selectedWorkOrder.priority} priority
                  </span>
                </div>
                <div>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedWorkOrder.status)}`}>
                    {selectedWorkOrder.status}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <div className="text-gray-900">{selectedWorkOrder.description}</div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {selectedWorkOrder.properties && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Property</div>
                    <button
                      onClick={() => handleNavigateToProperty(selectedWorkOrder.property_id)}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectedWorkOrder.properties.name}
                    </button>
                  </div>
                )}

                {selectedWorkOrder.tenants && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Tenant</div>
                    <button
                      onClick={() => handleNavigateToTenant(selectedWorkOrder.tenant_id!)}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectedWorkOrder.tenants.name}
                    </button>
                  </div>
                )}

                {selectedWorkOrder.vendor && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Assigned Vendor</div>
                    <button
                      onClick={() => handleNavigateToVendor(selectedWorkOrder.assigned_vendor_id!)}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectedWorkOrder.vendor.name}
                    </button>
                  </div>
                )}
              </div>

              {(selectedWorkOrder.vendor_cost || selectedWorkOrder.internal_cost || selectedWorkOrder.materials_cost) && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="font-medium text-gray-900 mb-3">Cost Breakdown</div>
                  {selectedWorkOrder.vendor_cost && selectedWorkOrder.vendor_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Vendor Cost:</span>
                      <span className="font-medium">${selectedWorkOrder.vendor_cost.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedWorkOrder.internal_cost && selectedWorkOrder.internal_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Internal Labor:</span>
                      <span className="font-medium">${selectedWorkOrder.internal_cost.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedWorkOrder.materials_cost && selectedWorkOrder.materials_cost > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Materials:</span>
                      <span className="font-medium">${selectedWorkOrder.materials_cost.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-gray-200">
                    <span className="font-bold text-gray-900">Total Cost:</span>
                    <span className="font-bold text-green-600 text-lg">
                      ${selectedWorkOrder.total_cost?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => openEditModal(selectedWorkOrder)}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit Work Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
