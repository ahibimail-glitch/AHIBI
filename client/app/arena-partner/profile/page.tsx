'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerAuth } from '@/lib/api/sports';
import Link from 'next/link';
import KakiMarketingBanner from '@/components/KakiMarketingBanner';

export default function ArenaPartnerProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    businessName: '',
    contactInfo: {
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: ''
    },
    businessDetails: {
      description: '',
      website: '',
      establishedYear: ''
    },
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      branchName: '',
      ifscCode: ''
    }
  } as {
    name: string;
    email: string;
    businessName: string;
    contactInfo: {
      phone: string;
      address: string;
      city: string;
      state: string;
      pincode: string;
    };
    businessDetails: {
      description: string;
      website: string;
      establishedYear: string;
    };
    bankDetails: {
      accountHolderName: string;
      accountNumber: string;
      bankName: string;
      branchName: string;
      ifscCode: string;
    };
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.push('/arena-partner/auth');
      return;
    }

    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await arenaPartnerAuth.getProfile();
      const profileData = response.data.data.partner;
      setProfile(profileData);
      setFormData({
        name: profileData.name || '',
        email: profileData.email || '',
        businessName: profileData.businessDetails?.businessName || '',
        contactInfo: {
          phone: profileData.phone || '',
          address: profileData.contactInfo?.address || '',
          city: profileData.contactInfo?.city || '',
          state: profileData.contactInfo?.state || '',
          pincode: profileData.contactInfo?.pincode || ''
        },
        businessDetails: {
          description: profileData.businessDetails?.description || '',
          website: profileData.businessDetails?.website || '',
          establishedYear: profileData.businessDetails?.yearEstablished?.toString() || ''
        },
        bankDetails: {
          accountHolderName: profileData.bankDetails?.accountHolderName || '',
          accountNumber: profileData.bankDetails?.accountNumber || '',
          bankName: profileData.bankDetails?.bankName || '',
          branchName: profileData.bankDetails?.branchName || '',
          ifscCode: profileData.bankDetails?.ifscCode || ''
        }
      });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await arenaPartnerAuth.updateProfile(formData);
      setMessage('Profile updated successfully!');
      await fetchProfile(); // Refresh profile data
    } catch (error: any) {
      setMessage(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (section: string, field: string, value: string) => {
    if (section === 'root') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...(prev[section as keyof typeof prev] as Record<string, string>),
          [field]: value
        }
      }));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('arenaPartnerToken');
    router.push('/arena-partner/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-orange-600 to-orange-500 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Profile Settings</h1>
              <p className="text-xs sm:text-sm text-orange-100">Manage your account information</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-white bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium backdrop-blur-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Kaki Marketing Banner */}
        <div className="mb-8">
          <KakiMarketingBanner platform="arenaPartner" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('root', 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('root', 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('root', 'businessName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.contactInfo.phone}
                  onChange={(e) => handleInputChange('contactInfo', 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={formData.contactInfo.city}
                  onChange={(e) => handleInputChange('contactInfo', 'city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.contactInfo.address}
                  onChange={(e) => handleInputChange('contactInfo', 'address', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={formData.contactInfo.state}
                  onChange={(e) => handleInputChange('contactInfo', 'state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                <input
                  type="text"
                  value={formData.contactInfo.pincode}
                  onChange={(e) => handleInputChange('contactInfo', 'pincode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Business Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Description</label>
                <textarea
                  value={formData.businessDetails.description}
                  onChange={(e) => handleInputChange('businessDetails', 'description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Tell us about your sports venue business..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.businessDetails.website}
                  onChange={(e) => handleInputChange('businessDetails', 'website', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Established Year</label>
                <input
                  type="number"
                  value={formData.businessDetails.establishedYear}
                  onChange={(e) => handleInputChange('businessDetails', 'establishedYear', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="2020"
                  min="1900"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Bank Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.accountHolderName}
                  onChange={(e) => handleInputChange('bankDetails', 'accountHolderName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                <input
                  type="text"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.bankName}
                  onChange={(e) => handleInputChange('bankDetails', 'bankName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.branchName}
                  onChange={(e) => handleInputChange('bankDetails', 'branchName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                <input
                  type="text"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) => handleInputChange('bankDetails', 'ifscCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="SBIN0001234"
                />
              </div>
            </div>
          </div>

          {/* Account Status */}
          {profile && (
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Account Status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Approval Status</p>
                  <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                    profile.approvalStatus === 'approved' ? 'bg-green-100 text-green-700' :
                    profile.approvalStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {profile.approvalStatus?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">KYC Status</p>
                  <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${
                    (profile.kycDocuments?.aadhaarCard?.verified && 
                     profile.kycDocuments?.panCard?.verified) ? 'bg-green-100 text-green-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {(profile.kycDocuments?.aadhaarCard?.verified && 
                      profile.kycDocuments?.panCard?.verified) ? 'VERIFIED' : 'PENDING'}
                  </span>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-gray-600 mb-1">Member Since</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {/* KYC Documents Status */}
              <div className="mt-6">
                <h3 className="text-md font-medium text-gray-900 mb-3">KYC Documents</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Aadhaar Card</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      profile.kycDocuments?.aadhaarCard?.verified ? 'bg-green-100 text-green-700' :
                      profile.kycDocuments?.aadhaarCard?.url ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {profile.kycDocuments?.aadhaarCard?.verified ? 'Verified' :
                       profile.kycDocuments?.aadhaarCard?.url ? 'Pending' : 'Not Uploaded'}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">PAN Card</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      profile.kycDocuments?.panCard?.verified ? 'bg-green-100 text-green-700' :
                      profile.kycDocuments?.panCard?.url ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {profile.kycDocuments?.panCard?.verified ? 'Verified' :
                       profile.kycDocuments?.panCard?.url ? 'Pending' : 'Not Uploaded'}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Business License</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      profile.kycDocuments?.businessLicense?.verified ? 'bg-green-100 text-green-700' :
                      profile.kycDocuments?.businessLicense?.url ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {profile.kycDocuments?.businessLicense?.verified ? 'Verified' :
                       profile.kycDocuments?.businessLicense?.url ? 'Pending' : 'Not Uploaded'}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">GST Certificate</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      profile.kycDocuments?.gstCertificate?.verified ? 'bg-green-100 text-green-700' :
                      profile.kycDocuments?.gstCertificate?.url ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {profile.kycDocuments?.gstCertificate?.verified ? 'Verified' :
                       profile.kycDocuments?.gstCertificate?.url ? 'Pending' : 'Not Uploaded'}
                    </span>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Bank Proof</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${
                      profile.kycDocuments?.bankProof?.verified ? 'bg-green-100 text-green-700' :
                      profile.kycDocuments?.bankProof?.url ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {profile.kycDocuments?.bankProof?.verified ? 'Verified' :
                       profile.kycDocuments?.bankProof?.url ? 'Pending' : 'Not Uploaded'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {message}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-lg hover:from-orange-700 hover:to-orange-600 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Navigation Links */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link href="/arena-partner/dashboard" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-orange-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Dashboard</p>
          </Link>

          <Link href="/arena-partner/venues" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Venues</p>
          </Link>

          <Link href="/arena-partner/analytics" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Analytics</p>
          </Link>

          <Link href="/arena-partner/payouts" className="p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all hover:scale-105 active:scale-95 text-center">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-xs sm:text-sm font-medium text-gray-900">Payouts</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
