"use client";

import TermsManager from "@/components/artist/TermsManager";
import TermsDisplay from "@/components/TermsDisplay";
import { useDashboard } from "../layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  const { profile, fetchArtistProfile } = useDashboard();

  return (
    <div className="space-y-6">
      {profile && (
        <TermsManager 
          terms={profile.termsAndConditions || { content: '', lastUpdated: new Date().toISOString() }}
          cancellationPolicy={profile.cancellationPolicy || { advanceNotice: 24, refundPolicy: '', emergencyContact: '' }}
          onUpdate={() => {
            fetchArtistProfile();
          }}
        />
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Platform Terms</CardTitle>
          <CardDescription>Terms and conditions set by Ahibi</CardDescription>
        </CardHeader>
        <CardContent>
          <TermsDisplay category="artist" />
        </CardContent>
      </Card>
    </div>
  );
}
