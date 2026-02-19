"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accessibility,
  Car,
  Home,
  Layers,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
  TreePine,
  Users,
  X,
} from "lucide-react";
import Navbar from "../../Navbar";
import Footer from "../../Footer";
import { toast } from "sonner";

const slugifyVenueName = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

interface Venue {
  _id: string;
  managedByVenueId?: string | null;
  name: string;
  businessName: string;
  description?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
  };
  capacity?: number;
  capacityDetails?: {
    standingCapacity?: number;
  };
  parking?: {
    carCapacity?: number;
    twoWheelerAvailable?: boolean;
  };
  accessibility?: {
    wheelchairAccess?: boolean;
    liftElevator?: boolean;
  };
  venueClassification?: {
    venueTypes?: string[];
    indoorOutdoor?: string;
  };
  gallery?: Array<{ url?: string; isMain?: boolean }>;
  documents?: {
    venueImages?: Array<{ url?: string; isMain?: boolean }>;
  };
  images?: Array<{
    public_id?: string;
    url: string;
    width?: number;
    format?: string;
    size?: number;
    created_at?: string;
  }>;
  coverImage?: string;
  pricing?: {
    basePrice?: number;
    hourlyRate?: number;
  };
  rating?: {
    average?: number;
    count?: number;
  };
  isPopular?: boolean;
  isVerified?: boolean;
}

type VenueType = "indoor" | "outdoor" | "both";
type PriceRange = "budget" | "mid" | "premium";

interface Filters {
  search: string;
  venueTypes: VenueType[];
  priceRange: PriceRange[];
  minCapacity: number;
  parking: boolean;
  accessibility: boolean;
}

const createDefaultFilters = (): Filters => ({
  search: "",
  venueTypes: [],
  priceRange: [],
  minCapacity: 0,
  parking: false,
  accessibility: false,
});

const priceRanges: { key: PriceRange; label: string; min: number; max: number }[] = [
  { key: "budget", label: "Under ₹1,50,000", min: 0, max: 150000 },
  { key: "mid", label: "₹1,50,000 – ₹3,00,000", min: 150000, max: 300000 },
  { key: "premium", label: "₹3,00,000+", min: 300000, max: Infinity },
];

const venueTypeOptions: { key: VenueType; label: string; icon: typeof Home }[] = [
  { key: "indoor", label: "Indoor", icon: Home },
  { key: "outdoor", label: "Outdoor", icon: TreePine },
  { key: "both", label: "Indoor & Outdoor", icon: Layers },
];

const getVenueType = (venue: Venue): VenueType => {
  const value = venue.venueClassification?.indoorOutdoor?.toLowerCase();
  if (value === "indoor") return "indoor";
  if (value === "outdoor") return "outdoor";
  if (value === "indoor_outdoor" || value === "indoor outdoor" || value === "both") {
    return "both";
  }
  return "both";
};

const getVenueImageUrl = (venue: Venue) => {
  // Check venue.images first (new Cloudinary images field)
  const venueImages = Array.isArray(venue.images) ? venue.images : [];
  
  // If cover image is set, find it in the images array
  if (venue.coverImage && venueImages.length > 0) {
    const coverImage = venueImages.find(img => img.public_id === venue.coverImage);
    if (coverImage?.url) {
      return coverImage.url;
    }
  }
  
  // Fallback to first image if no cover image is set or not found
  if (venueImages.length > 0) {
    return venueImages[0].url || "https://images.unsplash.com/photo-1519167758481-83f550bb49b3";
  }
  
  // Fallback to gallery and documents.venueImages (legacy fields)
  const gallery = Array.isArray(venue.gallery) ? venue.gallery : [];
  const docImages = Array.isArray(venue.documents?.venueImages) ? venue.documents?.venueImages ?? [] : [];
  const merged = [...gallery, ...docImages];
  return (
    merged.find((img) => img?.isMain && img.url)?.url ||
    merged.find((img) => img?.url)?.url ||
    "https://images.unsplash.com/photo-1519167758481-83f550bb49b3"
  );
};

const matchesFilters = (venue: Venue, filters: Filters): boolean => {
  if (filters.search) {
    const haystack = `${venue.businessName} ${venue.name} ${venue.address?.city ?? ""} ${venue.address?.state ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.search.toLowerCase())) return false;
  }

  if (filters.venueTypes.length > 0 && !filters.venueTypes.includes(getVenueType(venue))) {
    return false;
  }

  if (filters.priceRange.length > 0) {
    const basePrice = venue.pricing?.basePrice;
    const inRange = filters.priceRange.some((rangeKey) => {
      const range = priceRanges.find((p) => p.key === rangeKey);
      if (!range) return false;
      if (basePrice === undefined) return false;
      return basePrice >= range.min && basePrice < range.max;
    });
    if (!inRange) return false;
  }

  const capacityValue = venue.capacityDetails?.standingCapacity ?? venue.capacity ?? 0;
  if (filters.minCapacity > 0 && capacityValue < filters.minCapacity) {
    return false;
  }

  const hasParking = Boolean(venue.parking?.carCapacity || venue.parking?.twoWheelerAvailable);
  if (filters.parking && !hasParking) {
    return false;
  }

  const isAccessible = Boolean(venue.accessibility?.wheelchairAccess || venue.accessibility?.liftElevator);
  if (filters.accessibility && !isAccessible) {
    return false;
  }

  return true;
};

const FilterPanel = ({
  filters,
  setFilters,
  resultCount,
  onReset,
}: {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  resultCount: number;
  onReset: () => void;
}) => {
  const activeCount =
    filters.venueTypes.length +
    filters.priceRange.length +
    (filters.minCapacity > 0 ? 1 : 0) +
    (filters.parking ? 1 : 0) +
    (filters.accessibility ? 1 : 0);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Venue Type</h4>
        <div className="space-y-2.5">
          {venueTypeOptions.map((opt) => (
            <label key={opt.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filters.venueTypes.includes(opt.key)}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    venueTypes:
                      checked === true
                        ? [...prev.venueTypes, opt.key]
                        : prev.venueTypes.filter((type) => type !== opt.key),
                  }))
                }
              />
              <opt.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Price Range</h4>
        <div className="space-y-2.5">
          {priceRanges.map((range) => (
            <label key={range.key} className="flex items-center gap-3 cursor-pointer">
              <Checkbox
                checked={filters.priceRange.includes(range.key)}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    priceRange:
                      checked === true
                        ? [...prev.priceRange, range.key]
                        : prev.priceRange.filter((p) => p !== range.key),
                  }))
                }
              />
              <span className="text-sm text-foreground">{range.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Minimum Guests</h4>
        <Input
          type="number"
          placeholder="Any"
          min={0}
          value={filters.minCapacity || ""}
          onChange={(e) =>
            setFilters((prev) => ({
              ...prev,
              minCapacity: Number(e.target.value) || 0,
            }))
          }
          className="max-w-[140px]"
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold text-foreground mb-3">Features</h4>
        <div className="space-y-2.5">
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={filters.parking}
              onCheckedChange={(checked) =>
                setFilters((prev) => ({
                  ...prev,
                  parking: checked === true,
                }))
              }
            />
            <Car className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Parking</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox
              checked={filters.accessibility}
              onCheckedChange={(checked) =>
                setFilters((prev) => ({
                  ...prev,
                  accessibility: checked === true,
                }))
              }
            />
            <Accessibility className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-foreground">Accessible</span>
          </label>
        </div>
      </div>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-primary hover:text-primary/80">
          Clear all filters
        </Button>
      )}

      <p className="text-xs text-muted-foreground pt-2">
        {resultCount} venue{resultCount !== 1 ? "s" : ""} found
      </p>
    </div>
  );
};

const VenueCard = ({ venue }: { venue: Venue }) => {
  const router = useRouter();
  const imageUrl = getVenueImageUrl(venue);
  const capacity = venue.capacityDetails?.standingCapacity ?? venue.capacity ?? 0;
  const venueTypeLabel =
    getVenueType(venue) === "both"
      ? "Indoor & Outdoor"
      : getVenueType(venue) === "indoor"
      ? "Indoor"
      : "Outdoor";
  const hasParking = Boolean(venue.parking?.carCapacity || venue.parking?.twoWheelerAvailable);

  return (
    <button
      type="button"
      onClick={() => {
        router.push(`/allVenues/${venue._id}`);
      }}
      className="group text-left w-full h-full min-h-[420px] md:min-h-[460px] bg-card rounded-2xl border border-surface-border/80 shadow-sm overflow-hidden hover:shadow-lg transition-shadow duration-300"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={imageUrl}
          alt={venue.businessName || venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
      </div>
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground leading-tight line-clamp-2">{venue.businessName || venue.name}</h3>
          <div className="flex items-center gap-1 shrink-0">
            <Star className="w-3.5 h-3.5 fill-primary text-primary" />
            <span className="text-sm font-medium text-foreground">{venue.rating?.average ?? "–"}</span>
            <span className="text-xs text-muted-foreground">({venue.rating?.count ?? 0})</span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>
            {venue.address?.city || "Unknown"}
            {venue.address?.state ? `, ${venue.address.state}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Up to {capacity || "N/A"}
          </span>
          <span>{venueTypeLabel}</span>
          {hasParking && (
            <span className="flex items-center gap-1">
              <Car className="w-3 h-3" /> Parking
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default function AllVenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [filters, setFilters] = useState<Filters>(createDefaultFilters);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVenues = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await fetch(`${apiUrl}/api/venue/`);
        const data = await response.json();

        if (data.success) {
          const allVenues: Venue[] = data.data.venues;
          const parentVenues = allVenues.filter((v) => v.managedByVenueId == null);
          setVenues(parentVenues);
        } else {
          toast.error("Failed to load venues");
        }
      } catch (error) {
        console.error("Error fetching venues:", error);
        toast.error("Failed to load venues");
      } finally {
        setLoading(false);
      }
    };

    fetchVenues();
  }, []);

  const filtered = useMemo(() => venues.filter((venue) => matchesFilters(venue, filters)), [venues, filters]);

  const activeFilterCount =
    filters.venueTypes.length +
    filters.priceRange.length +
    (filters.minCapacity > 0 ? 1 : 0) +
    (filters.parking ? 1 : 0) +
    (filters.accessibility ? 1 : 0);

  const resetFilters = () => setFilters(createDefaultFilters());

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 pb-12">
        <div className="sticky top-0 z-30 bg-card border-b border-surface-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search venues, cities..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                    }))
                  }
                  className="pl-10 rounded-full border-surface-border"
                />
                {filters.search && (
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden rounded-full relative shrink-0">
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="pt-4">
                    <FilterPanel filters={filters} setFilters={setFilters} resultCount={filtered.length} onReset={resetFilters} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Explore Venues</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {filtered.length} venue{filtered.length !== 1 ? "s" : ""} available
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <aside className="hidden lg:block w-60 shrink-0">
              <div className="sticky top-24 bg-card rounded-xl border border-surface-border p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">Filters</h3>
                <FilterPanel filters={filters} setFilters={setFilters} resultCount={filtered.length} onReset={resetFilters} />
              </div>
            </aside>

            <div className="flex-1">
              {filtered.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map((venue) => (
                    <VenueCard key={venue._id} venue={venue} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-lg font-medium text-foreground">No venues found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                  <Button variant="outline" className="mt-4 rounded-full" onClick={resetFilters}>
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
