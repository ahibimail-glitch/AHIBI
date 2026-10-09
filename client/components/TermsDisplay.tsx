'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, ExternalLink, Loader2, AlertCircle } from 'lucide-react';

interface TermsData {
  heading: string;
  content: string;
  lastUpdated: string;
}

interface TermsDisplayProps {
  category: 'organizer' | 'venue' | 'artist' | 'sports';
  className?: string;
}

const categoryConfig = {
  organizer: {
    title: 'Organizer Terms & Conditions',
    icon: '🎪'
  },
  venue: {
    title: 'Venue Terms & Conditions',
    icon: '🏛️'
  },
  artist: {
    title: 'Artist Terms & Conditions',
    icon: '🎨'
  },
  sports: {
    title: 'Sports Terms & Conditions',
    icon: '⚽'
  }
};

const TermsDisplay: React.FC<TermsDisplayProps> = ({ category, className = '' }) => {
  const [termsData, setTermsData] = useState<TermsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTerms();
  }, [category]);

  const fetchTerms = async () => {
    try {
      const response = await fetch(`/api/public/terms/${category}`);

      if (!response.ok) {
        throw new Error('Failed to fetch terms and conditions');
      }

      const result = await response.json();
      if (result.success) {
        setTermsData(result.data);
      } else {
        setError(result.message || 'Failed to load terms');
      }
    } catch (err) {
      console.error(`Error fetching ${category} terms:`, err);
      setError('Unable to load terms and conditions');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className={`bg-white/70 backdrop-blur-sm border-0 shadow-lg ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {categoryConfig[category].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !termsData) {
    return (
      <Card className={`bg-white/70 backdrop-blur-sm border-0 shadow-lg ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            {categoryConfig[category].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">
              {error || 'Terms and conditions not available'}
            </p>
            <Button variant="outline" size="sm" onClick={fetchTerms}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-white/70 backdrop-blur-sm border-0 shadow-lg ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <span className="mr-2">{categoryConfig[category].icon}</span>
            {termsData.heading}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            Updated: {formatDate(termsData.lastUpdated)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Terms Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="prose prose-sm max-w-none">
              <div
                className="text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: termsData.content
                    .replace(/\n/g, '<br />')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TermsDisplay;
