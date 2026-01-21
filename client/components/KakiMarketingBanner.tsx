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
    return <KakiMarketingCompact platform={platform} className={className} />;
  }

  if (variant === 'minimal') {
    return <KakiMarketingMinimal platform={platform} className={className} />;
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 ${className}`}>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4 flex-1">
            {/* Logo */}
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-orange-100">
              <span className="text-orange-600 text-sm font-semibold">KM</span>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marketing Partner</span>
              </div>
              
              <p className="text-sm text-gray-700 leading-relaxed mb-3">
                {branding.message}
              </p>
              
              <div className="flex items-center space-x-3">
                <a
                  href={`tel:${branding.contactPhone}`}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors duration-150"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call Now</span>
                </a>
                
                <a
                  href={`https://wa.me/${branding.contactPhone.replace(/[^\d]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors duration-150"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
          
          {/* Dismiss Button */}
          <button
            onClick={() => setDismissed(true)}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-150"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function KakiMarketingCompact({ platform, className = "" }: KakiMarketingBannerProps) {
  const [branding, setBranding] = useState<KakiMarketingBranding | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center border border-orange-100">
            <span className="text-orange-600 text-xs font-semibold">KM</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700 leading-relaxed">{branding.message}</p>
            <p className="text-xs text-gray-500 mt-1">Available 24/7</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <a
            href={`tel:${branding.contactPhone}`}
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700 transition-colors duration-150"
          >
            <Phone className="h-3 w-3" />
            <span>Call</span>
          </a>
          <a
            href={`https://wa.me/${branding.contactPhone.replace(/[^\d]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors duration-150"
          >
            <MessageCircle className="h-3 w-3" />
            <span>Chat</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Minimal version for subtle placement
export function KakiMarketingMinimal({ platform, className = "" }: KakiMarketingBannerProps) {
  const [branding, setBranding] = useState<KakiMarketingBranding | null>(null);
  const [loading, setLoading] = useState(true);

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
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center">
            <span className="text-orange-600 text-xs font-semibold">KM</span>
          </div>
          <p className="text-xs text-gray-600">{branding.message}</p>
        </div>
        <a
          href={`tel:${branding.contactPhone}`}
          className="text-xs text-orange-600 hover:text-orange-700 font-medium"
        >
          {branding.contactPhone}
        </a>
      </div>
    </div>
  );
}
