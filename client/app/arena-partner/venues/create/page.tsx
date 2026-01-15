'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { arenaPartnerVenues } from '@/lib/api/sports';
import { toast } from 'react-hot-toast';
import { FileUploadArea } from '@/components/ui/file-upload-area';

const ALL_SPORTS = [
  'cricket',
  'football',
  'basketball',
  'badminton',
  'tennis',
  'volleyball',
  'table_tennis',
  'swimming',
  'pickleball',
];

export default function CreateVenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [venueImage, setVenueImage] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      toast.error('Please login to continue');
      router.replace('/arena-partner/auth');
    }
  }, [router]);

  const [form, setForm] = useState({
    venueName: '',
    description: '',
    tagline: '',
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
    },
    location: {
      coordinates: [0, 0], // [longitude, latitude]
    },
    contactInfo: {
      primaryPhone: '',
      secondaryPhone: '',
      email: '',
      whatsappNumber: '',
    },
    sportsSupported: [] as string[],
    rules: {
      cancellationPolicy: '',
      refundPolicy: '',
      dresscode: '',
      ageRestrictions: '',
      additionalRules: '',
    },
  });

  const toggleSport = (sport: string) => {
    setForm((prev) => {
      const has = prev.sportsSupported.includes(sport);
      return {
        ...prev,
        sportsSupported: has
          ? prev.sportsSupported.filter((s) => s !== sport)
          : [...prev.sportsSupported, sport],
      };
    });
  };

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', files[0]);
      formData.append('folder', 'venues');
      formData.append('documentType', 'image');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      if (data.success) {
        setVenueImage(data.url);
        toast.success('Image uploaded successfully');
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setVenueImage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.venueName.trim()) {
      toast.error('Venue name is required');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!form.address.street.trim() || !form.address.city.trim() || !form.address.state.trim() || !form.address.pincode.trim()) {
      toast.error('Street, City, State, and Pincode are required');
      return;
    }
    if (!form.contactInfo.primaryPhone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }
    if (!form.rules.cancellationPolicy.trim() || !form.rules.refundPolicy.trim()) {
      toast.error('Cancellation and refund policies are required');
      return;
    }
    if (form.sportsSupported.length === 0) {
      toast.error('Select at least one sport');
      return;
    }

    setLoading(true);
    try {
      const venueData = {
        ...form,
        gallery: {
          images: venueImage ? [{
            url: venueImage,
            isMain: true,
            caption: form.venueName
          }] : []
        }
      };
      
      await arenaPartnerVenues.create(venueData);
      toast.success('Venue created and submitted for review');
      router.replace('/arena-partner/venues');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create venue';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Venue</h1>
          <p className="text-sm text-gray-600">Provide details about your sports venue. You can edit later.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Venue Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue Image</label>
            <p className="text-xs text-gray-500 mb-3">Add a high-quality photo of your venue. This will be displayed on the sports listing page.</p>
            <FileUploadArea
              type="image"
              multiple={false}
              maxSize={10 * 1024 * 1024}
              onUpload={handleImageUpload}
              uploading={uploading}
              existingFiles={venueImage ? [{ url: venueImage, name: 'Venue Image' }] : []}
              onRemove={removeImage}
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            />
          </div>

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name</label>
            <input
              value={form.venueName}
              onChange={(e) => setForm({ ...form, venueName: e.target.value })}
              placeholder="e.g., Ahibi Sports Arena"
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tagline (optional)</label>
              <input
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Short highlight, e.g., Premium indoor courts"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone *</label>
              <input
                value={form.contactInfo.primaryPhone}
                onChange={(e) => setForm({ ...form, contactInfo: { ...form.contactInfo, primaryPhone: e.target.value } })}
                placeholder="e.g., 9876543210"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Tell customers about your facilities, timings, and services"
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* Address */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Address</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={form.address.street}
                onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                placeholder="Street address *"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <input
                value={form.address.area}
                onChange={(e) => setForm({ ...form, address: { ...form.address, area: e.target.value } })}
                placeholder="Area (optional)"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <input
                value={form.address.city}
                onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                placeholder="City *"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <input
                value={form.address.state}
                onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                placeholder="State *"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <input
                value={form.address.pincode}
                onChange={(e) => setForm({ ...form, address: { ...form.address, pincode: e.target.value } })}
                placeholder="Pincode *"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                required
              />
              <input
                value={form.address.landmark}
                onChange={(e) => setForm({ ...form, address: { ...form.address, landmark: e.target.value } })}
                placeholder="Landmark (optional)"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
              <input
                type="email"
                value={form.contactInfo.email}
                onChange={(e) => setForm({ ...form, contactInfo: { ...form.contactInfo, email: e.target.value } })}
                placeholder="Contact email (optional)"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Rules & Policies */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Rules & Policies</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Cancellation Policy *</label>
                <textarea
                  value={form.rules.cancellationPolicy}
                  onChange={(e) => setForm({ ...form, rules: { ...form.rules, cancellationPolicy: e.target.value } })}
                  placeholder="e.g., Cancellations must be made at least 24 hours before booking time for full refund"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Refund Policy *</label>
                <textarea
                  value={form.rules.refundPolicy}
                  onChange={(e) => setForm({ ...form, rules: { ...form.rules, refundPolicy: e.target.value } })}
                  placeholder="e.g., Full refund for cancellations made 24 hours in advance, 50% refund for cancellations made 12-24 hours in advance"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Dress Code (optional)</label>
                <input
                  type="text"
                  value={form.rules.dresscode}
                  onChange={(e) => setForm({ ...form, rules: { ...form.rules, dresscode: e.target.value } })}
                  placeholder="e.g., Sports attire and non-marking shoes required"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Age Restrictions (optional)</label>
                <input
                  type="text"
                  value={form.rules.ageRestrictions}
                  onChange={(e) => setForm({ ...form, rules: { ...form.rules, ageRestrictions: e.target.value } })}
                  placeholder="e.g., Suitable for ages 12 and above"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Additional Rules (optional)</label>
                <textarea
                  value={form.rules.additionalRules}
                  onChange={(e) => setForm({ ...form, rules: { ...form.rules, additionalRules: e.target.value } })}
                  placeholder="Any additional rules or guidelines"
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Location Coordinates */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Location Coordinates</h3>
            <p className="text-xs text-gray-500 mb-2">These will be used to show your venue on the map. You can get these from Google Maps.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.location.coordinates[1] || ''}
                  onChange={(e) => setForm({ 
                    ...form, 
                    location: { 
                      ...form.location, 
                      coordinates: [form.location.coordinates[0], parseFloat(e.target.value) || 0] 
                    } 
                  })}
                  placeholder="e.g., 19.0760"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={form.location.coordinates[0] || ''}
                  onChange={(e) => setForm({ 
                    ...form, 
                    location: { 
                      ...form.location, 
                      coordinates: [parseFloat(e.target.value) || 0, form.location.coordinates[1]] 
                    } 
                  })}
                  placeholder="e.g., 72.8777"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Sports */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Supported Sports</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_SPORTS.map((s) => {
                const active = form.sportsSupported.includes(s);
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => toggleSport(s)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      active ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {s.replace('_', ' ')}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-lg bg-orange-600 text-white font-medium hover:bg-orange-700 disabled:opacity-60"
            >
              {loading ? 'Creating...' : 'Create Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
