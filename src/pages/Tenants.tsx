import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, X, Edit2, Trash2, Mail, Phone, ClipboardList, ShieldCheck, ShieldAlert, ShieldQuestion, Building2, Store } from 'lucide-react';
import { formatPhoneNumber } from '../lib/usStatesCities';

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  property_id?: string;
  suite?: string;
  retail?: boolean;
  background_check_status?: string;
  notes?: string;
  created_at: string;
  property?: {
    name: string;
  };
  work_order_count?: number;
  lease_count?: number;
}

interface Property {
  id: string;
  name: string;
}

interface WorkOrder {
  id: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
}

export function Tenants() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantWorkOrders, setTenantWorkOrders] = useState<WorkOrder[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    property_id: '',
    suite: '',
    retail: false,
    background_check_status: 'pending',
    notes: '',
  });

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: formatPhoneNumber(value) });
  };

  useEffect(() => {
    loadTenants();
    loadProperties();
  }, []);

  useEffect(() => {
    const state = location.state as { openTenantId?: string };
    if (state?.openTenantId && tenants.length > 0) {
      const tenant = tenants.find(t => t.id === state.openTenantId);
      if (tenant) {
        openDetailModal(tenant);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, tenants]);

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
        .select(`
          *,
          property:properties(name)
        `)
        .order('name');

      if (error) throw error;

      const tenantsWithCounts = await Promise.all(
        (data || []).map(async (tenant) => {
          const { count: workOrderCount } = await supabase
            .from('work_orders')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          const { count: leaseCount } = await supabase
            .from('leases')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenant.id);

          return {
            ...tenant,
            work_order_count: workOrderCount || 0,
            lease_count: leaseCount || 0,
          };
        })
      );

      setTenants(tenantsWithCounts);
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTenantWorkOrders = async (tenantId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, category, status, priority, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTenantWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('tenants').insert({
        org_id: profile?.org_id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,
        property_id: formData.property_id || null,
        suite: formData.suite || null,
        retail: formData.retail,
        background_check_status: formData.background_check_status,
        notes: formData.notes || null,
      });

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      loadTenants();
    } catch (error) {
      console.error('Error creating tenant:', error);
      alert('Failed to create tenant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          property_id: formData.property_id || null,
          suite: formData.suite || null,
          retail: formData.retail,
          background_check_status: formData.background_check_status,
          notes: formData.notes || null,
        })
        .eq('id', selectedTenant.id);

      if (error) throw error;

      setShowEditModal(false);
      setShowDetailModal(false);
      resetForm();
      loadTenants();
    } catch (error) {
      console.error('Error updating tenant:', error);
      alert('Failed to update tenant. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;

      setShowDetailModal(false);
      setSelectedTenant(null);
      loadTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('Failed to delete tenant.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      property_id: '',
      suite: '',
      retail: false,
      background_check_status: 'pending',
      notes: '',
    });
  };

  const openDetailModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowDetailModal(true);
    loadTenantWorkOrders(tenant.id);
  };

  const openEditModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormData({
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      property_id: tenant.property_id || '',
      suite: tenant.suite || '',
      retail: tenant.retail || false,
      background_check_status: tenant.background_check_status || 'pending',
      notes: tenant.notes || '',
    });
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  const getBackgroundCheckIcon = (status?: string) => {
    switch (status) {
      case 'approved': return <ShieldCheck className="w-4 h-4" />;
      case 'rejected': return <ShieldAlert className="w-4 h-4" />;
      default: return <ShieldQuestion className="w-4 h-4" />;
    }
  };

  const getBackgroundCheckColor = (status?: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  const handleNavigateToProperty = (propertyId: string) => {
    navigate('/properties', { state: { openPropertyId: propertyId } });
  };

  const handleNavigateToWorkOrder = (workOrderId: string) => {
    navigate('/work-orders', { state: { openWorkOrderId: workOrderId } });
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tenants</h1>
          <p className="text-gray-600">Manage residential and retail tenants</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Tenant
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {tenants.map((tenant) => (
          <div
            key={tenant.id}
            onClick={() => openDetailModal(tenant)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                {tenant.retail ? (
                  <Store className="w-6 h-6 text-blue-600" />
                ) : (
                  <Users className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${getBackgroundCheckColor(tenant.background_check_status)}`}>
                {getBackgroundCheckIcon(tenant.background_check_status)}
                {tenant.background_check_status}
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1">{tenant.name}</h3>
            {tenant.retail && (
              <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 mb-3">
                Retail
              </span>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <Mail className="w-4 h-4" />
                <span className="truncate">{tenant.email}</span>
              </div>
              {tenant.phone && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Phone className="w-4 h-4" />
                  <span>{tenant.phone}</span>
                </div>
              )}
              {tenant.property && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Building2 className="w-4 h-4" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToProperty(tenant.property_id!);
                    }}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {tenant.property.name} {tenant.suite && `- Suite ${tenant.suite}`}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Work Orders</div>
                <div className="text-lg font-bold text-gray-900">{tenant.work_order_count || 0}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Leases</div>
                <div className="text-lg font-bold text-gray-900">{tenant.lease_count || 0}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {tenants.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No tenants found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Add New Tenant</h2>
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

            <form onSubmit={handleCreateTenant} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property
                </label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suite / Unit Number
                  </label>
                  <input
                    type="text"
                    value={formData.suite}
                    onChange={(e) => setFormData({ ...formData, suite: e.target.value })}
                    placeholder="Suite 101"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant Type
                  </label>
                  <select
                    value={formData.retail ? 'retail' : 'residential'}
                    onChange={(e) => setFormData({ ...formData, retail: e.target.value === 'retail' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="residential">Residential</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Check Status
                </label>
                <select
                  value={formData.background_check_status}
                  onChange={(e) => setFormData({ ...formData, background_check_status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional information about this tenant..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
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
                  {saving ? 'Creating...' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Edit Tenant</h2>
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

            <form onSubmit={handleUpdateTenant} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property
                </label>
                <select
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Suite / Unit Number
                  </label>
                  <input
                    type="text"
                    value={formData.suite}
                    onChange={(e) => setFormData({ ...formData, suite: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant Type
                  </label>
                  <select
                    value={formData.retail ? 'retail' : 'residential'}
                    onChange={(e) => setFormData({ ...formData, retail: e.target.value === 'retail' })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="residential">Residential</option>
                    <option value="retail">Retail</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Check Status
                </label>
                <select
                  value={formData.background_check_status}
                  onChange={(e) => setFormData({ ...formData, background_check_status: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
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

      {showDetailModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedTenant.name}</h2>
                {selectedTenant.retail && (
                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 mt-1">
                    Retail Tenant
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Email</div>
                  <div className="font-medium text-gray-900">{selectedTenant.email}</div>
                </div>

                {selectedTenant.phone && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Phone</div>
                    <div className="font-medium text-gray-900">{selectedTenant.phone}</div>
                  </div>
                )}

                {selectedTenant.property && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Property</div>
                    <button
                      onClick={() => handleNavigateToProperty(selectedTenant.property_id!)}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectedTenant.property.name}
                    </button>
                  </div>
                )}

                {selectedTenant.suite && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Suite / Unit</div>
                    <div className="font-medium text-gray-900">{selectedTenant.suite}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-500 mb-1">Background Check</div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getBackgroundCheckColor(selectedTenant.background_check_status)}`}>
                    {getBackgroundCheckIcon(selectedTenant.background_check_status)}
                    {selectedTenant.background_check_status}
                  </span>
                </div>
              </div>

              {selectedTenant.notes && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Notes</div>
                  <div className="font-medium text-gray-900">{selectedTenant.notes}</div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Recent Work Orders</h3>
                  <button
                    onClick={() => navigate('/work-orders')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>

                {tenantWorkOrders.length === 0 ? (
                  <p className="text-gray-500 text-sm">No work orders found</p>
                ) : (
                  <div className="space-y-2">
                    {tenantWorkOrders.map((wo) => (
                      <div
                        key={wo.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToWorkOrder(wo.id);
                        }}
                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{wo.category}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(wo.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => openEditModal(selectedTenant)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Tenant
                </button>
                <button
                  onClick={() => handleDeleteTenant(selectedTenant.id)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
