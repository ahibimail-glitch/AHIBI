'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditVenuePage() {
  const router = useRouter();
  const params = useParams();
  const venueId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [venueImage, setVenueImage] = useState<string>('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      toast.error('Please login to continue');
      router.replace('/arena-partner/auth');
      return;
    }
    fetchVenue();
  }, [router, venueId]);

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

  const fetchVenue = async () => {
    try {
      const res = await arenaPartnerVenues.getById(venueId);
      const venue = res.data.data.venue;
      
      setForm({
        venueName: venue.venueName || '',
        description: venue.description || '',
        tagline: venue.tagline || '',
        address: venue.address || {
          street: '',
          area: '',
          city: '',
          state: '',
          pincode: '',
          landmark: '',
        },
        location: venue.location || { coordinates: [0, 0] },
        contactInfo: venue.contactInfo || {
          primaryPhone: '',
          secondaryPhone: '',
          email: '',
          whatsappNumber: '',
        },
        sportsSupported: venue.sportsSupported || [],
        rules: venue.rules || {
          cancellationPolicy: '',
          refundPolicy: '',
          dresscode: '',
          ageRestrictions: '',
          additionalRules: '',
        },
      });
      
      if (venue.gallery?.images?.[0]?.url) {
        setVenueImage(venue.gallery.images[0].url);
      }
    } catch (err: any) {
      toast.error('Failed to fetch venue details');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

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
      
      await arenaPartnerVenues.update(venueId, venueData);
      toast.success('Venue updated successfully');
      router.replace('/arena-partner/venues');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update venue';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading venue details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Venue</h1>
          <p className="text-sm text-gray-600">Update your venue details and image</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
          {/* Venue Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue Image</label>
            <p className="text-xs text-gray-500 mb-3">Update your venue photo. This will be displayed on the sports listing page.</p>
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
              {loading ? 'Updating...' : 'Update Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
