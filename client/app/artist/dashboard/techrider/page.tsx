"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "../dashboard-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Upload, Download, AlertCircle } from "lucide-react";

interface TechRider {
  soundRequirements?: string;
  lightingRequirements?: string;
  powerRequirements?: string;
  specialNotes?: string;
  file?: {
    url: string;
    fileType: "pdf" | "image";
    uploadedAt: string;
  };
}

export default function TechRiderPage() {
  const { profile, fetchArtistProfile, setSuccessMessage, setError, successMessage } = useDashboard();
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formState, setFormState] = useState<TechRider>({
    soundRequirements: "",
    lightingRequirements: "",
    powerRequirements: "",
    specialNotes: "",
  });

  useEffect(() => {
    if (profile?.techRider) {
      setFormState({
        soundRequirements: profile.techRider.soundRequirements || "",
        lightingRequirements: profile.techRider.lightingRequirements || "",
        powerRequirements: profile.techRider.powerRequirements || "",
        specialNotes: profile.techRider.specialNotes || "",
      });
    }
  }, [profile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("folder", "tech-riders");
      formData.append("documentType", selectedFile.type.includes("pdf") ? "pdf" : "image");

      const token = localStorage.getItem("artist_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadResponse.json();
      const fileUrl = uploadData.url;

      const response = await fetch("/api/artist/techrider", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          file: {
            url: fileUrl,
            fileType: selectedFile.type.includes("pdf") ? "pdf" : "image",
            uploadedAt: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        await fetchArtistProfile();
        setSelectedFile(null);
        setSuccessMessage("Tech rider file uploaded successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Error uploading file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const token = localStorage.getItem("artist_token");
      if (!token) {
        setError("Not authenticated");
        return;
      }

      const updateData: TechRider = {
        soundRequirements: formData.get("soundRequirements") as string,
        lightingRequirements: formData.get("lightingRequirements") as string,
        powerRequirements: formData.get("powerRequirements") as string,
        specialNotes: formData.get("specialNotes") as string,
      };

      const response = await fetch("/api/artist/techrider", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        await fetchArtistProfile();
        setIsEditing(false);
        setError(null);
        setSuccessMessage("Tech rider updated successfully!");
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Failed to update tech rider");
      }
    } catch (error) {
      console.error("Error updating tech rider:", error);
      setError("Error updating tech rider. Please try again.");
    }
  };

  const techRider = profile?.techRider;

  return (
    <div className="space-y-6">
      {successMessage && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      {!isEditing ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Technical Rider</CardTitle>
                <CardDescription>
                  Your technical requirements for performances
                </CardDescription>
              </div>
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {techRider?.file ? (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-8 w-8 text-blue-500" />
                    <div>
                      <p className="font-medium">Tech Rider Document</p>
                      <p className="text-sm text-muted-foreground">
                        Uploaded: {new Date(techRider.file.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(techRider.file?.url, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No tech rider document uploaded. Add one to help organizers understand your technical requirements.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Sound Requirements</h4>
                <p className="text-muted-foreground">
                  {techRider?.soundRequirements || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Lighting Requirements</h4>
                <p className="text-muted-foreground">
                  {techRider?.lightingRequirements || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Power Requirements</h4>
                <p className="text-muted-foreground">
                  {techRider?.powerRequirements || "Not specified"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Special Notes</h4>
                <p className="text-muted-foreground">
                  {techRider?.specialNotes || "Not specified"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Edit Technical Rider</CardTitle>
            <CardDescription>
              Update your technical requirements for performances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="soundRequirements">Sound Requirements</Label>
                  <Textarea
                    id="soundRequirements"
                    name="soundRequirements"
                    defaultValue={formState.soundRequirements}
                    placeholder="Describe your sound equipment requirements (e.g., microphones, speakers, mixing console, monitors)"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lightingRequirements">Lighting Requirements</Label>
                  <Textarea
                    id="lightingRequirements"
                    name="lightingRequirements"
                    defaultValue={formState.lightingRequirements}
                    placeholder="Describe your lighting requirements (e.g., stage wash, spotlights, special effects)"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="powerRequirements">Power Requirements</Label>
                  <Textarea
                    id="powerRequirements"
                    name="powerRequirements"
                    defaultValue={formState.powerRequirements}
                    placeholder="Describe your power requirements (e.g., number of outlets, voltage, amperage)"
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialNotes">Special Notes</Label>
                  <Textarea
                    id="specialNotes"
                    name="specialNotes"
                    defaultValue={formState.specialNotes}
                    placeholder="Any additional technical requirements or notes"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Tech Rider Document</CardTitle>
          <CardDescription>
            Upload a PDF or image file with detailed technical requirements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input
              type="file"
              id="techrider-upload"
              accept=".pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            <label htmlFor="techrider-upload" className="cursor-pointer">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {selectedFile ? selectedFile.name : "Click to select a file"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF or image files up to 10MB
              </p>
            </label>
          </div>
          {selectedFile && (
            <Button
              onClick={handleFileUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
