"use client";

import { useState, useEffect, useRef } from "react";
import { useDashboard } from "../dashboard-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Loader2, AlertCircle, Music2, Headphones, Radio, Trash2 } from "lucide-react";
import AccoladesManager from "@/components/artist/AccoladesManager";
import { TechRider } from "../types";
import { uploadToVercelBlob } from "@/lib/vercelBlob";

type UploadTarget = "techRider" | "epk";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_SIZE_LABEL = "10MB";

const STREAMING_PLATFORMS = [
  {
    key: "spotify",
    label: "Spotify",
    placeholder: "https://open.spotify.com/artist/...",
    icon: Music2,
  },
  {
    key: "appleMusic",
    label: "Apple Music",
    placeholder: "https://music.apple.com/...",
    icon: Headphones,
  },
  {
    key: "youtubeMusic",
    label: "YouTube Music",
    placeholder: "https://music.youtube.com/...",
    icon: Music2,
  },
  {
    key: "soundCloud",
    label: "SoundCloud",
    placeholder: "https://soundcloud.com/...",
    icon: Radio,
  },
] as const;

interface TechRiderFile {
  url: string;
  fileType: "pdf" | "image";
  uploadedAt: string;
}

export default function TechRiderPage() {
  const { profile, fetchArtistProfile, setSuccessMessage, setError, successMessage } = useDashboard();
  const [techRiderForm, setTechRiderForm] = useState<TechRider>({});
  const [streamingLinks, setStreamingLinks] = useState<Record<string, string>>({});
  const [techRiderSaving, setTechRiderSaving] = useState(false);
  const [streamingSaving, setStreamingSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<UploadTarget | null>(null);
  const [deletingFile, setDeletingFile] = useState<UploadTarget | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const techRiderInputRef = useRef<HTMLInputElement>(null);
  const epkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.techRider) {
      setTechRiderForm(profile.techRider);
    }
    if (profile?.socialLinks) {
      const links: Record<string, string> = {};
      STREAMING_PLATFORMS.forEach(({ key }) => {
        links[key] = profile.socialLinks?.[key] || "";
      });
      setStreamingLinks(links);
    }
  }, [profile]);

  const handleTechRiderSave = async () => {
    try {
      setTechRiderSaving(true);
      const token = localStorage.getItem("artist_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const response = await fetch("/api/artist/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ techRider: techRiderForm }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch((): { message?: string } => ({}));
        throw new Error(errorData.message || "Failed to save tech rider");
      }

      await fetchArtistProfile();
      setSuccessMessage("Tech rider saved successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error saving tech rider");
    } finally {
      setTechRiderSaving(false);
    }
  };

  const handleStreamingLinksSave = async () => {
    try {
      setStreamingSaving(true);
      const token = localStorage.getItem("artist_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const socialLinks: Record<string, string> = {};
      STREAMING_PLATFORMS.forEach(({ key }) => {
        const value = streamingLinks[key]?.trim();
        if (value) socialLinks[key] = value;
      });

      const response = await fetch("/api/artist/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ socialLinks }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch((): { message?: string } => ({}));
        throw new Error(errorData.message || "Failed to save streaming links");
      }

      await fetchArtistProfile();
      setSuccessMessage("Streaming links saved successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error saving streaming links");
    } finally {
      setStreamingSaving(false);
    }
  };

  const handleFileUpload = async (file: File, target: UploadTarget) => {
    const inputRef = target === "techRider" ? techRiderInputRef : epkInputRef;

    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setUploadError("Please upload a PDF file");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (file.size > MAX_PDF_SIZE_BYTES) {
      setUploadError(`File must be smaller than ${MAX_PDF_SIZE_LABEL}`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      setUploadingFile(target);
      setUploadError(null);

      const folder = target === "techRider" ? "artists/tech-rider" : "artists/epk";
      const uploadData = await uploadToVercelBlob(file, folder, "document");

      if (!uploadData.url) {
        throw new Error("Upload succeeded but URL not returned");
      }

      const fileData: TechRiderFile = {
        url: uploadData.url,
        fileType: "pdf",
        uploadedAt: new Date().toISOString(),
      };

      const token = localStorage.getItem("artist_token");
      if (!token) {
        setUploadError("Not authenticated");
        return;
      }

      const updatedTechRider: TechRider = {
        ...techRiderForm,
        ...(target === "techRider" ? { file: fileData } : { epkFile: fileData }),
      };

      const response = await fetch("/api/artist/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ techRider: updatedTechRider }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch((): { message?: string } => ({}));
        throw new Error(errorData.message || "Failed to save uploaded file");
      }

      setTechRiderForm(updatedTechRider);
      await fetchArtistProfile();
      setSuccessMessage(
        target === "techRider"
          ? "Tech Rider file uploaded successfully!"
          : "EPK file uploaded successfully!"
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: unknown) {
      setUploadError(
        e instanceof Error ? e.message : "Error uploading file. Please try again."
      );
    } finally {
      setUploadingFile(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFileDelete = async (target: UploadTarget) => {
    const fileLabel = target === "techRider" ? "Tech Rider" : "EPK";
    if (!window.confirm(`Remove the uploaded ${fileLabel} file?`)) return;

    try {
      setDeletingFile(target);
      setUploadError(null);

      const token = localStorage.getItem("artist_token");
      if (!token) {
        setUploadError("Not authenticated");
        return;
      }

      const response = await fetch("/api/artist/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          techRider: target === "techRider" ? { file: null } : { epkFile: null },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch((): { message?: string } => ({}));
        throw new Error(errorData.message || "Failed to delete file");
      }

      setTechRiderForm((prev) => {
        const next = { ...prev };
        if (target === "techRider") {
          delete next.file;
        } else {
          delete next.epkFile;
        }
        return next;
      });
      await fetchArtistProfile();
      setSuccessMessage(`${fileLabel} file removed successfully!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Error deleting file. Please try again.");
    } finally {
      setDeletingFile(null);
    }
  };

  const renderFileSection = (
    target: UploadTarget,
    title: string,
    description: string,
    file: TechRiderFile | undefined,
    inputRef: React.RefObject<HTMLInputElement | null>,
    downloadName: string
  ) => {
    const isUploading = uploadingFile === target;
    const isDeleting = deletingFile === target;

    return (
      <div className="border rounded-lg p-4 space-y-3 relative">
        {(isUploading || isDeleting) && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center rounded-lg z-10">
            <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {isDeleting
                ? `Removing ${target === "techRider" ? "Tech Rider" : "EPK"}...`
                : `Uploading ${target === "techRider" ? "Tech Rider" : "EPK"}...`}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h4 className="font-semibold">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF only · Max size {MAX_PDF_SIZE_LABEL}
            </p>
          </div>
          <label className="w-full sm:w-auto">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) handleFileUpload(selected, target);
              }}
              disabled={isUploading || isDeleting || uploadingFile !== null || deletingFile !== null}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading || isDeleting || uploadingFile !== null || deletingFile !== null}
              className="w-full sm:w-auto"
              asChild
            >
              <span>
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Upload PDF"}
              </span>
            </Button>
          </label>
        </div>

        {file?.url ? (
          <div className="text-sm flex flex-wrap items-center gap-3">
            <span className="text-muted-foreground">Current file:</span>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-600 hover:text-blue-800"
            >
              View
            </a>
            <span className="text-gray-300">|</span>
            <a
              href={file.url}
              download={downloadName}
              className="underline text-green-600 hover:text-green-800 flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Download PDF
            </a>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleFileDelete(target)}
              disabled={isDeleting || isUploading || deletingFile !== null || uploadingFile !== null}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              {isDeleting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1" />
              )}
              Delete
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No file uploaded yet.</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* EPK — primary highlight */}
      <Card className="border-pink-200 shadow-sm">
        <CardHeader>
          <CardTitle>Electronic Press Kit (EPK)</CardTitle>
          <CardDescription>
            Your EPK is the main highlight of your artist profile. Add streaming links,
            upload your press kit, and showcase awards to increase visibility with organizers
            and fans.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Listen on streaming platforms</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add links so visitors can hear your music on Spotify, Apple Music, YouTube Music, and SoundCloud.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STREAMING_PLATFORMS.map(({ key, label, placeholder, icon: Icon }) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {label}
                  </Label>
                  <Input
                    id={key}
                    type="url"
                    value={streamingLinks[key] || ""}
                    onChange={(e) =>
                      setStreamingLinks((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-stretch sm:justify-end">
              <Button
                type="button"
                onClick={handleStreamingLinksSave}
                disabled={streamingSaving}
                className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-90"
              >
                {streamingSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Streaming Links"
                )}
              </Button>
            </div>
          </div>

          {renderFileSection(
            "epk",
            "EPK Document",
            "Upload a PDF press kit with bio, photos, and career highlights.",
            techRiderForm.epkFile as TechRiderFile | undefined,
            epkInputRef,
            "EPK.pdf"
          )}

          <div className="pt-2 border-t">
            <AccoladesManager
              accolades={profile?.accolades || []}
              onUpdate={() => fetchArtistProfile()}
              embedded
            />
          </div>
        </CardContent>
      </Card>

      {/* Tech Rider — secondary */}
      <Card>
        <CardHeader>
          <CardTitle>Tech Rider</CardTitle>
          <CardDescription>
            Define your technical requirements for live performances. Organizers use this
            to prepare sound, lighting, and stage setup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="soundRequirements">Sound Requirements</Label>
              <Textarea
                id="soundRequirements"
                value={techRiderForm.soundRequirements || ""}
                onChange={(e) =>
                  setTechRiderForm((prev) => ({
                    ...prev,
                    soundRequirements: e.target.value,
                  }))
                }
                placeholder="e.g., 2 wireless mics, DI box, monitor wedges, mixer channels..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="lightingRequirements">Lighting Requirements</Label>
              <Textarea
                id="lightingRequirements"
                value={techRiderForm.lightingRequirements || ""}
                onChange={(e) =>
                  setTechRiderForm((prev) => ({
                    ...prev,
                    lightingRequirements: e.target.value,
                  }))
                }
                placeholder="e.g., front wash, moving heads, haze, follow spot..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="stageRequirements">Stage Requirements</Label>
              <Textarea
                id="stageRequirements"
                value={techRiderForm.stageRequirements || ""}
                onChange={(e) =>
                  setTechRiderForm((prev) => ({
                    ...prev,
                    stageRequirements: e.target.value,
                  }))
                }
                placeholder="e.g., minimum stage size, risers, drum riser, backdrop..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="instrumentsEquipmentNeeded">
                Instruments / Equipment Needed
              </Label>
              <Textarea
                id="instrumentsEquipmentNeeded"
                value={techRiderForm.instrumentsEquipmentNeeded || ""}
                onChange={(e) =>
                  setTechRiderForm((prev) => ({
                    ...prev,
                    instrumentsEquipmentNeeded: e.target.value,
                  }))
                }
                placeholder="e.g., keyboard stand, guitar amp, drum kit, DJ controller..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="powerRequirements">Power Requirements</Label>
              <Textarea
                id="powerRequirements"
                value={techRiderForm.powerRequirements || ""}
                onChange={(e) =>
                  setTechRiderForm((prev) => ({
                    ...prev,
                    powerRequirements: e.target.value,
                  }))
                }
                placeholder="e.g., 2 x 15A outlets on stage, isolated power for audio..."
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="specialNotes">Special Notes / Instructions</Label>
              <Textarea
                id="specialNotes"
                value={techRiderForm.specialNotes || ""}
                onChange={(e) =>
                  setTechRiderForm((prev) => ({
                    ...prev,
                    specialNotes: e.target.value,
                  }))
                }
                placeholder="Any special setup or instructions for the production team"
              />
            </div>
          </div>

          {renderFileSection(
            "techRider",
            "Tech Rider File",
            "Upload a PDF with your detailed rider, stage plot, or input list.",
            techRiderForm.file as TechRiderFile | undefined,
            techRiderInputRef,
            "Tech-Rider.pdf"
          )}

          <div className="flex justify-stretch sm:justify-end">
            <Button
              type="button"
              onClick={handleTechRiderSave}
              disabled={techRiderSaving || uploadingFile !== null}
              className="w-full sm:w-auto"
            >
              {techRiderSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Tech Rider"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
