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
  const [venueImages, setVenueImages] = useState<{ url: string; isMain?: boolean; name?: string }[]>([]);
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
    paymentSettings: {
      advancePaymentPercent: 10,
    },
    address: {
      street: '',
      area: '',
      city: '',
      state: '',
      pincode: '',
      landmark: '',
    },
    googleMapsLink: '',
    contactInfo: {
      primaryPhone: '',
      secondaryPhone: '',
      email: '',
      whatsappNumber: '',
    },
    sportsSupported: [] as string[],
    operatingHours: {
      monday: { open: '06:00', close: '23:00', closed: false },
      tuesday: { open: '06:00', close: '23:00', closed: false },
      wednesday: { open: '06:00', close: '23:00', closed: false },
      thursday: { open: '06:00', close: '23:00', closed: false },
      friday: { open: '06:00', close: '23:00', closed: false },
      saturday: { open: '06:00', close: '23:00', closed: false },
      sunday: { open: '06:00', close: '23:00', closed: false },
    } as any,
    facilities: {
      parking: { available: false, capacity: undefined, twoWheeler: false, fourWheeler: false, free: false },
      washrooms: { available: false, count: undefined },
      changingRooms: { available: false, count: undefined, lockers: false },
      showers: { available: false },
      drinkingWater: { available: false },
      firstAid: { available: false },
      cafeteria: { available: false },
      wifi: { available: false },
      floodlights: { available: false },
      seating: { available: false, capacity: undefined },
      wheelchairAccess: { available: false },
    } as any,
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
        paymentSettings: {
          advancePaymentPercent: Number(venue.paymentSettings?.advancePaymentPercent) || 10,
        },
        address: venue.address || {
          street: '',
          area: '',
          city: '',
          state: '',
          pincode: '',
          landmark: '',
        },
        googleMapsLink: venue.googleMapsLink || '',
        contactInfo: venue.contactInfo || {
          primaryPhone: '',
          secondaryPhone: '',
          email: '',
          whatsappNumber: '',
        },
        sportsSupported: venue.sportsSupported || [],
        operatingHours: venue.operatingHours || {
          monday: { open: '06:00', close: '23:00', closed: false },
          tuesday: { open: '06:00', close: '23:00', closed: false },
          wednesday: { open: '06:00', close: '23:00', closed: false },
          thursday: { open: '06:00', close: '23:00', closed: false },
          friday: { open: '06:00', close: '23:00', closed: false },
          saturday: { open: '06:00', close: '23:00', closed: false },
          sunday: { open: '06:00', close: '23:00', closed: false },
        },
        facilities: venue.facilities || (form as any).facilities,
        rules: venue.rules || {
          cancellationPolicy: '',
          refundPolicy: '',
          dresscode: '',
          ageRestrictions: '',
          additionalRules: '',
        },
      });
      setVenueImages(Array.isArray(venue.gallery?.images) ? venue.gallery.images : []);
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
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: { url: string; isMain?: boolean; name?: string }[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'venues');
        formData.append('documentType', 'image');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        if (data?.success && data?.url) {
          uploaded.push({ url: data.url, isMain: false, name: file.name });
        } else {
          throw new Error(data?.error || 'Upload failed');
        }
      }
      setVenueImages((prev) => {
        const next = [...prev, ...uploaded];
        if (!next.some((i) => i.isMain) && next[0]) next[0].isMain = true;
        return [...next];
      });
      toast.success('Image(s) uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImageByIndex = (index: number) => {
    setVenueImages((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      if (next.length > 0 && !next.some((i) => i.isMain)) {
        next[0].isMain = true;
      }
      return next;
    });
  };

  const setCoverByIndex = (index: number) => {
    setVenueImages((prev) => prev.map((i, idx) => ({ ...i, isMain: idx === index })));
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
          images: (venueImages || []).map((img, idx) => ({
            url: img.url,
            isMain: img.isMain ?? idx === 0,
            caption: form.venueName,
          })),
        },
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
          {/* Venue Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Venue Images</label>
            <p className="text-xs text-gray-500 mb-3">Upload multiple photos and select a cover image. PNG, JPG, GIF, WebP up to 10MB.</p>
            <FileUploadArea
              type="image"
              multiple={true}
              maxSize={10 * 1024 * 1024}
              onUpload={handleImageUpload}
              uploading={uploading}
              existingFiles={((venueImages as any[]) || []).map((img: any) => ({ url: img.url, name: img.name || 'Venue Image', isCover: !!img.isMain }))}
              onRemove={(index) => removeImageByIndex(index)}
              onSetCover={(index) => setCoverByIndex(index)}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Advance Payment %</label>
            <input
              type="number"
              min={1}
              max={100}
              value={(form as any).paymentSettings?.advancePaymentPercent ?? 10}
              onChange={(e) =>
                setForm({
                  ...form,
                  paymentSettings: {
                    advancePaymentPercent: Math.min(100, Math.max(1, Number(e.target.value) || 10)),
                  },
                })
              }
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
              <input
                type="url"
                value={(form as any).googleMapsLink}
                onChange={(e) => setForm({ ...(form as any), googleMapsLink: e.target.value })}
                placeholder="Google Maps URL (optional)"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none md:col-span-2"
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

          {/* Operating Hours */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Operating Hours</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => (
                <div key={day} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="capitalize font-medium">{day}</span>
                    <label className="text-sm inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean((form as any).operatingHours?.[day]?.closed)}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          operatingHours: {
                            ...(prev as any).operatingHours,
                            [day]: { ...((prev as any).operatingHours?.[day] || {}), closed: e.target.checked },
                          }
                        }))}
                      />
                      Closed
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={((form as any).operatingHours?.[day]?.open) || '06:00'}
                      disabled={Boolean((form as any).operatingHours?.[day]?.closed)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        operatingHours: {
                          ...(prev as any).operatingHours,
                          [day]: { ...((prev as any).operatingHours?.[day] || {}), open: e.target.value },
                        }
                      }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    />
                    <span className="text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={((form as any).operatingHours?.[day]?.close) || '23:00'}
                      disabled={Boolean((form as any).operatingHours?.[day]?.closed)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        operatingHours: {
                          ...(prev as any).operatingHours,
                          [day]: { ...((prev as any).operatingHours?.[day] || {}), close: e.target.value },
                        }
                      }))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Facilities & Amenities */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Facilities & Amenities</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Parking */}
              <div className="border rounded-lg p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium mb-2">
                  <input
                    type="checkbox"
                    checked={Boolean((form as any).facilities?.parking?.available)}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      facilities: { ...(prev as any).facilities, parking: { ...((prev as any).facilities?.parking || {}), available: e.target.checked } }
                    }))}
                  />
                  Parking available
                </label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <input
                    type="number"
                    placeholder="Capacity"
                    value={(form as any).facilities?.parking?.capacity || ''}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      facilities: { ...(prev as any).facilities, parking: { ...((prev as any).facilities?.parking || {}), capacity: Number(e.target.value) } }
                    }))}
                    className="px-3 py-2 rounded-lg border border-gray-300"
                  />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean((form as any).facilities?.parking?.twoWheeler)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        facilities: { ...(prev as any).facilities, parking: { ...((prev as any).facilities?.parking || {}), twoWheeler: e.target.checked } }
                      }))}
                    />
                    2-Wheeler
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean((form as any).facilities?.parking?.fourWheeler)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        facilities: { ...(prev as any).facilities, parking: { ...((prev as any).facilities?.parking || {}), fourWheeler: e.target.checked } }
                      }))}
                    />
                    4-Wheeler
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean((form as any).facilities?.parking?.free)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        facilities: { ...(prev as any).facilities, parking: { ...((prev as any).facilities?.parking || {}), free: e.target.checked } }
                      }))}
                    />
                    Free
                  </label>
                </div>
              </div>

              {/* Washrooms */}
              <div className="border rounded-lg p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium mb-2">
                  <input
                    type="checkbox"
                    checked={Boolean((form as any).facilities?.washrooms?.available)}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      facilities: { ...(prev as any).facilities, washrooms: { ...((prev as any).facilities?.washrooms || {}), available: e.target.checked } }
                    }))}
                  />
                  Washrooms
                </label>
                <input
                  type="number"
                  placeholder="Count"
                  value={(form as any).facilities?.washrooms?.count || ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    facilities: { ...(prev as any).facilities, washrooms: { ...((prev as any).facilities?.washrooms || {}), count: Number(e.target.value) } }
                  }))}
                  className="px-3 py-2 rounded-lg border border-gray-300 w-full"
                />
              </div>

              {/* Changing Rooms */}
              <div className="border rounded-lg p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium mb-2">
                  <input
                    type="checkbox"
                    checked={Boolean((form as any).facilities?.changingRooms?.available)}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      facilities: { ...(prev as any).facilities, changingRooms: { ...((prev as any).facilities?.changingRooms || {}), available: e.target.checked } }
                    }))}
                  />
                  Changing Rooms
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Count"
                    value={(form as any).facilities?.changingRooms?.count || ''}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      facilities: { ...(prev as any).facilities, changingRooms: { ...((prev as any).facilities?.changingRooms || {}), count: Number(e.target.value) } }
                    }))}
                    className="px-3 py-2 rounded-lg border border-gray-300"
                  />
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean((form as any).facilities?.changingRooms?.lockers)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        facilities: { ...(prev as any).facilities, changingRooms: { ...((prev as any).facilities?.changingRooms || {}), lockers: e.target.checked } }
                      }))}
                    />
                    Lockers
                  </label>
                </div>
              </div>

              {/* Simple toggles */}
              {(['showers','drinkingWater','firstAid','cafeteria','wifi','floodlights','wheelchairAccess'] as const).map((key) => (
                <div key={key} className="border rounded-lg p-3">
                  <label className="inline-flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={Boolean((form as any).facilities?.[key]?.available)}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        facilities: { ...(prev as any).facilities, [key]: { ...((prev as any).facilities?.[key] || {}), available: e.target.checked } }
                      }))}
                    />
                    {String(key).replace(/([A-Z])/g, ' $1')}
                  </label>
                </div>
              ))}

              {/* Seating */}
              <div className="border rounded-lg p-3">
                <label className="inline-flex items-center gap-2 text-sm font-medium mb-2">
                  <input
                    type="checkbox"
                    checked={Boolean((form as any).facilities?.seating?.available)}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      facilities: { ...(prev as any).facilities, seating: { ...((prev as any).facilities?.seating || {}), available: e.target.checked } }
                    }))}
                  />
                  Seating
                </label>
                <input
                  type="number"
                  placeholder="Capacity"
                  value={(form as any).facilities?.seating?.capacity || ''}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    facilities: { ...(prev as any).facilities, seating: { ...((prev as any).facilities?.seating || {}), capacity: Number(e.target.value) } }
                  }))}
                  className="px-3 py-2 rounded-lg border border-gray-300 w-full"
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
              {loading ? 'Updating...' : 'Update Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
