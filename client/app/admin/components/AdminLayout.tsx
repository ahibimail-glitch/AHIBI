"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar,
  Music,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
  UserCheck,
  TrendingUp,
  CreditCard,
  Bell,
  Search,
  ChevronDown,
  Clock
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, activeView, onViewChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const sidebarItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Overview & Analytics'
    },
    {
      id: 'artists',
      label: 'Artists',
      icon: Music,
      description: 'Manage Artists',
      submenu: [
        { id: 'artist-approvals', label: 'Pending Approvals', icon: UserCheck },
        { id: 'all-artists', label: 'All Artists', icon: Users },
        { id: 'artist-analytics', label: 'Artist Analytics', icon: TrendingUp }
      ]
    },
    {
      id: 'bookings',
      label: 'Bookings',
      icon: Calendar,
      description: 'Booking Management',
      submenu: [
        { id: 'all-bookings', label: 'All Bookings', icon: Calendar },
        { id: 'pending-bookings', label: 'Pending Bookings', icon: Clock },
        { id: 'booking-analytics', label: 'Booking Reports', icon: TrendingUp }
      ]
    },
    {
      id: 'venues',
      label: 'Venues',
      icon: Building2,
      description: 'Venue Management'
    },
    {
      id: 'events',
      label: 'Events',
      icon: Calendar,
      description: 'Event Management'
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: CreditCard,
      description: 'Payment Management'
    },
    {
      id: 'annie-musical-bookings',
      label: 'Annie Musical',
      icon: Music,
      description: 'Annie Musical Bookings'
    },
    {
      id: 'melita-bookings',
      label: 'Melita',
      icon: Calendar,
      description: 'Melita Bookings'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      description: 'System Notifications'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'System Settings'
    }
  ];

  const [expandedMenus, setExpandedMenus] = useState<string[]>(['artists', 'bookings']);

  const toggleSubmenu = (itemId: string) => {
    setExpandedMenus(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const SidebarItem = ({ item }: { item: any }) => {
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = activeView === item.id || (hasSubmenu && item.submenu.some((sub: any) => sub.id === activeView));

    return (
      <div className="mb-1">
        <button
          onClick={() => {
            if (hasSubmenu) {
              toggleSubmenu(item.id);
            } else {
              onViewChange(item.id);
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200 group ${
            isActive 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-3">
            <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
            {sidebarOpen && (
              <div>
                <div className="font-medium">{item.label}</div>
                {item.description && (
                  <div className={`text-xs ${isActive ? 'text-blue-100' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {item.description}
                  </div>
                )}
              </div>
            )}
          </div>
          {hasSubmenu && sidebarOpen && (
            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          )}
        </button>

        {hasSubmenu && isExpanded && sidebarOpen && (
          <div className="ml-4 mt-1 space-y-1">
            {item.submenu.map((subItem: any) => (
              <button
                key={subItem.id}
                onClick={() => onViewChange(subItem.id)}
                className={`w-full flex items-center space-x-3 px-4 py-2 text-left rounded-lg transition-all duration-200 ${
                  activeView === subItem.id
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <subItem.icon className="w-4 h-4" />
                <span className="text-sm">{subItem.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-16'} bg-gray-900 transition-all duration-300 flex flex-col shadow-2xl`}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && (
            <div>
              <h1 className="text-xl font-bold text-white">Ahibi Admin</h1>
              <p className="text-sm text-gray-400">Management Panel</p>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <SidebarItem key={item.id} item={item} />
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-700">
          <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {activeView.replace('-', ' ')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage your {activeView.replace('-', ' ')} efficiently
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">A</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">Admin User</div>
                    <div className="text-xs text-gray-500">admin@ahibi.com</div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Profile</a>
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Settings</a>
                    <hr className="my-1" />
                    <a href="#" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Logout</a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
