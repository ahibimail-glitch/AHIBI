"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRoleAuthRedirectUrl } from "@/utils/redirectUtils";
import { Calendar, ChevronLeft, MapPin, Star } from "lucide-react";
import Navbar from "@/app/Navbar";
import Footer from "@/app/Footer";
import PublicBookingCalendar from "@/components/artist/PublicBookingCalendar";
import "@/styles/artist-booking.css";

interface Artist {
  _id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  bio: string;
  genres: string[];
  languages: string[];
  type: string;
  basePrice: number;
  profilePic?: string;
  gallery?: {
    photos: Array<{ url: string; caption: string; isProfileImage: boolean; isCoverImage: boolean }>;
    videos: Array<{ url: string; thumbnail: string; caption: string; platform: string }>;
  };
  rating?: { average: number; count: number };
}

export default function ArtistBookingPage() {
  const params = useParams();
  const router = useRouter();
  const artistId = params.artistId as string;

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isOrg = !!localStorage.getItem("organizer_token");
    if (!isOrg) {
      const bookingPath = `/artist/profile/${artistId}/booking`;
      window.location.href = createRoleAuthRedirectUrl("organizer", bookingPath);
      return;
    }

    const fetchArtist = async () => {
      try {
        const res = await fetch(`/api/artist/public/${artistId}`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        setArtist(data.data.artist);
      } catch {
        setError("Artist not found or unavailable");
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistId]);

  if (loading) {
    return (
      <>
        <div className="ap">
          <Navbar />
          <div className="skel" style={{ height: 360 }} />
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 20px" }}>
            <div className="skel" style={{ height: 220 }} />
          </div>
          <Footer />
        </div>
      </>
    );
  }

  if (error || !artist) {
    return (
      <>
        <div className="ap" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 20px", width: "100%" }}>
            <div className="card">
              <div className="card-title">Unable to load artist</div>
              <div className="card-sub">{error || "This artist doesn't exist or has been removed."}</div>
              <button className="btn-ink" onClick={() => router.back()}>
                <ChevronLeft size={15} /> Go Back
              </button>
            </div>
          </div>
          <div style={{ marginTop: "auto" }}>
            <Footer />
          </div>
        </div>
      </>
    );
  }

  const coverImg = artist.gallery?.photos?.find((p) => p.isCoverImage)?.url || "/images/carausel1.jpg";
  const price = Number(artist.basePrice);
  const hasPrice = Number.isFinite(price) && price > 0;
  const priceLbl = hasPrice ? `₹${price.toLocaleString()}` : "On request";
  const artistBook = { ...artist, basePrice: hasPrice ? price : 0 };

  return (
    <>
      <div className="ap">
        <Navbar />

        <section className="hero fi">
          <img src={coverImg} alt={artist.name} className="hero-img" />
          <div className="hero-ov" />

          <div className="hero-bar">
            <button className="icon-btn" onClick={() => router.back()} aria-label="Back">
              <ChevronLeft size={17} />
            </button>
          </div>

          <div className="hero-bot fu0">
            <h1 className="hero-name">Book {artist.name}</h1>
            <div className="hero-meta">
              <span className="hero-meta-item">
                <strong>{artist.type}</strong>
              </span>
              <span className="hero-meta-item">
                <MapPin size={13} />
                {artist.city}
              </span>
              {artist.rating && artist.rating.count > 0 && (
                <span className="hero-meta-item">
                  <Star size={13} fill="#F59E0B" color="#F59E0B" />
                  <strong>{artist.rating.average.toFixed(1)}</strong>
                  <span>({artist.rating.count})</span>
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="strip fu1">
          <div className="strip-in">
            <div className="strip-info">
              <div className="strip-type">{artist.type}</div>
              <div className="strip-name">{artist.name}</div>
              <div className="strip-meta">
                <span className="strip-meta-item">
                  <MapPin size={11} color="var(--red)" />
                  {artist.city}
                </span>
              </div>
            </div>
            <button className="btn-ink" onClick={() => router.push(`/artist/profile/${artistId}`)}>
              <ChevronLeft size={14} /> Back to Profile
            </button>
          </div>
        </div>

        <div className="layout">
          <main className="col-main fu2">
            <div className="card">
              <div className="card-title">
                <Calendar size={17} color="var(--red)" />
                <span>Select date & time</span>
              </div>
              <div className="card-sub">Choose a slot and submit your booking request.</div>
              <PublicBookingCalendar artistId={artist._id} artist={artistBook} />
            </div>
          </main>

          <aside className="col-side fu3">
            <div className="side-sticky">
              <div className="booking-card">
                <div className="bp-row">
                  <div className="bp-lbl">Starting from</div>
                  <div className="bp-amt">{priceLbl}</div>
                </div>
                <p className="book-note">You won't be charged yet</p>
              </div>
            </div>
          </aside>
        </div>

        <Footer />
      </div>
    </>
  );
}
