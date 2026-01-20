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
        );})()}
        
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
                <span className="text-white/60">({venue.rating?.totalReviews || 0} reviews)</span>
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
            {/* About Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">About This Venue</h2>
              <p className="text-slate-600 leading-relaxed">
                {venue.description || 'A premium sports facility offering world-class amenities and professional-grade courts for athletes of all levels.'}
              </p>
            </div>

            {/* Courts Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-900">
                  Available Courts ({filteredCourts.length})
                </h2>
                
                {uniqueSports.length > 1 && (
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
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

              {filteredCourts.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No courts available</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredCourts.map((court) => (
                    <div
                      key={court._id}
                      className="border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:border-orange-200 transition-all group cursor-pointer"
                      onClick={() => router.push(`/sports/courts/${court._id}/booking`)}
                    >
                      {/* Court Image */}
                      <div className="h-48 bg-slate-100 relative">
                        {(() => {
                          const coverImage = court.images?.find((img: any) => img.isMain) || court.images?.[0];
                          return coverImage?.url ? (
                            <img 
                              src={coverImage.url} 
                              alt={court.courtName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300">
                              <div className="text-center">
                                <div className="text-5xl mb-2">{getSportIcon(court.sportType)}</div>
                                <p className="text-sm text-slate-400">No Image Available</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-4xl">{getSportIcon(court.sportType)}</div>
                          <div>
                            <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                              {court.courtName}
                            </h3>
                            {court.courtNumber && (
                              <p className="text-xs text-slate-500">Court #{court.courtNumber}</p>
                            )}
                          </div>
                        </div>
                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {court.status}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Sport Type</span>
                          <span className="font-semibold text-slate-900 capitalize">
                            {court.sportType.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Capacity</span>
                          <span className="font-semibold text-slate-900">
                            {court.capacity?.players || 'N/A'} players
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Surface</span>
                          <span className="font-semibold text-slate-900 capitalize">
                            {court.specifications?.surfaceType || 'Standard'}
                          </span>
                        </div>
                        {court.specifications?.indoor !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Type</span>
                            <span className="font-semibold text-slate-900">
                              {court.specifications.indoor ? 'Indoor' : 'Outdoor'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Starting from</p>
                          <p className="text-2xl font-bold text-orange-600">
                            ₹{court.pricing?.weekday?.offPeak?.pricePerHour || 'N/A'}
                            <span className="text-sm text-slate-500 font-normal">/hr</span>
                          </p>
                        </div>
                        <button className="px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-2 text-sm font-medium group-hover:gap-3">
                          Book Now <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Facilities Section */}
            {venue.facilities && (
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
            {venue.gallery?.images?.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Venue Photos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {venue.gallery.images.map((img: any, idx: number) => (
                    <div key={idx} className="relative w-full h-40 rounded-xl overflow-hidden">
                      <img src={img.url} alt={img.caption || `Photo ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
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
                  {(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const).map((day) => (
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
