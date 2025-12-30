import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, TrendingUp, Users, Building2, DollarSign, Shield } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: any;
  trend?: string;
  color: string;
}

function MetricCard({ title, value, icon: Icon, trend, color }: MetricCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <span className="text-sm font-medium text-green-600">{trend}</span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export function DirectorDashboard() {
  const [stats, setStats] = useState({
    avgTSI: 0,
    avgPMComms: 0,
    avgVendorScore: 0,
    openAlerts: 0,
    totalProperties: 0,
    activeWorkOrders: 0
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [alertsRes, propertiesRes, workOrdersRes, scoresRes] = await Promise.all([
        supabase.from('exception_alerts').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(5),
        supabase.from('properties').select('id'),
        supabase.from('work_orders').select('id').in('status', ['new', 'triaged', 'scheduled', 'in-progress']),
        supabase.from('score_snapshots').select('*').order('created_at', { ascending: false }).limit(100)
      ]);

      const tsiScores = scoresRes.data?.filter(s => s.kind === 'TSI').slice(0, 10) || [];
      const pmScores = scoresRes.data?.filter(s => s.kind === 'PM_COMMS').slice(0, 10) || [];
      const vendorScores = scoresRes.data?.filter(s => s.kind === 'VENDOR').slice(0, 10) || [];

      setStats({
        avgTSI: tsiScores.length ? Math.round(tsiScores.reduce((acc, s) => acc + s.score, 0) / tsiScores.length) : 85,
        avgPMComms: pmScores.length ? Math.round(pmScores.reduce((acc, s) => acc + s.score, 0) / pmScores.length) : 78,
        avgVendorScore: vendorScores.length ? Math.round(vendorScores.reduce((acc, s) => acc + s.score, 0) / vendorScores.length) : 82,
        openAlerts: alertsRes.data?.length || 0,
        totalProperties: propertiesRes.data?.length || 0,
        activeWorkOrders: workOrdersRes.data?.length || 0
      });

      setAlerts(alertsRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Director Dashboard</h1>
        <p className="text-gray-600">Portfolio overview and key performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Tenant Satisfaction (TSI)"
          value={`${stats.avgTSI}/100`}
          icon={TrendingUp}
          trend="+3%"
          color="bg-green-600"
        />
        <MetricCard
          title="PM Communication Score"
          value={`${stats.avgPMComms}/100`}
          icon={Users}
          color="bg-blue-600"
        />
        <MetricCard
          title="Vendor Score"
          value={`${stats.avgVendorScore}/100`}
          icon={Shield}
          color="bg-purple-600"
        />
        <MetricCard
          title="Properties"
          value={stats.totalProperties}
          icon={Building2}
          color="bg-orange-600"
        />
        <MetricCard
          title="Active Work Orders"
          value={stats.activeWorkOrders}
          icon={AlertTriangle}
          color="bg-red-600"
        />
        <MetricCard
          title="Open Alerts"
          value={stats.openAlerts}
          icon={AlertTriangle}
          color="bg-yellow-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Top Risks & Alerts
          </h2>
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No active alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-100 text-red-700' :
                      alert.severity === 'warn' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">{alert.rule_code}</p>
                  <p className="text-sm text-gray-600">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            Financial Summary
          </h2>
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm text-green-700 mb-1">NOI Margin</p>
              <p className="text-2xl font-bold text-green-900">34.2%</p>
              <p className="text-xs text-green-600 mt-1">+2.1% vs last month</p>
            </div>
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Budget Variance (MTD)</p>
              <p className="text-2xl font-bold text-blue-900">-$12.4K</p>
              <p className="text-xs text-blue-600 mt-1">3.2% under budget</p>
            </div>
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
              <p className="text-sm text-purple-700 mb-1">COI Posture</p>
              <p className="text-2xl font-bold text-purple-900">94%</p>
              <p className="text-xs text-purple-600 mt-1">2 vendors expiring soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
