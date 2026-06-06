"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Save, Clock, Phone } from "lucide-react";

interface TermsData {
  content: string;
  lastUpdated: string;
}

interface CancellationPolicy {
  advanceNotice: number;
  refundPolicy: string;
  emergencyContact: string;
}

interface TermsManagerProps {
  terms: TermsData;
  cancellationPolicy: CancellationPolicy;
  onUpdate: () => void;
}

export default function TermsManager({ terms, cancellationPolicy, onUpdate }: TermsManagerProps) {
  const [termsContent, setTermsContent] = useState(terms.content);
  const [policy, setPolicy] = useState(cancellationPolicy);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTermsContent(terms.content);
    setPolicy(cancellationPolicy);
  }, [terms, cancellationPolicy]);

  const handleSaveTerms = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('artist_token');
      
      console.log('Sending terms update request:', { content: termsContent });
      
      const response = await fetch('/api/artist/terms', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: termsContent })
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Terms updated successfully:', data);
        alert('Terms and conditions updated successfully!');
        onUpdate();
      } else {
        const errorData = await response.json();
        console.error('Failed to update terms:', errorData);
        alert(`Failed to update terms: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating terms:', error);
      alert('Network error while updating terms. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCancellationPolicy = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('artist_token');
      
      console.log('Sending cancellation policy update request:', policy);
      
      const response = await fetch('/api/artist/cancellation-policy', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(policy)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Cancellation policy updated successfully:', data);
        alert('Cancellation policy updated successfully!');
        onUpdate();
      } else {
        const errorData = await response.json();
        console.error('Failed to update cancellation policy:', errorData);
        alert(`Failed to update cancellation policy: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error updating cancellation policy:', error);
      alert('Network error while updating cancellation policy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Terms & Conditions
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Last updated: {new Date(terms.lastUpdated).toLocaleDateString()}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="terms-content">Terms & Conditions Content</Label>
            <Textarea
              id="terms-content"
              value={termsContent}
              onChange={(e) => setTermsContent(e.target.value)}
              rows={12}
              className="mt-2"
              placeholder="Enter your terms and conditions..."
            />
          </div>
          <Button onClick={handleSaveTerms} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Terms & Conditions'}
          </Button>
        </CardContent>
      </Card>

      {/* Cancellation Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Cancellation Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="advance-notice">Advance Notice Required (hours)</Label>
            <Input
              id="advance-notice"
              type="number"
              value={policy.advanceNotice}
              onChange={(e) => setPolicy({ ...policy, advanceNotice: parseInt(e.target.value) })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="refund-policy">Refund Policy</Label>
            <Textarea
              id="refund-policy"
              value={policy.refundPolicy}
              onChange={(e) => setPolicy({ ...policy, refundPolicy: e.target.value })}
              rows={4}
              className="mt-2"
              placeholder="Describe your refund policy..."
            />
          </div>
          <div>
            <Label htmlFor="emergency-contact">Emergency Contact</Label>
            <Input
              id="emergency-contact"
              value={policy.emergencyContact}
              onChange={(e) => setPolicy({ ...policy, emergencyContact: e.target.value })}
              className="mt-2"
              placeholder="Emergency contact number"
            />
          </div>
          <Button onClick={handleSaveCancellationPolicy} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Cancellation Policy'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Terms Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Terms & Conditions</h3>
            <div className="whitespace-pre-wrap text-sm mb-4">
              {termsContent || 'No terms and conditions set'}
            </div>
            
            <h3 className="font-semibold mb-2">Cancellation Policy</h3>
            <div className="text-sm space-y-1">
              <p><strong>Advance Notice:</strong> {policy.advanceNotice} hours</p>
              <p><strong>Refund Policy:</strong> {policy.refundPolicy || 'Not specified'}</p>
              {policy.emergencyContact && (
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  <strong>Emergency Contact:</strong> {policy.emergencyContact}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
