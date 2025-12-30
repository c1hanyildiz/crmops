import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Wrench, Mail, Phone, X, Edit2, Trash2, MapPin, Star, DollarSign, ClipboardList } from 'lucide-react';
import { formatPhoneNumber } from '../lib/usStatesCities';

interface Vendor {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  trade_category?: string;
  rating?: number;
  service_area?: string;
  address?: string;
  notes?: string;
  created_at: string;
  total_jobs?: number;
  total_revenue?: number;
  active_jobs?: number;
}

interface WorkOrder {
  id: string;
  category: string;
  status: string;
  description: string;
  vendor_cost?: number;
  created_at: string;
  property: {
    name: string;
  };
}

export function Vendors() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorWorkOrders, setVendorWorkOrders] = useState<WorkOrder[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    trade_category: 'hvac',
    rating: '85',
    service_area: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    loadVendors();
  }, []);

  const loadVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (error) throw error;

      const vendorsWithStats = await Promise.all(
        (data || []).map(async (vendor) => {
          const { data: workOrders } = await supabase
            .from('work_orders')
            .select('vendor_cost, status')
            .eq('assigned_vendor_id', vendor.id);

          const totalJobs = workOrders?.length || 0;
          const activeJobs = workOrders?.filter(wo => wo.status !== 'completed' && wo.status !== 'closed').length || 0;
          const totalRevenue = workOrders?.reduce((sum, wo) => sum + (wo.vendor_cost || 0), 0) || 0;

          return {
            ...vendor,
            total_jobs: totalJobs,
            active_jobs: activeJobs,
            total_revenue: totalRevenue,
          };
        })
      );

      setVendors(vendorsWithStats);
    } catch (error) {
      console.error('Error loading vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVendorWorkOrders = async (vendorId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          id,
          category,
          status,
          description,
          vendor_cost,
          created_at,
          property:properties(name)
        `)
        .eq('assigned_vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setVendorWorkOrders(data || []);
    } catch (error) {
      console.error('Error loading vendor work orders:', error);
    }
  };

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('vendors').insert({
        org_id: profile?.org_id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        trade_category: formData.trade_category,
        rating: parseInt(formData.rating),
        service_area: formData.service_area || null,
        address: formData.address || null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      loadVendors();
    } catch (error) {
      console.error('Error creating vendor:', error);
      alert('Failed to create vendor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('vendors')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          trade_category: formData.trade_category,
          rating: parseInt(formData.rating),
          service_area: formData.service_area || null,
          address: formData.address || null,
          notes: formData.notes || null,
        })
        .eq('id', selectedVendor.id);

      if (error) throw error;

      setShowEditModal(false);
      setShowDetailModal(false);
      resetForm();
      loadVendors();
    } catch (error) {
      console.error('Error updating vendor:', error);
      alert('Failed to update vendor. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;

      setShowDetailModal(false);
      setSelectedVendor(null);
      loadVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      alert('Failed to delete vendor.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      trade_category: 'hvac',
      rating: '85',
      service_area: '',
      address: '',
      notes: '',
    });
  };

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: formatPhoneNumber(value) });
  };

  const openDetailModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setShowDetailModal(true);
    loadVendorWorkOrders(vendor.id);
  };

  const openEditModal = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setFormData({
      name: vendor.name,
      email: vendor.email || '',
      phone: vendor.phone || '',
      trade_category: vendor.trade_category || 'hvac',
      rating: vendor.rating?.toString() || '85',
      service_area: vendor.service_area || '',
      address: vendor.address || '',
      notes: vendor.notes || '',
    });
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  const getTradeCategoryDisplay = (category?: string) => {
    if (!category) return 'General';
    return category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ');
  };

  const getRatingColor = (rating?: number) => {
    if (!rating) return 'text-gray-600';
    if (rating >= 90) return 'text-green-600';
    if (rating >= 75) return 'text-blue-600';
    if (rating >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBadgeColor = (rating?: number) => {
    if (!rating) return 'bg-gray-100 text-gray-700';
    if (rating >= 90) return 'bg-green-100 text-green-700';
    if (rating >= 75) return 'bg-blue-100 text-blue-700';
    if (rating >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
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

  const handleWorkOrderClick = (workOrderId: string) => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendors</h1>
          <p className="text-gray-600">Manage service providers and contractors</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {vendors.map((vendor) => (
          <div
            key={vendor.id}
            onClick={() => openDetailModal(vendor)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Wrench className="w-6 h-6 text-blue-600" />
              </div>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getRatingBadgeColor(vendor.rating)}`}>
                <Star className="w-3 h-3 inline mr-1" />
                {vendor.rating || 0}/100
              </span>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-3">{vendor.name}</h3>

            <div className="space-y-2 mb-4">
              {vendor.email && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{vendor.email}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Phone className="w-4 h-4" />
                  <span>{vendor.phone}</span>
                </div>
              )}
              {vendor.service_area && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{vendor.service_area}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  {getTradeCategoryDisplay(vendor.trade_category)}
                </span>
                {vendor.active_jobs! > 0 && (
                  <span className="text-xs font-medium text-yellow-600">
                    {vendor.active_jobs} active
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total Jobs</div>
                  <div className="text-sm font-bold text-gray-900">{vendor.total_jobs || 0}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
                  <div className="text-sm font-bold text-green-600">
                    ${vendor.total_revenue?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {vendors.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No vendors found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Add New Vendor</h2>
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

            <form onSubmit={handleCreateVendor} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="ABC Plumbing Services"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@vendor.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trade Category
                  </label>
                  <select
                    value={formData.trade_category}
                    onChange={(e) => setFormData({ ...formData, trade_category: e.target.value })}
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
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Area
                </label>
                <input
                  type="text"
                  value={formData.service_area}
                  onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                  placeholder="Manhattan, Brooklyn"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main St, New York, NY 10001"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional information about this vendor..."
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
                  {saving ? 'Creating...' : 'Create Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Edit Vendor</h2>
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

            <form onSubmit={handleUpdateVendor} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trade Category
                  </label>
                  <select
                    value={formData.trade_category}
                    onChange={(e) => setFormData({ ...formData, trade_category: e.target.value })}
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
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Area
                </label>
                <input
                  type="text"
                  value={formData.service_area}
                  onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
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

      {showDetailModal && selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedVendor.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{getTradeCategoryDisplay(selectedVendor.trade_category)}</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Total Jobs</div>
                  <div className="text-2xl font-bold text-gray-900">{selectedVendor.total_jobs || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Active Jobs</div>
                  <div className="text-2xl font-bold text-yellow-600">{selectedVendor.active_jobs || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedVendor.total_revenue?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {selectedVendor.email && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Email</div>
                    <div className="font-medium text-gray-900">{selectedVendor.email}</div>
                  </div>
                )}

                {selectedVendor.phone && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Phone</div>
                    <div className="font-medium text-gray-900">{selectedVendor.phone}</div>
                  </div>
                )}

                {selectedVendor.service_area && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Service Area</div>
                    <div className="font-medium text-gray-900">{selectedVendor.service_area}</div>
                  </div>
                )}

                {selectedVendor.address && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Address</div>
                    <div className="font-medium text-gray-900">{selectedVendor.address}</div>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-500 mb-1">Rating</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getRatingColor(selectedVendor.rating)}`}>
                      {selectedVendor.rating || 0}
                    </span>
                    <span className="text-gray-500">/100</span>
                  </div>
                </div>
              </div>

              {selectedVendor.notes && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Notes</div>
                  <div className="font-medium text-gray-900">{selectedVendor.notes}</div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Job History</h3>
                  <button
                    onClick={() => navigate('/work-orders')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>

                {vendorWorkOrders.length === 0 ? (
                  <p className="text-gray-500 text-sm">No work orders found</p>
                ) : (
                  <div className="space-y-2">
                    {vendorWorkOrders.map((wo) => (
                      <div
                        key={wo.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWorkOrderClick(wo.id);
                        }}
                        className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900">{wo.category}</div>
                          <div className="flex items-center gap-3">
                            {wo.vendor_cost && wo.vendor_cost > 0 && (
                              <span className="text-sm font-bold text-green-600">
                                ${wo.vendor_cost.toFixed(2)}
                              </span>
                            )}
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>
                              {wo.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{wo.description}</div>
                        <div className="text-xs text-gray-500">
                          {wo.property.name} • {new Date(wo.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => openEditModal(selectedVendor)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Vendor
                </button>
                <button
                  onClick={() => handleDeleteVendor(selectedVendor.id)}
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
