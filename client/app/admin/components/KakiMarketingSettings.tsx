"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Settings, Phone, MessageSquare, Eye } from "lucide-react";

interface KakiMarketingBranding {
  enabled: boolean;
  message: string;
  contactPhone: string;
  visibility: {
    arenaPartner: boolean;
    organizer: boolean;
    venue: boolean;
    sports: boolean;
    artist: boolean;
  };
}

export default function KakiMarketingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState<KakiMarketingBranding>({
    enabled: false,
    message: "Ahibi is powered by Kaki Marketing. For any marketing needs contact us at +91 88374 02472",
    contactPhone: "+91 88374 02472",
    visibility: {
      arenaPartner: true,
      organizer: true,
      venue: true,
      sports: true,
      artist: true
    }
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/system/config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.kakiMarketingBranding) {
          setBranding(data.data.kakiMarketingBranding);
        }
      }
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to fetch configuration');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/system/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          kakiMarketingBranding: branding
        })
      });

      if (response.ok) {
        toast.success('Configuration saved successfully');
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateBranding = (field: keyof KakiMarketingBranding, value: any) => {
    setBranding(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateVisibility = (platform: keyof KakiMarketingBranding['visibility'], value: boolean) => {
    setBranding(prev => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        [platform]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kaki Marketing Branding</h2>
          <p className="text-gray-600">Manage Kaki Marketing branding visibility across all dashboards</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={branding.enabled ? "default" : "secondary"}>
            {branding.enabled ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {/* Main Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>General Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enabled">Enable Kaki Marketing Branding</Label>
              <p className="text-sm text-gray-600">
                Show Kaki Marketing branding on partner dashboards when enabled
              </p>
            </div>
            <Switch
              id="enabled"
              checked={branding.enabled}
              onCheckedChange={(checked) => updateBranding('enabled', checked)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Branding Message</Label>
            <Textarea
              id="message"
              value={branding.message}
              onChange={(e) => updateBranding('message', e.target.value)}
              placeholder="Enter the branding message to display"
              rows={3}
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-2">
            <Label htmlFor="contactPhone" className="flex items-center space-x-2">
              <Phone className="h-4 w-4" />
              <span>Contact Phone</span>
            </Label>
            <Input
              id="contactPhone"
              value={branding.contactPhone}
              onChange={(e) => updateBranding('contactPhone', e.target.value)}
              placeholder="+91 88374 02472"
            />
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Eye className="h-5 w-5" />
            <span>Visibility Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose which dashboards should display the Kaki Marketing branding
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Arena Partner */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Arena Partner Dashboard</Label>
                <p className="text-sm text-gray-600">Sports venue management</p>
              </div>
              <Switch
                checked={branding.visibility.arenaPartner}
                onCheckedChange={(checked) => updateVisibility('arenaPartner', checked)}
              />
            </div>

            {/* Organizer */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Organizer Dashboard</Label>
                <p className="text-sm text-gray-600">Event management</p>
              </div>
              <Switch
                checked={branding.visibility.organizer}
                onCheckedChange={(checked) => updateVisibility('organizer', checked)}
              />
            </div>

            {/* Venue */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Venue Dashboard</Label>
                <p className="text-sm text-gray-600">Venue booking management</p>
              </div>
              <Switch
                checked={branding.visibility.venue}
                onCheckedChange={(checked) => updateVisibility('venue', checked)}
              />
            </div>

            {/* Sports */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Sports Page</Label>
                <p className="text-sm text-gray-600">Sports facilities page</p>
              </div>
              <Switch
                checked={branding.visibility.sports}
                onCheckedChange={(checked) => updateVisibility('sports', checked)}
              />
            </div>

            {/* Artist */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Artist Dashboard</Label>
                <p className="text-sm text-gray-600">Artist management and bookings</p>
              </div>
              <Switch
                checked={branding.visibility.artist}
                onCheckedChange={(checked) => updateVisibility('artist', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {branding.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Preview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gradient-to-r from-orange-50 to-pink-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">KM</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{branding.message}</p>
                </div>
                <a 
                  href={`tel:${branding.contactPhone}`}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  {branding.contactPhone}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={saveConfig} 
          disabled={saving}
          className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </div>
    </div>
  );
}
