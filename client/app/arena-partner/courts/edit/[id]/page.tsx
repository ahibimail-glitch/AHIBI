'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { arenaPartnerCourts, arenaPartnerVenues } from '@/lib/api/sports';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { FileUploadArea } from '@/components/ui/file-upload-area';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const SPORTS = [
  'cricket', 'football','pickleball', 'basketball', 'badminton', 'tennis',
  'volleyball', 'table_tennis', 'squash', 'swimming', 'gym',
  'yoga', 'boxing', 'martial_arts', 'athletics', 'hockey',
  'kabaddi', 'archery', 'shooting', 'golf', 'other'
];

const SURFACE_TYPES = ['grass', 'turf', 'concrete', 'wood', 'clay', 'synthetic', 'tiles', 'mat', 'other'];

export default function EditCourtPage() {
  const router = useRouter();
  const params = useParams();
  const courtId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [venues, setVenues] = useState<any[]>([]);
  const [courtImages, setCourtImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [formData, setFormData] = useState({
    venueId: '',
    courtName: '',
    courtNumber: '',
    sportType: 'cricket',
    specifications: {
      surfaceType: 'turf',
      dimensions: {
        length: '',
        width: '',
        unit: 'meters'
      },
      indoor: false,
      covered: false,
      airConditioned: false
    },
    capacity: {
      players: '',
      spectators: ''
    },
    pricing: {
      weekday: {
        offPeak: {
          pricePerHour: '',
          timeRange: { start: '06:00', end: '17:00' }
        },
        peak: {
          pricePerHour: '',
          timeRange: { start: '17:00', end: '23:00' }
        }
      },
      weekend: {
        offPeak: {
          pricePerHour: '',
          timeRange: { start: '06:00', end: '12:00' }
        },
        peak: {
          pricePerHour: '',
          timeRange: { start: '12:00', end: '23:00' }
        }
      },
      duration: 60
    },
    features: {
      lighting: false,
      scoreboard: false,
      nets: false,
      goals: false,
      seating: false,
      soundSystem: false,
      cctv: false
    },
    status: 'active'
  });

  useEffect(() => {
    const token = localStorage.getItem('arenaPartnerToken');
    if (!token) {
      router.replace('/arena-partner/auth');
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch venues
      const venuesRes = await arenaPartnerVenues.getAll();
      const venuesList = venuesRes.data.data.venues || [];
      setVenues(venuesList);

      // Fetch court details
      const courtRes = await arenaPartnerCourts.getById(courtId);
      const court = courtRes.data.data.court;
      
      // Populate form with court data
      const existingImages = court.images?.map((img: any) => img.url) || [];
      const coverIndex = court.images?.findIndex((img: any) => img.isMain) || 0;
      setCourtImages(existingImages);
      setCoverImageIndex(coverIndex);
      
      setFormData({
        venueId: court.venue?._id || court.venue || '',
        courtName: court.courtName || '',
        courtNumber: court.courtNumber || '',
        sportType: court.sportType || 'cricket',
        specifications: {
          surfaceType: court.specifications?.surfaceType || 'turf',
          dimensions: {
            length: court.specifications?.dimensions?.length || '',
            width: court.specifications?.dimensions?.width || '',
            unit: court.specifications?.dimensions?.unit || 'meters'
          },
          indoor: court.specifications?.indoor || false,
          covered: court.specifications?.covered || false,
          airConditioned: court.specifications?.airConditioned || false
        },
        capacity: {
          players: court.capacity?.players || '',
          spectators: court.capacity?.spectators || ''
        },
        pricing: {
          weekday: {
            offPeak: {
              pricePerHour: court.pricing?.weekday?.offPeak?.pricePerHour || '',
              timeRange: court.pricing?.weekday?.offPeak?.timeRange || { start: '06:00', end: '17:00' }
            },
            peak: {
              pricePerHour: court.pricing?.weekday?.peak?.pricePerHour || '',
              timeRange: court.pricing?.weekday?.peak?.timeRange || { start: '17:00', end: '23:00' }
            }
          },
          weekend: {
            offPeak: {
              pricePerHour: court.pricing?.weekend?.offPeak?.pricePerHour || '',
              timeRange: court.pricing?.weekend?.offPeak?.timeRange || { start: '06:00', end: '12:00' }
            },
            peak: {
              pricePerHour: court.pricing?.weekend?.peak?.pricePerHour || '',
              timeRange: court.pricing?.weekend?.peak?.timeRange || { start: '12:00', end: '23:00' }
            }
          },
          duration: court.pricing?.duration || 60
        },
        features: {
          lighting: court.features?.lighting || false,
          scoreboard: court.features?.scoreboard || false,
          nets: court.features?.nets || false,
          goals: court.features?.goals || false,
          seating: court.features?.seating || false,
          soundSystem: court.features?.soundSystem || false,
          cctv: court.features?.cctv || false
        },
        status: court.status || 'active'
      });
    } catch (e) {
      console.error('Failed to fetch data:', e);
      toast.error('Failed to load court details');
      router.back();
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.courtName.trim()) {
      toast.error('Court name is required');
      return;
    }
    
    if (!formData.venueId) {
      toast.error('Please select a venue');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        images: courtImages.map((url, index) => ({
          url,
          caption: `${formData.courtName} - Image ${index + 1}`,
          isMain: index === coverImageIndex
        }))
      };
      
      await arenaPartnerCourts.update(courtId, submitData);
      toast.success('Court updated successfully');
      router.push('/arena-partner/courts');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update court';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files: File[]) => {
    if (files.length === 0) return;
    
    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'courts');
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
          return data.url;
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setCourtImages(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setCourtImages(prev => prev.filter((_, i) => i !== index));
    if (coverImageIndex >= courtImages.length - 1) {
      setCoverImageIndex(Math.max(0, coverImageIndex - 1));
    }
  };

  const setAsCover = (index: number) => {
    setCoverImageIndex(index);
    toast.success('Cover image updated');
  };

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/arena-partner/courts"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Court</h1>
              <p className="text-sm text-gray-600">Update court details and pricing</p>
            </div>
            <div className="flex-1" />
            <Link
              href={`/arena-partner/courts/${courtId}/calendar`}
              className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium"
            >
              View Calendar
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Court Images */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Court Images</h2>
          <p className="text-sm text-gray-600 mb-4">Upload multiple photos of your court. Select one as the cover image that will appear in venue listings.</p>
          <FileUploadArea
            key={`court-images-${coverImageIndex}`}
            type="image"
            multiple={true}
            maxSize={10 * 1024 * 1024}
            onUpload={handleImageUpload}
            uploading={uploading}
            existingFiles={courtImages.map((url, index) => ({ 
              url, 
              name: `Court Image ${index + 1}`,
              isCover: index === coverImageIndex
            }))}
            onRemove={removeImage}
            onSetCover={setAsCover}
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          />
        </div>

        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Venue *
              </label>
              <select
                value={formData.venueId}
                onChange={(e) => updateFormData('venueId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              >
                {venues.map((venue) => (
                  <option key={venue._id} value={venue._id}>
                    {venue.venueName} - {venue.address?.city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Court Name *
              </label>
              <input
                type="text"
                value={formData.courtName}
                onChange={(e) => updateFormData('courtName', e.target.value)}
                placeholder="e.g., Main Court"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Court Number
              </label>
              <input
                type="text"
                value={formData.courtNumber}
                onChange={(e) => updateFormData('courtNumber', e.target.value)}
                placeholder="e.g., 1, A, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Sport Type *
              </label>
              <select
                value={formData.sportType}
                onChange={(e) => updateFormData('sportType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                required
              >
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport.replace('_', ' ').charAt(0).toUpperCase() + sport.replace('_', ' ').slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Surface Type
              </label>
              <select
                value={formData.specifications.surfaceType}
                onChange={(e) => updateFormData('specifications.surfaceType', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                {SURFACE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Specifications */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Specifications</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => updateFormData('status', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Under Maintenance</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dimensions</label>
              <div className="grid grid-cols-3 gap-4">
                <input
                  type="number"
                  value={formData.specifications.dimensions.length}
                  onChange={(e) => updateFormData('specifications.dimensions.length', e.target.value)}
                  placeholder="Length"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
                <input
                  type="number"
                  value={formData.specifications.dimensions.width}
                  onChange={(e) => updateFormData('specifications.dimensions.width', e.target.value)}
                  placeholder="Width"
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                />
                <select
                  value={formData.specifications.dimensions.unit}
                  onChange={(e) => updateFormData('specifications.dimensions.unit', e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  <option value="meters">Meters</option>
                  <option value="feet">Feet</option>
                  <option value="yards">Yards</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Features</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3">
                {Object.entries(formData.features).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) => updateFormData(`features.${key}`, e.target.checked)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700 capitalize leading-snug">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Court Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={formData.specifications.indoor}
                    onChange={(e) => updateFormData('specifications.indoor', e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Indoor</span>
                </label>
                <label className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={formData.specifications.covered}
                    onChange={(e) => updateFormData('specifications.covered', e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Covered</span>
                </label>
                <label className="flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={formData.specifications.airConditioned}
                    onChange={(e) => updateFormData('specifications.airConditioned', e.target.checked)}
                    className="h-4 w-4 shrink-0 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Air Conditioned</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Capacity</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Players Capacity
              </label>
              <input
                type="number"
                value={formData.capacity.players}
                onChange={(e) => updateFormData('capacity.players', e.target.value)}
                placeholder="e.g., 10"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Spectators Capacity
              </label>
              <input
                type="number"
                value={formData.capacity.spectators}
                onChange={(e) => updateFormData('capacity.spectators', e.target.value)}
                placeholder="e.g., 50"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Pricing</h2>
          
          <div className="space-y-6">
            {/* Weekday Pricing */}
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-3">Weekday Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Off-Peak Price (₹/hour)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.weekday.offPeak.pricePerHour}
                    onChange={(e) => updateFormData('pricing.weekday.offPeak.pricePerHour', e.target.value)}
                    placeholder="e.g., 500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <input
                      type="time"
                      value={formData.pricing.weekday.offPeak.timeRange.start}
                      onChange={(e) => updateFormData('pricing.weekday.offPeak.timeRange.start', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <span className="self-center text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={formData.pricing.weekday.offPeak.timeRange.end}
                      onChange={(e) => updateFormData('pricing.weekday.offPeak.timeRange.end', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Peak Price (₹/hour)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.weekday.peak.pricePerHour}
                    onChange={(e) => updateFormData('pricing.weekday.peak.pricePerHour', e.target.value)}
                    placeholder="e.g., 800"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <input
                      type="time"
                      value={formData.pricing.weekday.peak.timeRange.start}
                      onChange={(e) => updateFormData('pricing.weekday.peak.timeRange.start', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <span className="self-center text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={formData.pricing.weekday.peak.timeRange.end}
                      onChange={(e) => updateFormData('pricing.weekday.peak.timeRange.end', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Weekend Pricing */}
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-3">Weekend Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Off-Peak Price (₹/hour)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.weekend.offPeak.pricePerHour}
                    onChange={(e) => updateFormData('pricing.weekend.offPeak.pricePerHour', e.target.value)}
                    placeholder="e.g., 600"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <input
                      type="time"
                      value={formData.pricing.weekend.offPeak.timeRange.start}
                      onChange={(e) => updateFormData('pricing.weekend.offPeak.timeRange.start', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <span className="self-center text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={formData.pricing.weekend.offPeak.timeRange.end}
                      onChange={(e) => updateFormData('pricing.weekend.offPeak.timeRange.end', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Peak Price (₹/hour)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.weekend.peak.pricePerHour}
                    onChange={(e) => updateFormData('pricing.weekend.peak.pricePerHour', e.target.value)}
                    placeholder="e.g., 1000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <div className="flex gap-2 mt-2">
                    <input
                      type="time"
                      value={formData.pricing.weekend.peak.timeRange.start}
                      onChange={(e) => updateFormData('pricing.weekend.peak.timeRange.start', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                    <span className="self-center text-sm text-gray-500">to</span>
                    <input
                      type="time"
                      value={formData.pricing.weekend.peak.timeRange.end}
                      onChange={(e) => updateFormData('pricing.weekend.peak.timeRange.end', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Duration Settings */}
            <div>
              <h3 className="text-md font-semibold text-gray-800 mb-3">Duration Settings</h3>
              <div className="max-w-md">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Booking Duration *
                </label>
                <select
                  value={formData.pricing.duration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pricing: { ...formData.pricing, duration: parseInt(e.target.value) }
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                >
                  <option value={30}>30 minutes (1/2 hour)</option>
                  <option value={60}>60 minutes (1 hour)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose the minimum booking duration for this court</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/arena-partner/courts"
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center font-medium"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
