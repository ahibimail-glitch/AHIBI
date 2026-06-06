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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Loader2, AlertCircle } from "lucide-react";
import { TechRider } from "../types";
import { uploadToVercelBlob } from "@/lib/vercelBlob";

type UploadTarget = "techRider" | "epk";

const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PDF_SIZE_LABEL = "10MB";

interface TechRiderFile {
  url: string;
  fileType: "pdf" | "image";
  uploadedAt: string;
}

export default function TechRiderPage() {
  const { profile, fetchArtistProfile, setSuccessMessage, setError } = useDashboard();
  const [techRiderForm, setTechRiderForm] = useState<TechRider>({});
  const [techRiderSaving, setTechRiderSaving] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<UploadTarget | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const techRiderInputRef = useRef<HTMLInputElement>(null);
  const epkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.techRider) {
      setTechRiderForm(profile.techRider);
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
      setSuccessMessage("Tech Rider saved successfully!");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error saving tech rider");
    } finally {
      setTechRiderSaving(false);
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

      const folder =
        target === "techRider" ? "artists/tech-rider" : "artists/epk";
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

  const renderFileSection = (
    target: UploadTarget,
    title: string,
    description: string,
    file: TechRiderFile | undefined,
    inputRef: React.RefObject<HTMLInputElement | null>,
    downloadName: string
  ) => {
    const isUploading = uploadingFile === target;

    return (
      <div className="border rounded-lg p-4 space-y-3 relative">
        {isUploading && (
          <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center rounded-lg z-10">
            <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              Uploading {target === "techRider" ? "Tech Rider" : "EPK"}...
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
              disabled={isUploading || uploadingFile !== null}
            />
            <Button
              type="button"
              variant="outline"
              disabled={isUploading || uploadingFile !== null}
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
            <span className="text-xs text-muted-foreground">(PDF)</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No file uploaded yet.</p>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tech Rider / EPK</CardTitle>
        <CardDescription>
          Define your technical requirements and upload your Tech Rider and EPK
          separately. Each file must be a PDF up to {MAX_PDF_SIZE_LABEL}. Organizers
          will use these to prepare production and review your artist profile.
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

        {uploadError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {renderFileSection(
            "techRider",
            "Tech Rider File",
            "Upload a PDF with your detailed rider, stage plot, or input list.",
            techRiderForm.file as TechRiderFile | undefined,
            techRiderInputRef,
            "Tech-Rider.pdf"
          )}
          {renderFileSection(
            "epk",
            "EPK File",
            "Upload a PDF with your Electronic Press Kit.",
            techRiderForm.epkFile as TechRiderFile | undefined,
            epkInputRef,
            "EPK.pdf"
          )}
        </div>

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
              "Save Tech Rider / EPK"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
