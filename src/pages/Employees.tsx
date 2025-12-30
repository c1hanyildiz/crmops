import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Users, X, Edit2, Trash2, Mail, Phone, DollarSign, MapPin, Briefcase, FileText, Clock } from 'lucide-react';
import { formatPhoneNumber } from '../lib/usStatesCities';

interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  position?: string;
  hourly_rate?: number;
  property_id?: string;
  benefits?: string;
  resume_url?: string;
  union_flag?: boolean;
  burden_pct?: number;
  active?: boolean;
  created_at: string;
  property?: {
    name: string;
  };
  total_hours?: number;
  total_earned?: number;
  work_orders_count?: number;
}

interface Property {
  id: string;
  name: string;
}

interface WorkOrder {
  id: string;
  category: string;
  status: string;
  description: string;
  created_at: string;
  property: {
    name: string;
  };
}

interface TimeEntry {
  id: string;
  date: string;
  hours_reg: number;
  hours_ot: number;
  property: {
    name: string;
  };
  notes?: string;
}

export function Employees() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeWorkOrders, setEmployeeWorkOrders] = useState<WorkOrder[]>([]);
  const [employeeTimeEntries, setEmployeeTimeEntries] = useState<TimeEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'maintenance',
    position: '',
    hourly_rate: '',
    property_id: '',
    benefits: '',
    resume_url: '',
    union_flag: false,
    burden_pct: '25',
    active: true,
  });

  useEffect(() => {
    loadEmployees();
    loadProperties();
  }, []);

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

  const loadEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select(`
          *,
          property:properties(name)
        `)
        .order('name');

      if (error) throw error;

      const employeesWithStats = await Promise.all(
        (data || []).map(async (emp) => {
          const { data: timeData } = await supabase
            .from('timesheets')
            .select('hours_reg, hours_ot')
            .eq('employee_id', emp.id);

          const totalHours = (timeData || []).reduce(
            (sum, entry) => sum + (entry.hours_reg || 0) + (entry.hours_ot || 0) * 1.5,
            0
          );

          const totalEarned = totalHours * (emp.hourly_rate || 0);

          const { count: woCount } = await supabase
            .from('timesheets')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', emp.id)
            .not('workorder_id', 'is', null);

          return {
            ...emp,
            total_hours: totalHours,
            total_earned: totalEarned,
            work_orders_count: woCount || 0,
          };
        })
      );

      setEmployees(employeesWithStats);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployeeDetails = async (employeeId: string) => {
    try {
      const [woData, timeData] = await Promise.all([
        supabase
          .from('timesheets')
          .select(`
            workorder_id,
            work_orders!inner(
              id,
              category,
              status,
              description,
              created_at,
              property:properties(name)
            )
          `)
          .eq('employee_id', employeeId)
          .not('workorder_id', 'is', null)
          .limit(10),
        supabase
          .from('timesheets')
          .select(`
            id,
            date,
            hours_reg,
            hours_ot,
            notes,
            property:properties(name)
          `)
          .eq('employee_id', employeeId)
          .order('date', { ascending: false })
          .limit(10),
      ]);

      const uniqueWorkOrders = new Map();
      (woData.data || []).forEach((entry: any) => {
        if (entry.work_orders && !uniqueWorkOrders.has(entry.work_orders.id)) {
          uniqueWorkOrders.set(entry.work_orders.id, entry.work_orders);
        }
      });

      setEmployeeWorkOrders(Array.from(uniqueWorkOrders.values()));
      setEmployeeTimeEntries(timeData.data || []);
    } catch (error) {
      console.error('Error loading employee details:', error);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase.from('employees').insert({
        org_id: profile?.org_id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        role: formData.role,
        position: formData.position || null,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        property_id: formData.property_id || null,
        benefits: formData.benefits || null,
        resume_url: formData.resume_url || null,
        union_flag: formData.union_flag,
        burden_pct: formData.burden_pct ? parseFloat(formData.burden_pct) : 25,
        active: formData.active,
      });

      if (error) throw error;

      setShowCreateModal(false);
      resetForm();
      loadEmployees();
    } catch (error) {
      console.error('Error creating employee:', error);
      alert('Failed to create employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          role: formData.role,
          position: formData.position || null,
          hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
          property_id: formData.property_id || null,
          benefits: formData.benefits || null,
          resume_url: formData.resume_url || null,
          union_flag: formData.union_flag,
          burden_pct: formData.burden_pct ? parseFloat(formData.burden_pct) : 25,
          active: formData.active,
        })
        .eq('id', selectedEmployee.id);

      if (error) throw error;

      setShowEditModal(false);
      setShowDetailModal(false);
      resetForm();
      loadEmployees();
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Failed to update employee. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;

      setShowDetailModal(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Failed to delete employee. They may have associated timesheets.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'maintenance',
      position: '',
      hourly_rate: '',
      property_id: '',
      benefits: '',
      resume_url: '',
      union_flag: false,
      burden_pct: '25',
      active: true,
    });
  };

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: formatPhoneNumber(value) });
  };

  const openDetailModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
    loadEmployeeDetails(employee.id);
  };

  const openEditModal = (employee: Employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'maintenance',
      position: employee.position || '',
      hourly_rate: employee.hourly_rate?.toString() || '',
      property_id: employee.property_id || '',
      benefits: employee.benefits || '',
      resume_url: employee.resume_url || '',
      union_flag: employee.union_flag || false,
      burden_pct: employee.burden_pct?.toString() || '25',
      active: employee.active !== false,
    });
    setShowEditModal(true);
    setShowDetailModal(false);
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return 'Staff';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employees</h1>
          <p className="text-gray-600">Manage staff, timesheets, and payroll</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-5 h-5" />
          Add Employee
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {employees.map((employee) => (
          <div
            key={employee.id}
            onClick={() => openDetailModal(employee)}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              {employee.active === false && (
                <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                  Inactive
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{employee.name}</h3>
            <p className="text-sm text-gray-500 mb-3">{getRoleDisplay(employee.role)}</p>

            <div className="space-y-2 mb-4">
              {employee.email && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{employee.email}</span>
                </div>
              )}
              {employee.phone && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Phone className="w-4 h-4" />
                  <span>{employee.phone}</span>
                </div>
              )}
              {employee.property && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{employee.property.name}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500 mb-1">Hourly Rate</div>
                <div className="text-sm font-bold text-gray-900">
                  ${employee.hourly_rate?.toFixed(2) || '0.00'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Earned</div>
                <div className="text-sm font-bold text-green-600">
                  ${employee.total_earned?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No employees found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Add New Employee</h2>
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

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
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
                    placeholder="john@example.com"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="porter">Porter</option>
                    <option value="superintendent">Superintendent</option>
                    <option value="assistant_super">Assistant Superintendent</option>
                    <option value="handyman">Handyman</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position/Title
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Senior Technician"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    placeholder="25.00"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Property
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">No Default</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Burden/Benefits (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.burden_pct}
                    onChange={(e) => setFormData({ ...formData, burden_pct: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Benefits Description
                  </label>
                  <textarea
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    rows={2}
                    placeholder="Health insurance, 401k, PTO..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume URL
                  </label>
                  <input
                    type="url"
                    value={formData.resume_url}
                    onChange={(e) => setFormData({ ...formData, resume_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.union_flag}
                      onChange={(e) => setFormData({ ...formData, union_flag: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Union Member</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
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
                  {saving ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-2xl font-bold text-gray-900">Edit Employee</h2>
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

            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="porter">Porter</option>
                    <option value="superintendent">Superintendent</option>
                    <option value="assistant_super">Assistant Superintendent</option>
                    <option value="handyman">Handyman</option>
                    <option value="cleaner">Cleaner</option>
                    <option value="security">Security</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position/Title
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hourly Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourly_rate}
                    onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Property
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="">No Default</option>
                    {properties.map((prop) => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Burden/Benefits (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={formData.burden_pct}
                    onChange={(e) => setFormData({ ...formData, burden_pct: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Benefits Description
                  </label>
                  <textarea
                    value={formData.benefits}
                    onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Resume URL
                  </label>
                  <input
                    type="url"
                    value={formData.resume_url}
                    onChange={(e) => setFormData({ ...formData, resume_url: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.union_flag}
                      onChange={(e) => setFormData({ ...formData, union_flag: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Union Member</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">Active</span>
                  </label>
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

      {showDetailModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{getRoleDisplay(selectedEmployee.role)}</p>
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
                  <div className="text-sm text-gray-500 mb-1">Total Hours</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {selectedEmployee.total_hours?.toFixed(1) || '0.0'}h
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Total Earned</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedEmployee.total_earned?.toFixed(2) || '0.00'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-1">Work Orders</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedEmployee.work_orders_count || 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {selectedEmployee.email && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Email</div>
                    <div className="font-medium text-gray-900">{selectedEmployee.email}</div>
                  </div>
                )}
                {selectedEmployee.phone && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Phone</div>
                    <div className="font-medium text-gray-900">{selectedEmployee.phone}</div>
                  </div>
                )}
                {selectedEmployee.position && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Position</div>
                    <div className="font-medium text-gray-900">{selectedEmployee.position}</div>
                  </div>
                )}
                {selectedEmployee.property && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Default Property</div>
                    <div className="font-medium text-gray-900">{selectedEmployee.property.name}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-500 mb-1">Hourly Rate</div>
                  <div className="font-medium text-gray-900">
                    ${selectedEmployee.hourly_rate?.toFixed(2) || '0.00'}/hr
                  </div>
                </div>
                {selectedEmployee.burden_pct && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Burden/Benefits</div>
                    <div className="font-medium text-gray-900">{selectedEmployee.burden_pct}%</div>
                  </div>
                )}
                {selectedEmployee.union_flag && (
                  <div className="col-span-2">
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
                      Union Member
                    </span>
                  </div>
                )}
              </div>

              {selectedEmployee.benefits && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Benefits</div>
                  <div className="font-medium text-gray-900">{selectedEmployee.benefits}</div>
                </div>
              )}

              {selectedEmployee.resume_url && (
                <div>
                  <a
                    href={selectedEmployee.resume_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <FileText className="w-4 h-4" />
                    View Resume
                  </a>
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

                {employeeWorkOrders.length === 0 ? (
                  <p className="text-gray-500 text-sm">No work orders found</p>
                ) : (
                  <div className="space-y-2">
                    {employeeWorkOrders.map((wo) => (
                      <div key={wo.id} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-gray-900">{wo.category}</div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(wo.status)}`}>
                            {wo.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">{wo.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {wo.property.name} • {new Date(wo.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Time Entries</h3>

                {employeeTimeEntries.length === 0 ? (
                  <p className="text-gray-500 text-sm">No time entries found</p>
                ) : (
                  <div className="space-y-2">
                    {employeeTimeEntries.map((entry) => (
                      <div key={entry.id} className="p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">
                              {new Date(entry.date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-600">{entry.property.name}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-gray-900">
                              {(entry.hours_reg + entry.hours_ot * 1.5).toFixed(1)}h
                            </div>
                            <div className="text-xs text-gray-500">
                              Reg: {entry.hours_reg}h {entry.hours_ot > 0 && `OT: ${entry.hours_ot}h`}
                            </div>
                          </div>
                        </div>
                        {entry.notes && (
                          <div className="text-sm text-gray-600 mt-2">{entry.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => openEditModal(selectedEmployee)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Employee
                </button>
                <button
                  onClick={() => handleDeleteEmployee(selectedEmployee.id)}
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
