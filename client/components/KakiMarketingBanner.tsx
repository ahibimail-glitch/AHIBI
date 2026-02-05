"use client";

import { useState, useEffect } from "react";
import { Phone, X, ExternalLink, MessageCircle } from "lucide-react";

interface KakiMarketingBranding {
  enabled: boolean;
  message: string;
  contactPhone: string;
}

interface KakiMarketingBannerProps {
  platform: 'arenaPartner' | 'organizer' | 'venue' | 'artist';
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
}

export default function KakiMarketingBanner({ 
  platform, 
  className = "", 
  variant = 'default' 
}: KakiMarketingBannerProps) {
  const [branding, setBranding] = useState<KakiMarketingBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/system/branding`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Check if branding is enabled for this platform
          if (data.data.enabled && data.data.visibility[platform]) {
            setBranding({
              enabled: data.data.enabled,
              message: data.data.message,
              contactPhone: data.data.contactPhone
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dismissed || !branding || !branding.enabled) {
    return null;
  }

  if (variant === 'compact') {
    return <KakiMarketingCompact platform={platform} className={className} branding={branding} onDismiss={() => setDismissed(true)} />;
  }

  if (variant === 'minimal') {
    return <KakiMarketingMinimal platform={platform} className={className} branding={branding} />;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="p-4 sm:p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          {/* Main Content */}
          <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
            {/* Logo */}
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0 border border-orange-200 shadow-sm">
              <span className="text-orange-600 text-sm sm:text-base font-bold">KM</span>
            </div>
            
            {/* Text Content */}
            <div className="flex-1 min-w-0">
              {/* Badge */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Marketing Partner
                </span>
              </div>
              
              {/* Message */}
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                {branding.message}
              </p>
              
              {/* Action Buttons - Stacked on mobile, inline on desktop */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <a
                  href={`tel:${branding.contactPhone}`}
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-orange-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors duration-150 shadow-sm hover:shadow-md touch-manipulation"
                >
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Call Now</span>
                </a>
                
                <a
                  href={`https://wa.me/${branding.contactPhone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 bg-green-600 text-white text-sm sm:text-base font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors duration-150 shadow-sm hover:shadow-md touch-manipulation"
                >
                  <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>WhatsApp</span>
                </a>
              </div>
              
              {/* Phone number display on mobile */}
              <p className="text-xs text-gray-500 mt-3 sm:hidden">
                📞 {branding.contactPhone}
              </p>
            </div>
          </div>
          
          {/* Dismiss Button - Top right on mobile, aligned on desktop */}
          <button
            onClick={() => setDismissed(true)}
            className="absolute top-3 right-3 sm:static sm:ml-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-all duration-150 touch-manipulation"
            aria-label="Dismiss marketing banner"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function KakiMarketingCompact({ 
  platform, 
  className = "",
  branding: propBranding,
  onDismiss
}: KakiMarketingBannerProps & { 
  branding?: KakiMarketingBranding | null;
  onDismiss?: () => void;
}) {
  const [branding, setBranding] = useState<KakiMarketingBranding | null>(propBranding || null);
  const [loading, setLoading] = useState(!propBranding);

  useEffect(() => {
    if (!propBranding) {
      fetchBranding();
    }
  }, [propBranding]);

  const fetchBranding = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/system/branding`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (data.data.enabled && data.data.visibility[platform]) {
            setBranding({
              enabled: data.data.enabled,
              message: data.data.message,
              contactPhone: data.data.contactPhone
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !branding || !branding.enabled) {
    return null;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-3 sm:p-4">
        {/* Mobile: Stack vertically, Desktop: Horizontal */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Logo and Message */}
          <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg flex items-center justify-center border border-orange-200 flex-shrink-0">
              <span className="text-orange-600 text-sm font-bold">KM</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-800 leading-relaxed line-clamp-2">
                {branding.message}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <p className="text-xs text-gray-500">Available 24/7</p>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <a
              href={`tel:${branding.contactPhone}`}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-orange-600 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-orange-700 active:bg-orange-800 transition-colors duration-150 shadow-sm touch-manipulation"
            >
              <Phone className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Call</span>
            </a>
            
            <a
              href={`https://wa.me/${branding.contactPhone.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-green-700 active:bg-green-800 transition-colors duration-150 shadow-sm touch-manipulation"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Chat</span>
            </a>
            
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-md transition-all duration-150 touch-manipulation"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal version for subtle placement
export function KakiMarketingMinimal({ 
  platform, 
  className = "",
  branding: propBranding
}: KakiMarketingBannerProps & { 
  branding?: KakiMarketingBranding | null;
}) {
  const [branding, setBranding] = useState<KakiMarketingBranding | null>(propBranding || null);
  const [loading, setLoading] = useState(!propBranding);

  useEffect(() => {
    if (!propBranding) {
      fetchBranding();
    }
  }, [propBranding]);

  const fetchBranding = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/system/branding`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (data.data.enabled && data.data.visibility[platform]) {
            setBranding({
              enabled: data.data.enabled,
              message: data.data.message,
              contactPhone: data.data.contactPhone
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !branding || !branding.enabled) {
    return null;
  }

  return (
    <div className={`bg-gradient-to-r from-gray-50 to-orange-50/30 border border-gray-200 rounded-lg ${className}`}>
      <div className="p-2.5 sm:p-3">
        {/* Mobile: Stack vertically, Desktop: Horizontal */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
          {/* Logo and Message */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-orange-100 to-orange-200 rounded-md flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-orange-600 text-xs font-bold">KM</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-700 font-medium line-clamp-2 flex-1">
              {branding.message}
            </p>
          </div>
          
          {/* Phone Number - Click to call */}
          <a
            href={`tel:${branding.contactPhone}`}
            className="inline-flex items-center justify-center sm:justify-start gap-1.5 px-3 py-1.5 sm:px-0 sm:py-0 bg-white sm:bg-transparent border border-orange-200 sm:border-0 rounded-md sm:rounded-none text-xs sm:text-sm text-orange-600 hover:text-orange-700 font-semibold transition-colors touch-manipulation"
          >
            <Phone className="h-3 w-3 sm:hidden" />
            <span>{branding.contactPhone}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Floating Action Button version for mobile
export function KakiMarketingFAB({ 
  platform, 
  className = "" 
}: Omit<KakiMarketingBannerProps, 'variant'>) {
  const [branding, setBranding] = useState<KakiMarketingBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/system/branding`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          if (data.data.enabled && data.data.visibility[platform]) {
            setBranding({
              enabled: data.data.enabled,
              message: data.data.message,
              contactPhone: data.data.contactPhone
            });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching branding:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !branding || !branding.enabled) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      {expanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setExpanded(false)}
        />
      )}
      
      {/* FAB */}
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        {expanded ? (
          // Expanded Card
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 w-[calc(100vw-2rem)] max-w-sm animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg flex items-center justify-center border border-orange-200">
                  <span className="text-orange-600 text-sm font-bold">KM</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Kaki Marketing</p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <p className="text-xs text-gray-500">Available Now</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setExpanded(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-700 mb-4 leading-relaxed">
              {branding.message}
            </p>
            
            <div className="flex gap-2">
              <a
                href={`tel:${branding.contactPhone}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white text-sm font-semibold rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors shadow-sm touch-manipulation"
              >
                <Phone className="h-4 w-4" />
                <span>Call Now</span>
              </a>
              
              <a
                href={`https://wa.me/${branding.contactPhone.replace(/[^\d]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors shadow-sm touch-manipulation"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        ) : (
          // Collapsed FAB
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-500 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 touch-manipulation"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">KM</span>
            </div>
            <span className="font-semibold text-sm pr-1">Need Help?</span>
          </button>
        )}
      </div>
    </>
  );
}