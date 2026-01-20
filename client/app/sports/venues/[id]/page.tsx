'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sportsApi } from '@/lib/api/sports';
import Navbar from '@/app/Navbar';
import Footer from '@/app/Footer';
import Image from 'next/image';
import { MapPin, Star, Clock, Users, Phone, Mail, Calendar, Trophy, ChevronRight, Activity } from 'lucide-react';

export default function VenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const venueId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [venue, setVenue] = useState<any>(null);
  const [courts, setCourts] = useState<any[]>([]);
  const [selectedSport, setSelectedSport] = useState<string>('all');
  const [activeSection, setActiveSection] = useState<'about' | 'courts' | 'gallery' | 'reviews' | 'facilities'>('courts');

  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number>(0);

  // Map Date.getDay() to our operatingHours keys
  const dayKeyMap: any = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };
  const todayKey = dayKeyMap[new Date().getDay()];

  useEffect(() => {
    if (venueId) {
      fetchVenueDetails();
    }
  }, [venueId]);

  const fetchVenueDetails = async () => {
    setLoading(true);
    try {
      const response = await sportsApi.getVenueDetails(venueId);
      setVenue(response.data.data.venue);
      setCourts(response.data.data.courts || []);
    } catch (error) {
      console.error('Failed to fetch venue details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push(`/auth?redirect=/sports/venues/${venueId}`);
      return;
    }

    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
      alert('Please select a rating between 1 and 5');
      return;
    }

    setSubmittingReview(true);
    try {
      await sportsApi.addReview(venueId, {
        ratings: { overall: reviewForm.rating },
        comment: reviewForm.comment,
      });
      setReviewForm({ rating: 5, comment: '' });
      await fetchVenueDetails();
      setActiveSection('reviews');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit review';
      alert(msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getSportIcon = (sportType: string) => {
    const icons: any = {
      cricket: '🏏',
      football: '⚽',
      basketball: '🏀',
      badminton: '🏸',
      tennis: '🎾',
      volleyball: '🏐',
      table_tennis: '🏓',
      swimming: '🏊',
      gym: '💪',
      yoga: '🧘',
      squash: '🎾',
      boxing: '🥊',
      martial_arts: '🥋',
      athletics: '🏃',
      hockey: '🏑',
      kabaddi: '🤼',
      archery: '🏹',
      shooting: '🎯',
      golf: '⛳',
    };
    return icons[sportType] || '🏟️';
  };

  const filteredCourts = selectedSport === 'all'
    ? courts
    : courts.filter(court => court.sportType === selectedSport);

  const uniqueSports = Array.from(new Set(courts.map(c => c.sportType)));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Venue Not Found</h2>
          <button
            onClick={() => router.push('/sports')}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Back to Sports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero Section with Venue Image */}
      <section className="relative h-[50vh] md:h-[60vh] bg-gradient-to-br from-slate-900 to-slate-800">
        {(() => {
          const cover = venue.gallery?.images?.find((img: any) => img.isMain) || venue.gallery?.images?.[0];
          return cover?.url ? (
            <Image
              src={cover.url}
              alt={venue.venueName}
              fill
              className="object-cover opacity-60"
            />) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-32 h-32 text-white/20" />
            </div>
          );
        })()}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              {venue.isFeatured && (
                <span className="bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1.5">
                  <Trophy className="w-3 h-3" /> Featured
                </span>
              )}
              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                {venue.sportsSupported?.length || 0} Sports Available
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight">
              {venue.venueName}
            </h1>

            <div className="flex flex-wrap items-center gap-6 text-white/90">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <span className="font-medium">{venue.address?.city}, {venue.address?.state}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-orange-400 text-orange-400" />
                <span className="font-bold">{venue.rating?.overall?.toFixed(1) || 'New'}</span>
                {(() => {
                  const count = (venue.reviews?.length ?? venue.rating?.totalReviews ?? 0) as number;
                  return (
                    <span className="text-white/60">({count} {count === 1 ? 'review' : 'reviews'})</span>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white  rounded-3xl p-2">
              <div
                className="
      grid grid-cols-3 gap-2
      sm:flex sm:items-center sm:gap-2 sm:overflow-x-auto
    "
              >
                <button
                  type="button"
                  onClick={() => setActiveSection('about')}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-colors border ${activeSection === 'about'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                >
                  About
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('courts')}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-colors border ${activeSection === 'courts'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                >
                  Courts
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('gallery')}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-colors border ${activeSection === 'gallery'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                >
                  Gallery
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('reviews')}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-colors border ${activeSection === 'reviews'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                >
                  Reviews
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSection('facilities')}
                  className={`px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-colors border ${activeSection === 'facilities'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                >
                  Facilities
                </button>
              </div>
            </div>


            {/* About Section */}
            {activeSection === 'about' && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">About This Venue</h2>
                <p className="text-slate-600 leading-relaxed">
                  {venue.description || 'A premium sports facility offering world-class amenities and professional-grade courts for athletes of all levels.'}
                </p>
              </div>
            )}

            {/* ================= COURTS ================= */}
            {activeSection === 'courts' && (
              <section className="space-y-10">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                    Available Courts <span className="text-slate-400">({filteredCourts.length})</span>
                  </h2>

                  {uniqueSports.length > 1 && (
                    <select
                      value={selectedSport}
                      onChange={(e) => setSelectedSport(e.target.value)}
                      className="filter-pill"
                    >
                      <option value="all">All Sports</option>
                      {uniqueSports.map((sport) => (
                        <option key={sport} value={sport}>
                          {sport.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Empty State */}
                {filteredCourts.length === 0 ? (
                  <div className="py-20 text-center border border-black/10 rounded-2xl">
                    <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 text-sm">
                      No courts available for this sport.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {filteredCourts.map((court) => (
                      <div
                        key={court._id}
                        onClick={() =>
                          router.push(`/sports/courts/${court._id}/booking`)
                        }
                        className="
              group cursor-pointer
              border border-black/10 rounded-2xl overflow-hidden
              hover:-translate-y-1 hover:border-black/20
              transition-all
            "
                      >
                        {/* Image */}
                        <div className="relative h-48 bg-slate-100">
                          {(() => {
                            const cover =
                              court.images?.find((i: any) => i.isMain) ||
                              court.images?.[0];
                            return cover?.url ? (
                              <img
                                src={cover.url}
                                alt={court.courtName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                <span className="text-5xl">
                                  {getSportIcon(court.sportType)}
                                </span>
                              </div>
                            );
                          })()}

                          {/* Status */}
                          <span className="
                absolute top-3 right-3
                text-xs font-semibold
                px-3 py-1 rounded-full
                bg-white/90 backdrop-blur
                border border-black/10
              ">
                            {court.status}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                          {/* Title */}
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">
                              {getSportIcon(court.sportType)}
                            </span>
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900">
                                {court.courtName}
                              </h3>
                              {court.courtNumber && (
                                <p className="text-xs text-slate-500">
                                  Court #{court.courtNumber}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Meta */}
                          <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <p className="text-slate-500">Sport</p>
                            <p className="font-medium capitalize">
                              {court.sportType.replace('_', ' ')}
                            </p>

                            <p className="text-slate-500">Capacity</p>
                            <p className="font-medium">
                              {court.capacity?.players || 'N/A'} players
                            </p>

                            <p className="text-slate-500">Surface</p>
                            <p className="font-medium capitalize">
                              {court.specifications?.surfaceType || 'Standard'}
                            </p>

                            {court.specifications?.indoor !== undefined && (
                              <>
                                <p className="text-slate-500">Type</p>
                                <p className="font-medium">
                                  {court.specifications.indoor ? 'Indoor' : 'Outdoor'}
                                </p>
                              </>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="pt-4 border-t border-black/10 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">
                                Starting from
                              </p>
                              <p className="text-xl font-bold text-slate-900">
                                ₹{court.pricing?.weekday?.offPeak?.pricePerHour || 'N/A'}
                                <span className="text-sm font-normal text-slate-500"> /hr</span>
                              </p>
                            </div>

                            <span className="text-sm font-semibold flex items-center gap-1">
                              Book <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}


            {/* Facilities Section */}
            {activeSection === 'facilities' && venue.facilities && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Facilities & Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(venue.facilities).map(([key, value]: [string, any]) => {
                    if (value?.available) {
                      return (
                        <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <span className="text-orange-600">✓</span>
                          </div>
                          <span className="text-sm font-medium text-slate-700 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
            {/* Gallery */}
            {activeSection === 'gallery' && venue.gallery?.images?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-slate-900">Venue Photos</h2>
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Click on any image to view it in full size</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {venue.gallery.images.map((img: any, idx: number) => (
                    <button
                      key={idx}
                      className="relative w-full h-40 rounded-xl overflow-hidden focus:outline-none"
                      onClick={() => { setLightboxIndex(idx); setLightboxOpen(true); }}
                      aria-label={`Open image ${idx + 1}`}
                    >
                      <img src={img.url} alt={img.caption || `Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {lightboxOpen && venue.gallery?.images?.length > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" role="dialog" aria-modal="true">
                <div className="absolute inset-0" onClick={() => setLightboxOpen(false)} />
                <div className="relative z-10 max-w-5xl w-[92vw]">
                  <div className="relative bg-transparent rounded-xl overflow-hidden">
                    <img
                      src={venue.gallery.images[lightboxIndex]?.url}
                      alt={venue.gallery.images[lightboxIndex]?.caption || `Photo ${lightboxIndex + 1}`}
                      className="w-full h-auto max-h-[80vh] object-contain"
                    />
                    <button
                      onClick={() => setLightboxOpen(false)}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-white/90 text-slate-900 text-sm font-semibold hover:bg-white"
                      aria-label="Close"
                    >
                      Close
                    </button>
                    {venue.gallery.images.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i - 1 + venue.gallery.images.length) % venue.gallery.images.length); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-white/90 text-slate-900 text-sm font-semibold hover:bg-white"
                        aria-label="Previous image"
                      >
                        Prev
                      </button>
                    )}
                    {venue.gallery.images.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setLightboxIndex((i) => (i + 1) % venue.gallery.images.length); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full bg-white/90 text-slate-900 text-sm font-semibold hover:bg-white"
                        aria-label="Next image"
                      >
                        Next
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'reviews' && (
              <section className="space-y-12">

                {/* ===== Header ===== */}
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-slate-900">Reviews</h2>
                  {(() => {
                    const count = (venue.reviews?.length ?? venue.rating?.totalReviews ?? 0) as number;
                    const ratingVal = venue.rating?.overall;
                    const ratingText = typeof ratingVal === 'number' ? ratingVal.toFixed(1) : 'New';
                    return (
                      <p className="text-sm text-slate-600 mt-2">
                        {count} {count === 1 ? 'review' : 'reviews'} · {ratingText} overall rating
                      </p>
                    );
                  })()}
                </div>

                {/* ===== Write Review ===== */}
                <div className="border border-black/10 rounded-2xl p-6 md:p-8">
                  <h3 className="text-xl font-semibold mb-6">Write a review</h3>

                  <div className="space-y-6">

                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Your rating
                      </label>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() =>
                              setReviewForm((p) => ({ ...p, rating: r }))
                            }
                            className="p-1 focus:outline-none"
                          >
                            <Star
                              className={`w-6 h-6 transition ${r <= reviewForm.rating
                                ? 'fill-black text-black'
                                : 'text-slate-300'
                                }`}
                            />
                          </button>
                        ))}
                        <span className="ml-3 text-sm text-slate-600">
                          {reviewForm.rating}/5
                        </span>
                      </div>
                    </div>

                    {/* Comment */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Your experience
                      </label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) =>
                          setReviewForm((p) => ({ ...p, comment: e.target.value }))
                        }
                        rows={4}
                        className="w-full px-4 py-3 border border-black/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10"
                        placeholder="What did you like or dislike about this venue?"
                      />
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleSubmitReview}
                        disabled={submittingReview}
                        className="px-6 py-3 rounded-full bg-black text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {submittingReview ? 'Submitting…' : 'Submit review'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* ===== Reviews List ===== */}

                {Array.isArray(venue.reviews) && venue.reviews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {venue.reviews
                      .slice()
                      .reverse()
                      .map((r: any, idx: number) => {
                        const name = r.user?.name || 'Anonymous User';
                        const parts = name.trim().split(' ');
                        const initials =
                          parts.length >= 2
                            ? `${parts[0][0]}${parts[parts.length - 1][0]}`
                            : parts[0][0];

                        return (
                          <div
                            key={r._id || idx}
                            className="border border-black/10 rounded-2xl p-6 bg-white"
                          >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                {/* Avatar */}
                                <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-semibold text-sm">
                                  {initials.toUpperCase()}
                                </div>

                                {/* Name + Date */}
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">
                                    {name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {r.createdAt
                                      ? new Date(r.createdAt).toLocaleDateString()
                                      : ''}
                                  </p>
                                </div>
                              </div>

                              {/* Rating */}
                              <div className="flex items-center gap-1 text-sm font-semibold">
                                <Star className="w-4 h-4 fill-black text-black" />
                                {r.ratings?.overall ?? '-'}
                              </div>
                            </div>

                            {/* Comment */}
                            {r.comment && (
                              <p className="text-sm text-slate-700 leading-relaxed">
                                {r.comment}
                              </p>
                            )}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">
                    No reviews yet. Be the first to share your experience.
                  </p>
                )}

              </section>
            )}


          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Contact Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sticky top-8">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Contact Information</h3>
              <div className="space-y-4">
                {venue.contactInfo?.primaryPhone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Phone</p>
                      <p className="text-sm font-medium text-slate-900">{venue.contactInfo.primaryPhone}</p>
                    </div>
                  </div>
                )}
                {venue.contactInfo?.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Email</p>
                      <p className="text-sm font-medium text-slate-900">{venue.contactInfo.email}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Address</p>
                    <p className="text-sm font-medium text-slate-900">
                      {venue.address?.street}, {venue.address?.city}
                      <br />
                      {venue.address?.state} - {venue.address?.pincode}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-900 mb-3">Operating Hours</h4>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span>
                    {venue?.operatingHours?.[todayKey]?.closed
                      ? 'Closed today'
                      : `${venue?.operatingHours?.[todayKey]?.open || '06:00'} - ${venue?.operatingHours?.[todayKey]?.close || '23:00'}`}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map((day) => (
                    <div key={day} className="flex items-center justify-between">
                      <span className="capitalize">{day}</span>
                      <span>
                        {venue?.operatingHours?.[day]?.closed
                          ? 'Closed'
                          : `${venue?.operatingHours?.[day]?.open || '06:00'} - ${venue?.operatingHours?.[day]?.close || '23:00'}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => router.push('/sports')}
                className="w-full mt-6 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors font-medium"
              >
                Back to All Venues
              </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
