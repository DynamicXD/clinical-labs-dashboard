'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth';
import Link from 'next/link';

const navigation = [
  { name: 'Home', href: '/dashboard/home', icon: '🏠' },
  { name: 'Patients', href: '/dashboard/patients', icon: '👥' },
  { name: 'Observations', href: '/dashboard/observations', icon: '📊' },
  { name: 'Reports by Date', href: '/dashboard/reports', icon: '📅' },
];

const settingsNavigation = [
  { name: 'Test Groups', href: '/dashboard/settings/test-groups' },
  { name: 'Lab Tests', href: '/dashboard/settings/lab-tests' },
  { name: 'Report Groups', href: '/dashboard/settings/report-groups' },
  { name: 'System', href: '/dashboard/settings/system' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { doctorId, username, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !doctorId) {
      router.push('/login');
    }
  }, [doctorId, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!doctorId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="absolute top-0 right-0 -mr-12 pt-2">
              <button
                className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sr-only">Close sidebar</span>
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <SidebarContent 
              navigation={navigation} 
              settingsNavigation={settingsNavigation}
              settingsOpen={settingsOpen}
              setSettingsOpen={setSettingsOpen}
              pathname={pathname}
              username={username}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <SidebarContent 
          navigation={navigation} 
          settingsNavigation={settingsNavigation}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          pathname={pathname}
          username={username}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 lg:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ 
  navigation, 
  settingsNavigation, 
  settingsOpen, 
  setSettingsOpen, 
  pathname, 
  username, 
  onLogout 
}: any) {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
      <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">Clinical Dashboard</h1>
        </div>
        
        <div className="mt-5 flex-1 px-2 space-y-1">
          {navigation.map((item: any) => (
            <Link
              key={item.name}
              href={item.href}
              className={`${
                pathname === item.href
                  ? 'bg-blue-50 border-r-4 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-200`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}

          <div className="pt-2">
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group w-full flex items-center px-2 py-2 text-sm font-medium rounded-md"
            >
              <span className="mr-3 text-lg">⚙️</span>
              Settings
              <svg
                className={`ml-auto h-4 w-4 transition-transform duration-200 ${settingsOpen ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {settingsOpen && (
              <div className="ml-6 mt-1 space-y-1">
                {settingsNavigation.map((item: any) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`${
                      pathname === item.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    } block px-2 py-2 text-sm rounded-md`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
        <div className="flex-shrink-0 w-full group block">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                {username}
              </p>
              <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                Doctor
              </p>
            </div>
            <button
              onClick={onLogout}
              className="ml-3 p-2 text-gray-400 hover:text-gray-600 rounded-md"
              title="Logout"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
