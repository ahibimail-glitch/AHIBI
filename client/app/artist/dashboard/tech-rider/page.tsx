"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";
import { TechRider } from "../types";
import { uploadToVercelBlob } from "@/lib/vercelBlob";

export default function TechRiderPage() {
  const { profile, fetchArtistProfile, setSuccessMessage, setError } = useDashboard();
  const [techRiderForm, setTechRiderForm] = useState<TechRider>({});
  const [techRiderSaving, setTechRiderSaving] = useState(false);
  const [uploadingTechRiderFile, setUploadingTechRiderFile] = useState(false);

  useEffect(() => {
    if (profile?.techRider) {
      setTechRiderForm(profile.techRider);
    }
  }, [profile]);

  const handleTechRiderSave = async () => {
    try {
      setTechRiderSaving(true);
      const token = localStorage.getItem('artist_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/artist/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ techRider: techRiderForm })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save tech rider');
      }

      await fetchArtistProfile();
      setSuccessMessage('Tech Rider saved successfully!');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: any) {
      setError(e?.message || 'Error saving tech rider');
    } finally {
      setTechRiderSaving(false);
    }
  };

  const handleTechRiderFileUpload = async (file: File) => {
    try {
      setUploadingTechRiderFile(true);

      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      
      // Upload to Vercel Blob
      const uploadData = await uploadToVercelBlob(
        file, 
        'artists/tech-rider', 
        isPdf ? 'document' : 'image'
      );

      if (!uploadData.url) {
        throw new Error('Upload succeeded but URL not returned');
      }

      setTechRiderForm(prev => ({
        ...prev,
        file: {
          url: uploadData.url,
          fileType: isPdf ? 'pdf' : 'image',
          uploadedAt: new Date().toISOString(),
        }
      }));

      setSuccessMessage('Tech Rider / EPK file uploaded. Please click Save to apply.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: any) {
      setError(e?.message || 'Error uploading file');
    } finally {
      setUploadingTechRiderFile(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tech Rider / EPK</CardTitle>
        <CardDescription>
          Define your technical requirements and upload your Electronic Press Kit. Organizers will use this to prepare production and review your artist profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="soundRequirements">Sound Requirements</Label>
            <Textarea
              id="soundRequirements"
              value={techRiderForm.soundRequirements || ''}
              onChange={(e) => setTechRiderForm(prev => ({ ...prev, soundRequirements: e.target.value }))}
              placeholder="e.g., 2 wireless mics, DI box, monitor wedges, mixer channels..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="lightingRequirements">Lighting Requirements</Label>
            <Textarea
              id="lightingRequirements"
              value={techRiderForm.lightingRequirements || ''}
              onChange={(e) => setTechRiderForm(prev => ({ ...prev, lightingRequirements: e.target.value }))}
              placeholder="e.g., front wash, moving heads, haze, follow spot..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="stageRequirements">Stage Requirements</Label>
            <Textarea
              id="stageRequirements"
              value={techRiderForm.stageRequirements || ''}
              onChange={(e) => setTechRiderForm(prev => ({ ...prev, stageRequirements: e.target.value }))}
              placeholder="e.g., minimum stage size, risers, drum riser, backdrop..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="instrumentsEquipmentNeeded">Instruments / Equipment Needed</Label>
            <Textarea
              id="instrumentsEquipmentNeeded"
              value={techRiderForm.instrumentsEquipmentNeeded || ''}
              onChange={(e) => setTechRiderForm(prev => ({ ...prev, instrumentsEquipmentNeeded: e.target.value }))}
              placeholder="e.g., keyboard stand, guitar amp, drum kit, DJ controller..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="powerRequirements">Power Requirements</Label>
            <Textarea
              id="powerRequirements"
              value={techRiderForm.powerRequirements || ''}
              onChange={(e) => setTechRiderForm(prev => ({ ...prev, powerRequirements: e.target.value }))}
              placeholder="e.g., 2 x 15A outlets on stage, isolated power for audio..."
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="specialNotes">Special Notes / Instructions</Label>
            <Textarea
              id="specialNotes"
              value={techRiderForm.specialNotes || ''}
              onChange={(e) => setTechRiderForm(prev => ({ ...prev, specialNotes: e.target.value }))}
              placeholder="Any special setup or instructions for the production team"
            />
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Tech Rider / EPK File</h4>
              <p className="text-sm text-muted-foreground">Upload a PDF  (detailed rider, stage plot, input list, or EPK).</p>
            </div>
            <label>
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleTechRiderFileUpload(file);
                }}
                disabled={uploadingTechRiderFile}
              />
              <Button type="button" variant="outline" disabled={uploadingTechRiderFile} asChild>
                <span>
                  <FileText className="h-4 w-4 mr-2" />
                  {uploadingTechRiderFile ? 'Uploading...' : 'Upload File'}
                </span>
              </Button>
            </label>
          </div>

          {techRiderForm?.file?.url && (
            <div className="text-sm flex items-center gap-3">
              <span className="text-muted-foreground">Current file:</span>
              <a
                href={techRiderForm.file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-800"
              >
                View
              </a>
              <span className="text-gray-300">|</span>
              <a
                href={techRiderForm.file.url}
                download="Tech-Rider-EPK.pdf"
                className="underline text-green-600 hover:text-green-800 flex items-center gap-1"
              >
                <FileText className="h-3 w-3" />
                Download PDF
              </a>
              <span className="text-xs text-muted-foreground">
                ({techRiderForm.file.fileType === 'pdf' ? 'PDF' : 'Image'})
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={handleTechRiderSave} disabled={techRiderSaving}>
            {techRiderSaving ? 'Saving...' : 'Save Tech Rider / EPK'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
