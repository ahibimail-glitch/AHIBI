"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Users,
  IndianRupee,
  Music,
  Loader2,
  Search,
  Guitar,
} from "lucide-react";

interface JammingSpace {
  _id: string;
  name: string;
  description?: string;
  tagline?: string;
  address?: {
    city?: string;
    state?: string;
    street?: string;
  };
  capacity?: number;
  capacityDetails?: {
    standingCapacity?: number;
  };
  pricing?: {
    basePrice?: number;
    hourlyRate?: number;
    halfDayRate?: number;
    fullDayRate?: number;
  };
  venueId?: {
    _id: string;
    name?: string;
    businessName?: string;
    coverImage?: string;
    images?: Array<{ url: string; public_id?: string }>;
  };
  images?: Array<{ url: string }>;
  gallery?: Array<{ url: string; isMain?: boolean }>;
}

const getSpaceImage = (space: JammingSpace) => {
  const imgs = space.images || space.gallery || [];
  const main = imgs.find((i) => (i as { isMain?: boolean }).isMain);
  if (main?.url) return main.url;
  if (imgs[0]?.url) return imgs[0].url;
  const venueImgs = space.venueId?.images || [];
  if (venueImgs.length > 0) return venueImgs[0].url;
  return "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80";
};

const formatPrice = (space: JammingSpace) => {
  const rate = space.pricing?.hourlyRate ?? space.pricing?.basePrice;
  if (!rate || rate <= 0) return "Price on request";
  return `₹${rate.toLocaleString()}/hr`;
};

export default function JammingRoomsPage() {
  const [spaces, setSpaces] = useState<JammingSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    fetchSpaces();
  }, []);

  const fetchSpaces = async (searchVal = search, cityVal = city) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ venueType: "jamming_room", limit: "50" });
      if (searchVal) params.set("search", searchVal);
      if (cityVal) params.set("city", cityVal);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const res = await fetch(`${apiUrl}/api/venue/public/spaces?${params}`);
      const data = await res.json();
      setSpaces(data?.success ? data?.data?.spaces || [] : []);
    } catch (e) {
      console.error(e);
      setSpaces([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSpaces(search, city);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/allVenues"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to venues
        </Link>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                <Guitar className="h-6 w-6" />
              </div>
              <Badge variant="secondary" className="text-purple-700 bg-purple-100">
                Jamming & practice
              </Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Jamming Rooms</h1>
            <p className="text-gray-600 mt-2 max-w-2xl">
              Book jamming rooms with live availability, hourly pricing, and instant booking.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search jamming rooms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="sm:w-40"
          />
          <Button type="submit" className="bg-pink-600 hover:bg-pink-700">
            Search
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
          </div>
        ) : spaces.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Music className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No jamming rooms listed yet</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Venue owners can list jamming rooms under the Jamming Room category in their dashboard.
            </p>
            <Link href="/venue/auth/signup">
              <Button className="bg-pink-600 hover:bg-pink-700">List your jamming room</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {spaces.map((space) => {
              const venueId = typeof space.venueId === "object" ? space.venueId?._id : space.venueId;
              const venueName = space.venueId?.businessName || space.venueId?.name || "Venue";
              const location = [space.address?.city, space.address?.state].filter(Boolean).join(", ");
              const capacity = space.capacityDetails?.standingCapacity ?? space.capacity;

              return (
                <Link
                  key={space._id}
                  href={`/allVenues/${venueId}/${space._id}`}
                  className="group bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="relative aspect-[16/10] overflow-hidden">
                    <img
                      src={getSpaceImage(space)}
                      alt={space.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-purple-600 text-white">Jamming Room</Badge>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">{venueName}</p>
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{space.name}</h3>
                      {space.tagline && (
                        <p className="text-sm text-gray-500 line-clamp-1 mt-0.5">{space.tagline}</p>
                      )}
                    </div>
                    {location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{location}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Users className="h-4 w-4" />
                        {capacity ? `Up to ${capacity}` : "Capacity on request"}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-pink-600">
                        <IndianRupee className="h-4 w-4" />
                        {formatPrice(space)}
                      </span>
                    </div>
                    {space.description && (
                      <p className="text-sm text-gray-500 line-clamp-2">{space.description}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
