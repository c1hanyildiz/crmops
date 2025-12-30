import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Building2, MapPin, Square, X, Edit2, ClipboardList, Trash2, DollarSign, Users, Wrench } from 'lucide-react';

interface Property {
  id: string;
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  type: string;
  rsf: number;
  notes?: string;
  created_at: string;
  work_order_count?: number;
  total_labor_cost?: number;
  total_vendor_cost?: number;
  total_cost?: number;
}

interface LaborCost {
  employee_labor: number;
  vendor_costs: number;
  total: number;
}

interface WorkOrder {
  id: string;
  category: string;
  status: string;
  priority: string;
  created_at: string;
}

export function Properties() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertyWorkOrders, setPropertyWorkOrders] = useState<WorkOrder[]>([]);
  const [laborCosts, setLaborCosts] = useState<LaborCost | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    type: 'office',
    rsf: '',
    notes: '',
  });

  useEffect(() => {
    loadProperties();
  }, []);

  useEffect(() => {
    const state = location.state as { openPropertyId?: string };
    if (state?.openPropertyId && properties.length > 0) {
      const property = properties.find(p => p.id === state.openPropertyId);
      if (property) {
        openDetailModal(property);
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, properties]);

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          work_orders(count)
        `)
        .order('name');

      if (error) throw error;

      const propertiesWithCount = (data || []).map(prop => ({
        ...prop,
        work_order_count: prop.work_orders?.[0]?.count || 0,
      }));

      setProperties(propertiesWithCount);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPropertyWorkOrders = async (propertyId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select('id, category, status, priority, created_at')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPropertyWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading work orders:', error);
    }
  };

  const loadPropertyLaborCosts = async (propertyId: string) => {
    try {
      const { data: timesheets, error: timesheetError } = await supabase
        .from('timesheets')
        .select(`
          hours_reg,
          hours_ot,
          employee:employees(hourly_rate)
        `)
        .eq('property_id', propertyId);

      if (timesheetError) throw timesheetError;

      let employeeLaborCost = 0;
      (timesheets || []).forEach((ts: any) => {
        const rate = ts.employee?.hourly_rate || 0;
        const regCost = (ts.hours_reg || 0) * rate;
        const otCost = (ts.hours_ot || 0) * rate * 1.5;
        employeeLaborCost += regCost + otCost;
      });

      const { data: workOrders, error: woError } = await supabase
        .from('work_orders')
        .select('vendor_cost, internal_cost, materials_cost')
        .eq('property_id', propertyId);

      if (woError) throw woError;

      let vendorCosts = 0;
      (workOrders || []).forEach((wo: any) => {
        vendorCosts += (wo.vendor_cost || 0) + (wo.internal_cost || 0) + (wo.materials_cost || 0);
      });

      setLaborCosts({
        employee_labor: employeeLaborCost,
        vendor_costs: vendorCosts,
        total: employeeLaborCost + vendorCosts,
      });
    } catch (error) {
      console.error('Error loading labor costs:', error);
      setLaborCosts({
        employee_labor: 0,
        vendor_costs: 0,
        total: 0,
      });
    }
  };

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('properties').insert({
        org_id: profile?.org_id,
        name: formData.name,
        address1: formData.address1,
        address2: formData.address2 || null,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        type: formData.type,
        rsf: parseInt(formData.rsf),
        notes: formData.notes || null,
      });

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      loadProperties();
    } catch (error) {
      console.error('Error creating property:', error);
      alert('Failed to create property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProperty) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          name: formData.name,
          address1: formData.address1,
          address2: formData.address2 || null,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          type: formData.type,
          rsf: parseInt(formData.rsf),
          notes: formData.notes || null,
        })
        .eq('id', selectedProperty.id);

      if (error) throw error;

      setShowEditModal(false);
      setShowDetailModal(false);
      resetForm();
      loadProperties();
    } catch (error) {
      console.error('Error updating property:', error);
      alert('Failed to update property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      setShowDetailModal(false);
      setSelectedProperty(null);
      loadProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Failed to delete property. It may have associated work orders.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      type: 'office',
      rsf: '',
      notes: '',
    });
  };

  const openDetailModal = (property: Property) => {
    setSelectedProperty(property);
    setShowDetailModal(true);
    loadPropertyWorkOrders(property.id);
    loadPropertyLaborCosts(property.id);
  };

  const openEditModal = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      name: property.name,
      address1: property.address1,
      address2: property.address2 || '',
      city: property.city,
      state: property.state,
      zip: property.zip,
      type: property.type,
      rsf: property.rsf?.toString() || '',
      notes: property.notes || '',
    });
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPropertyTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      office: 'Office',
      retail: 'Retail',
      mf: 'Multifamily',
      industrial: 'Industrial',
      mixed: 'Mixed Use',
    };
    return types[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'in-progress': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Properties</h1>
          <p className="text-gray-600">Manage your real estate portfolio</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Property
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {properties.map((property) => (
          <div
            key={property.id}
            onClick={() => openDetailModal(property)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{property.name}</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {property.address1}, {property.city}, {property.state} {property.zip}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Square className="w-4 h-4" />
                    <span className="text-sm">
                      {formatNumber(property.rsf)} sq ft
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <ClipboardList className="w-4 h-4" />
                    <span className="text-sm">
                      {property.work_order_count || 0} work orders
                    </span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                    {getPropertyTypeLabel(property.type)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {properties.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No properties found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Add New Property</h2>
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

            <form onSubmit={handleCreateProperty} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Empire State Building"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address1}
                  onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                  required
                  placeholder="Street address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={formData.address2}
                  onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                  placeholder="Apartment, suite, etc."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    maxLength={2}
                    placeholder="NY"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    required
                    maxLength={10}
                    placeholder="10001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Footage
                  </label>
                  <input
                    type="number"
                    value={formData.rsf}
                    onChange={(e) => setFormData({ ...formData, rsf: e.target.value })}
                    required
                    placeholder="25000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="office">Office</option>
                  <option value="retail">Retail</option>
                  <option value="mf">Multifamily</option>
                  <option value="industrial">Industrial</option>
                  <option value="mixed">Mixed Use</option>
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
                  placeholder="Additional information about this property..."
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
                  {saving ? 'Creating...' : 'Create Property'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Edit Property</h2>
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

            <form onSubmit={handleUpdateProperty} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Name
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
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address1}
                  onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={formData.address2}
                  onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    required
                    maxLength={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    required
                    maxLength={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Square Footage
                  </label>
                  <input
                    type="number"
                    value={formData.rsf}
                    onChange={(e) => setFormData({ ...formData, rsf: e.target.value })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="office">Office</option>
                  <option value="retail">Retail</option>
                  <option value="mf">Multifamily</option>
                  <option value="industrial">Industrial</option>
                  <option value="mixed">Mixed Use</option>
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

      {showDetailModal && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">{selectedProperty.name}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <span className="inline-block px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                  {getPropertyTypeLabel(selectedProperty.type)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Address</div>
                  <div className="font-medium text-gray-900">
                    {selectedProperty.address1}
                    {selectedProperty.address2 && <>, {selectedProperty.address2}</>}
                    <br />
                    {selectedProperty.city}, {selectedProperty.state} {selectedProperty.zip}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500 mb-1">Square Footage</div>
                  <div className="font-medium text-gray-900">
                    {formatNumber(selectedProperty.rsf)} sq ft
                  </div>
                </div>
              </div>

              {selectedProperty.notes && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Notes</div>
                  <div className="font-medium text-gray-900">{selectedProperty.notes}</div>
                </div>
              )}

              {laborCosts && (
                <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">Labor Costs</h3>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <div className="text-xs text-gray-500">Employee Labor</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${laborCosts.employee_labor.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4 text-orange-600" />
                        <div className="text-xs text-gray-500">Vendor Costs</div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${laborCosts.vendor_costs.toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-green-300">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <div className="text-xs font-medium text-green-700">Total Cost</div>
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        ${laborCosts.total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Work Orders</h3>
                  <button
                    onClick={() => navigate('/work-orders')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>

                {propertyWorkOrders.length === 0 ? (
                  <p className="text-gray-500 text-sm">No work orders for this property</p>
                ) : (
                  <div className="space-y-2">
                    {propertyWorkOrders.map((wo) => (
                      <div key={wo.id} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900">{wo.category}</div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>
                            {wo.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(wo.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => openEditModal(selectedProperty)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Property
                </button>
                <button
                  onClick={() => handleDeleteProperty(selectedProperty.id)}
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
