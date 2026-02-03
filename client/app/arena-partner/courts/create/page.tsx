'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { arenaPartnerCourts, arenaPartnerVenues } from '@/lib/api/sports';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';
import { FileUploadArea } from '@/components/ui/file-upload-area';
import { toast } from 'react-hot-toast';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const SPORTS = [
  'cricket', 'football','pickleball', 'basketball', 'badminton', 'tennis',
  'volleyball', 'table_tennis', 'squash', 'swimming', 'gym',
  'yoga', 'boxing', 'martial_arts', 'athletics', 'hockey',
  'kabaddi', 'archery', 'shooting', 'golf', 'other'
];

const SURFACE_TYPES = ['grass', 'turf', 'concrete', 'wood', 'clay', 'synthetic', 'tiles', 'mat', 'other'];

function CreateCourtPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueIdParam = searchParams.get('venueId');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [courtImages, setCourtImages] = useState<string[]>([]);
  const [coverImageIndex, setCoverImageIndex] = useState<number>(0);
  const [formData, setFormData] = useState({
    venueId: venueIdParam || '',
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
      minimumDuration: 60,
      maximumDuration: 180,
      slotInterval: 60
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
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      const res = await arenaPartnerVenues.getAll();
      const venuesList = res.data.data.venues || [];
      setVenues(venuesList);
      if (!venueIdParam && venuesList.length > 0) {
        setFormData(prev => ({ ...prev, venueId: venuesList[0]._id }));
      }
    } catch (e) {
      console.error('Failed to fetch venues:', e);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        capacity: {
          players: parseInt(formData.capacity.players as any) || 0,
          spectators: parseInt(formData.capacity.spectators as any) || 0
        },
        specifications: {
          ...formData.specifications,
          dimensions: {
            length: parseFloat(formData.specifications.dimensions.length as any) || undefined,
            width: parseFloat(formData.specifications.dimensions.width as any) || undefined,
            unit: formData.specifications.dimensions.unit
          }
        },
        pricing: {
          weekday: {
            offPeak: {
              pricePerHour: parseFloat(formData.pricing.weekday.offPeak.pricePerHour as any),
              timeRange: formData.pricing.weekday.offPeak.timeRange
            },
            peak: {
              pricePerHour: parseFloat(formData.pricing.weekday.peak.pricePerHour as any),
              timeRange: formData.pricing.weekday.peak.timeRange
            }
          },
          weekend: {
            offPeak: {
              pricePerHour: parseFloat(formData.pricing.weekend.offPeak.pricePerHour as any),
              timeRange: formData.pricing.weekend.offPeak.timeRange
            },
            peak: {
              pricePerHour: parseFloat(formData.pricing.weekend.peak.pricePerHour as any),
              timeRange: formData.pricing.weekend.peak.timeRange
            }
          },
          minimumDuration: formData.pricing.minimumDuration,
          maximumDuration: formData.pricing.maximumDuration,
          slotInterval: formData.pricing.slotInterval
        },
        images: courtImages.map((url, index) => ({
          url,
          caption: `${formData.courtName} - Image ${index + 1}`,
          isMain: index === coverImageIndex
        }))
      };

      await arenaPartnerCourts.create(formData.venueId, submitData);
      alert('Court created successfully!');
      router.push('/arena-partner/courts');
    } catch (error: any) {
      console.error('Failed to create court:', error);
      alert(error.response?.data?.message || 'Failed to create court');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-2xl font-bold text-gray-900">Create New Court</h1>
              <p className="text-sm text-gray-600">Add a new court to your venue</p>
            </div>
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
                  onChange={(e) => setFormData({ ...formData, venueId: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, courtName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="e.g., Main Cricket Ground"
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
                  onChange={(e) => setFormData({ ...formData, courtNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="e.g., 1, A, Court-1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sport Type *
                </label>
                <select
                  value={formData.sportType}
                  onChange={(e) => setFormData({ ...formData, sportType: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  required
                >
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport.replace('_', ' ').toUpperCase()}
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, surfaceType: e.target.value }
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                >
                  {SURFACE_TYPES.map((surface) => (
                    <option key={surface} value={surface}>
                      {surface.toUpperCase()}
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
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: {
                          ...formData.specifications,
                          dimensions: { ...formData.specifications.dimensions, length: e.target.value },
                        },
                      })
                    }
                    placeholder="Length"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <input
                    type="number"
                    value={formData.specifications.dimensions.width}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: {
                          ...formData.specifications,
                          dimensions: { ...formData.specifications.dimensions, width: e.target.value },
                        },
                      })
                    }
                    placeholder="Width"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                  <select
                    value={formData.specifications.dimensions.unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specifications: {
                          ...formData.specifications,
                          dimensions: { ...formData.specifications.dimensions, unit: e.target.value },
                        },
                      })
                    }
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="meters">Meters</option>
                    <option value="feet">Feet</option>
                    <option value="yards">Yards</option>
                  </select>
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
                  Player Capacity *
                </label>
                <input
                  type="number"
                  value={formData.capacity.players}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: { ...formData.capacity, players: e.target.value }
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="e.g., 22"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Spectator Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity.spectators}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      capacity: { ...formData.capacity, spectators: e.target.value }
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  placeholder="e.g., 100"
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Pricing</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Weekday Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Off-Peak Price (₹/hour) *
                    </label>
                    <input
                      type="number"
                      value={formData.pricing.weekday.offPeak.pricePerHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricing: {
                            ...formData.pricing,
                            weekday: {
                              ...formData.pricing.weekday,
                              offPeak: {
                                ...formData.pricing.weekday.offPeak,
                                pricePerHour: e.target.value
                              }
                            }
                          }
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="e.g., 500"
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      <input
                        type="time"
                        value={formData.pricing.weekday.offPeak.timeRange.start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekday: {
                                ...formData.pricing.weekday,
                                offPeak: {
                                  ...formData.pricing.weekday.offPeak,
                                  timeRange: { ...formData.pricing.weekday.offPeak.timeRange, start: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <span className="self-center text-sm text-gray-500">to</span>
                      <input
                        type="time"
                        value={formData.pricing.weekday.offPeak.timeRange.end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekday: {
                                ...formData.pricing.weekday,
                                offPeak: {
                                  ...formData.pricing.weekday.offPeak,
                                  timeRange: { ...formData.pricing.weekday.offPeak.timeRange, end: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peak Price (₹/hour) *
                    </label>
                    <input
                      type="number"
                      value={formData.pricing.weekday.peak.pricePerHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricing: {
                            ...formData.pricing,
                            weekday: {
                              ...formData.pricing.weekday,
                              peak: {
                                ...formData.pricing.weekday.peak,
                                pricePerHour: e.target.value
                              }
                            }
                          }
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="e.g., 800"
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      <input
                        type="time"
                        value={formData.pricing.weekday.peak.timeRange.start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekday: {
                                ...formData.pricing.weekday,
                                peak: {
                                  ...formData.pricing.weekday.peak,
                                  timeRange: { ...formData.pricing.weekday.peak.timeRange, start: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <span className="self-center text-sm text-gray-500">to</span>
                      <input
                        type="time"
                        value={formData.pricing.weekday.peak.timeRange.end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekday: {
                                ...formData.pricing.weekday,
                                peak: {
                                  ...formData.pricing.weekday.peak,
                                  timeRange: { ...formData.pricing.weekday.peak.timeRange, end: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Weekend Pricing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Off-Peak Price (₹/hour) *
                    </label>
                    <input
                      type="number"
                      value={formData.pricing.weekend.offPeak.pricePerHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricing: {
                            ...formData.pricing,
                            weekend: {
                              ...formData.pricing.weekend,
                              offPeak: {
                                ...formData.pricing.weekend.offPeak,
                                pricePerHour: e.target.value
                              }
                            }
                          }
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="e.g., 700"
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      <input
                        type="time"
                        value={formData.pricing.weekend.offPeak.timeRange.start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekend: {
                                ...formData.pricing.weekend,
                                offPeak: {
                                  ...formData.pricing.weekend.offPeak,
                                  timeRange: { ...formData.pricing.weekend.offPeak.timeRange, start: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <span className="self-center text-sm text-gray-500">to</span>
                      <input
                        type="time"
                        value={formData.pricing.weekend.offPeak.timeRange.end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekend: {
                                ...formData.pricing.weekend,
                                offPeak: {
                                  ...formData.pricing.weekend.offPeak,
                                  timeRange: { ...formData.pricing.weekend.offPeak.timeRange, end: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peak Price (₹/hour) *
                    </label>
                    <input
                      type="number"
                      value={formData.pricing.weekend.peak.pricePerHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricing: {
                            ...formData.pricing,
                            weekend: {
                              ...formData.pricing.weekend,
                              peak: {
                                ...formData.pricing.weekend.peak,
                                pricePerHour: e.target.value
                              }
                            }
                          }
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                      placeholder="e.g., 1000"
                      required
                    />
                    <div className="flex gap-2 mt-2">
                      <input
                        type="time"
                        value={formData.pricing.weekend.peak.timeRange.start}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekend: {
                                ...formData.pricing.weekend,
                                peak: {
                                  ...formData.pricing.weekend.peak,
                                  timeRange: { ...formData.pricing.weekend.peak.timeRange, start: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <span className="self-center text-sm text-gray-500">to</span>
                      <input
                        type="time"
                        value={formData.pricing.weekend.peak.timeRange.end}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: {
                              ...formData.pricing,
                              weekend: {
                                ...formData.pricing.weekend,
                                peak: {
                                  ...formData.pricing.weekend.peak,
                                  timeRange: { ...formData.pricing.weekend.peak.timeRange, end: e.target.value },
                                },
                              },
                            },
                          })
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slot Interval (minutes)
                  </label>
                  <select
                    value={formData.pricing.slotInterval}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, slotInterval: parseInt(e.target.value) }
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                    <option value={90}>90 minutes</option>
                    <option value={120}>120 minutes</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.minimumDuration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, minimumDuration: parseInt(e.target.value) }
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.pricing.maximumDuration}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, maximumDuration: parseInt(e.target.value) }
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Features & Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.keys(formData.features).map((feature) => (
                <label key={feature} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.features[feature as keyof typeof formData.features]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        features: { ...formData.features, [feature]: e.target.checked }
                      })
                    }
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.specifications.indoor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, indoor: e.target.checked }
                    })
                  }
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Indoor</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.specifications.covered}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: { ...formData.specifications, covered: e.target.checked }
                    })
                  }
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Covered</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.specifications.airConditioned}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      specifications: {
                        ...formData.specifications,
                        airConditioned: e.target.checked
                      }
                    })
                  }
                  className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Air Conditioned</span>
              </label>
            </div>
          </div>

          {/* Submit Button */}
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
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Create Court
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CreateCourtPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    }>
      <CreateCourtPageContent />
    </Suspense>
  );
}
