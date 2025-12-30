import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  Wrench,
  UsersRound,
  FileText,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  icon: any;
  path: string;
  roles: string[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/', roles: ['Director', 'PropertyManager', 'VendorAdmin', 'Tenant', 'Employee'] },
  { name: 'Work Orders', icon: ClipboardList, path: '/work-orders', roles: ['Director', 'PropertyManager', 'VendorAdmin', 'Employee'] },
  { name: 'Properties', icon: Building2, path: '/properties', roles: ['Director', 'PropertyManager'] },
  { name: 'Tenants', icon: Users, path: '/tenants', roles: ['Director', 'PropertyManager'] },
  { name: 'Vendors', icon: Wrench, path: '/vendors', roles: ['Director', 'PropertyManager'] },
  { name: 'Employees', icon: UsersRound, path: '/employees', roles: ['Director', 'PropertyManager'] },
  { name: 'Invoicing', icon: FileText, path: '/invoicing', roles: ['Director', 'PropertyManager'] },
  { name: 'Reports', icon: BarChart3, path: '/reports', roles: ['Director', 'PropertyManager'] },
  { name: 'Messaging', icon: MessageSquare, path: '/messages', roles: ['Director', 'PropertyManager', 'VendorAdmin', 'Tenant', 'Employee'] },
  { name: 'Settings', icon: Settings, path: '/settings', roles: ['Director'] },
];

export function Layout({ children }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNavItems = navItems.filter(item =>
    profile && item.roles.includes(profile.role)
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={`fixed inset-0 bg-gray-900 bg-opacity-50 z-40 lg:hidden transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)} />

      <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Highline Ops</h1>
                <p className="text-sm text-gray-500 mt-1">{profile?.name}</p>
                <span className="inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  {profile?.role}
                </span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavClick(item.path)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4 ml-auto">
                <input
                  type="search"
                  placeholder="Search work orders, tenants, properties..."
                  className="hidden sm:block w-64 lg:w-96 px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
