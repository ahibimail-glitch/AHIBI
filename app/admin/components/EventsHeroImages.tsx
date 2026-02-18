"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Trash2,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface EventsHeroImage {
  _id: string;
  title: string;
  description: string;
  url: string;
  public_id: string;
  mobileUrl?: string;
  mobilePublic_id?: string;
  active: boolean;
  order: number;
  createdAt: string;
}

export default function EventsHeroImages() {
  const [images, setImages] = useState<EventsHeroImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMobileFile, setSelectedMobileFile] = useState<File | null>(null);
  const [imageTitle, setImageTitle] = useState("");
  const [imageDescription, setImageDescription] = useState("");

  const fetchEventsHeroImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images?type=events`);
      if (!response.ok) {
        throw new Error("Failed to fetch events hero images");
      }

      const data = await response.json();
      // Filter images that are specifically for events page or have events-related metadata
      const eventsImages = data.data.filter((img: any) => 
        img.title?.toLowerCase().includes('events') || 
        img.description?.toLowerCase().includes('events') ||
        img.type === 'events'
      );
      setImages(eventsImages);
    } catch (err: any) {
      console.error("Error fetching events hero images:", err);
      setError(err.message || "Failed to load events hero images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventsHeroImages();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      
      // Clear any previous messages
      setError(null);
      setSuccess(null);
    }
  };

  const handleMobileFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedMobileFile(e.target.files[0]);
      setError(null);
      setSuccess(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Create form data
      const formData = new FormData();
      if (selectedFile) {
        formData.append("image", selectedFile);
      }
      if (selectedMobileFile) {
        formData.append("mobileImage", selectedMobileFile);
      }
      
      // Add events-specific metadata to title and description
      const eventsTitle = imageTitle ? `Events: ${imageTitle}` : "Events Page Hero Image";
      const eventsDescription = imageDescription ? `Events: ${imageDescription}` : "Hero image for events page";
      
      formData.append("title", eventsTitle);
      formData.append("description", eventsDescription);
      
      // Upload image
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }

      // Reset form
      setSelectedFile(null);
      setSelectedMobileFile(null);
      setImageTitle("");
      setImageDescription("");
      
      // Show success message
      setSuccess("Events hero image uploaded successfully!");

      // Refresh image list
      fetchEventsHeroImages();
      
      // Clear file input
      const fileInput = document.getElementById("events-image-upload") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      const mobileFileInput = document.getElementById("events-mobile-image-upload") as HTMLInputElement;
      if (mobileFileInput) {
        mobileFileInput.value = "";
      }
    } catch (err: any) {
      console.error("Error uploading image:", err);
      setError(err.message || "Failed to upload image");
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this events hero image?")) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete events hero image");
      }

      // Update local state
      setImages(images.filter(img => img._id !== id));
      setSuccess("Events hero image deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting events hero image:", err);
      setError(err.message || "Failed to delete events hero image");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: !currentActive }),
      });

      if (!response.ok) {
        throw new Error("Failed to update events hero image");
      }

      const data = await response.json();
      
      // Update the local state
      setImages(images.map(img => img._id === id ? data.data : img));
      setSuccess(`Events hero image ${!currentActive ? "activated" : "deactivated"} successfully!`);
    } catch (err: any) {
      console.error("Error toggling image status:", err);
      setError(err.message || "Failed to update events hero image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Events Page Hero Images</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage hero images displayed on the events page (http://localhost:3000/events)
          </p>
        </div>
        <Button onClick={fetchEventsHeroImages} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-md p-4 flex items-center">
          <CheckCircle2 className="h-5 w-5 mr-2" />
          {success}
        </div>
      )}

      {/* Upload Form */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-medium mb-4">Upload New Events Hero Image</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="events-image-title">Title (Optional)</Label>
                <Input
                  id="events-image-title"
                  placeholder="Events image title"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be prefixed with "Events:" automatically
                </p>
              </div>
              
              <div>
                <Label htmlFor="events-image-description">Description (Optional)</Label>
                <Textarea
                  id="events-image-description"
                  placeholder="Events image description"
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Will be prefixed with "Events:" automatically
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="events-image-upload" className="block mb-2">Select Desktop Image</Label>
                    <Input
                        id="events-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                       
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Recommended: 2560x900px (wide banner). Minimum: 1920px wide. Max: 5MB.
                    </p>
                </div>
                <div>
                    <Label htmlFor="events-mobile-image-upload" className="block mb-2">Select Mobile Image (Optional)</Label>
                    <Input
                        id="events-mobile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleMobileFileChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Recommended: 1080x540px (wide banner). Minimum: 1080px wide. Max: 2MB.
                    </p>
                </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
              <p className="font-medium text-gray-700">Events Hero Image Tips</p>
              <p className="mt-1">
                The events page hero uses a fixed-height banner with <span className="font-mono">object-cover</span>, so edges may crop on different screens. Keep key text/logos centered.
              </p>
            </div>
            
            <div>
              {selectedFile && (
                <div className="flex items-center space-x-2 text-sm">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">Desktop: {selectedFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              )}
              {selectedMobileFile && (
                <div className="flex items-center space-x-2 text-sm mt-1">
                  <ImageIcon className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">Mobile: {selectedMobileFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(selectedMobileFile.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                </div>
              )}
            </div>
            
            <Button type="submit" disabled={uploadLoading} className="w-full">
              {uploadLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Events Image
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Image Gallery */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Events Hero Images</h3>
        
        {loading && (
          <div className="flex justify-center my-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && images.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500 mt-2">No events hero images found.</p>
              <p className="text-sm text-gray-400">Upload images to display in the events page hero section.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <Card key={image._id} className="overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div className="aspect-video relative">
                    <img 
                        src={image.url}
                        alt={image.title || "Events hero image"}
                        className="object-cover w-full h-full"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        Desktop
                    </div>
                </div>
                <div className="aspect-video relative bg-gray-100">
                    {image.mobileUrl ? (
                        <img 
                            src={image.mobileUrl}
                            alt={`${image.title || "Events hero image"} (Mobile)`}
                            className="object-cover w-full h-full"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <ImageIcon className="h-8 w-8" />
                        </div>
                    )}
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        Mobile
                    </div>
                </div>
              </div>
              <div className="absolute top-2 right-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${image.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                  {image.active ? "Active" : "Inactive"}
                </span>
              </div>
              
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium truncate">
                      {image.title?.replace('Events: ', '') || "Untitled"}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {image.description?.replace('Events: ', '') || "No description"}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={image.active}
                      onCheckedChange={() => toggleActive(image._id, image.active)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <div className="text-xs text-gray-500">
                    Added on {new Date(image.createdAt).toLocaleDateString()}
                  </div>
                  <Button 
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(image._id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-800">About Events Page Hero Images</h4>
              <p className="text-sm text-blue-700 mt-1">
                These images are displayed in the hero section of the events page. The images automatically rotate in a slideshow format. 
                Make sure to upload high-quality images that represent events and activities well.
              </p>
              <div className="mt-2 text-xs text-blue-600">
                <p>• Images are automatically tagged as "Events" for easy identification</p>
                <p>• Only active images will be displayed on the events page</p>
                <p>• Desktop and mobile versions are supported for better responsive design</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
