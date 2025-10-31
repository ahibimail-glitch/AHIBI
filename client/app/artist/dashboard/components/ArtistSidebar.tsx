"use client";

import React from 'react';
import { 
  Calendar, 
  DollarSign, 
  Star, 
  User, 
  Award, 
  FileText, 
  Image as ImageIcon,
  Menu,
  X
} from 'lucide-react';

interface ArtistSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const ArtistSidebar: React.FC<ArtistSidebarProps> = ({ 
  activeSection, 
  onSectionChange, 
  isOpen, 
  onToggle 
}) => {
  const sidebarItems = [
    {
      id: 'bookings',
      label: 'Bookings',
      icon: Calendar,
      description: 'Manage booking requests'
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      description: 'Set availability'
    },
    {
      id: 'gallery',
      label: 'Gallery',
      icon: ImageIcon,
      description: 'Photos & videos'
    },
    {
      id: 'accolades',
      label: 'Accolades',
      icon: Award,
      description: 'Awards & achievements'
    },
    {
      id: 'terms',
      label: 'Terms',
      icon: FileText,
      description: 'Terms & policies'
    },
    {
      id: 'earnings',
      label: 'Earnings',
      icon: DollarSign,
      description: 'Income & payouts'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      description: 'Profile settings'
    }
  ];

  const SidebarItem = ({ item }: { item: any }) => {
    const isActive = activeSection === item.id;

    return (
      <button
        onClick={() => {
          onSectionChange(item.id);
          if (window.innerWidth < 768) {
            onToggle(); // Close sidebar on mobile after selection
          }
        }}
        className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-lg transition-all duration-200 group ${
          isActive 
            ? 'bg-purple-600 text-white shadow-lg' 
            : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{item.label}</div>
          <div className={`text-xs truncate ${isActive ? 'text-purple-100' : 'text-gray-500 group-hover:text-gray-600'}`}>
            {item.description}
          </div>
        </div>
      </button>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-xl border-r border-gray-200 transition-transform duration-300 z-50 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:relative md:shadow-none w-64 md:w-72 flex-shrink-0`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 truncate">Artist Dashboard</h2>
            <p className="text-xs md:text-sm text-gray-600 truncate">Manage your profile</p>
          </div>
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors md:hidden flex-shrink-0 ml-2"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        <div className="p-4">
          <nav className="space-y-2">
            {sidebarItems.map((item) => (
              <SidebarItem key={item.id} item={item} />
            ))}
          </nav>
        </div>

        {/* Sidebar Footer */}
        {/* <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-green-600 mb-2">
              <Star className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">Verified Artist</span>
            </div>
            <p className="text-xs text-gray-500">
              Your profile is verified and active
            </p>
          </div>
        </div> */}
      </div>

      {/* Mobile menu button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-3 bg-white rounded-lg shadow-lg border border-gray-200 md:hidden"
      >
        <Menu className="w-5 h-5 text-gray-700" />
      </button>
    </>
  );
};

export default ArtistSidebar;
