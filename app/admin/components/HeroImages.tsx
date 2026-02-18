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

interface HeroImage {
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

export default function HeroImages() {
  const [images, setImages] = useState<HeroImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedMobileFile, setSelectedMobileFile] = useState<File | null>(null);
  const [imageTitle, setImageTitle] = useState("");
  const [imageDescription, setImageDescription] = useState("");

  const fetchHeroImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("admin_token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hero-images`);
      if (!response.ok) {
        throw new Error("Failed to fetch hero images");
      }

      const data = await response.json();
      setImages(data.data);
    } catch (err: any) {
      console.error("Error fetching hero images:", err);
      setError(err.message || "Failed to load hero images");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeroImages();
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
      formData.append("title", imageTitle);
      formData.append("description", imageDescription);
      
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
      setSuccess("Image uploaded successfully!");

      // Refresh image list
      fetchHeroImages();
      
      // Clear file input
      const fileInput = document.getElementById("image-upload") as HTMLInputElement;
      if (fileInput) {
        fileInput.value = "";
      }
      const mobileFileInput = document.getElementById("mobile-image-upload") as HTMLInputElement;
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
    if (!confirm("Are you sure you want to delete this hero image?")) {
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
        throw new Error("Failed to delete hero image");
      }

      // Update local state
      setImages(images.filter(img => img._id !== id));
      setSuccess("Image deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting hero image:", err);
      setError(err.message || "Failed to delete hero image");
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
        throw new Error("Failed to update hero image");
      }

      const data = await response.json();
      
      // Update the local state
      setImages(images.map(img => img._id === id ? data.data : img));
      setSuccess(`Image ${!currentActive ? "activated" : "deactivated"} successfully!`);
    } catch (err: any) {
      console.error("Error toggling image status:", err);
      setError(err.message || "Failed to update hero image");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Hero Section Images</h2>
        <Button onClick={fetchHeroImages} variant="outline" size="sm" disabled={loading}>
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
          <h3 className="text-lg font-medium mb-4">Upload New Hero Image</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="image-title">Title (Optional)</Label>
                <Input
                  id="image-title"
                  placeholder="Image title"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="image-description">Description (Optional)</Label>
                <Textarea
                  id="image-description"
                  placeholder="Image description"
                  value={imageDescription}
                  onChange={(e) => setImageDescription(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="image-upload" className="block mb-2">Select Desktop Image</Label>
                    <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                       
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Recommended: 2560x900px (wide banner). Minimum: 1920px wide. Max: 5MB.
                    </p>
                </div>
                <div>
                    <Label htmlFor="mobile-image-upload" className="block mb-2">Select Mobile Image (Optional)</Label>
                    <Input
                        id="mobile-image-upload"
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
              <p className="font-medium text-gray-700">Homepage Hero Image Tips</p>
              <p className="mt-1">
                The homepage hero uses a fixed-height banner with <span className="font-mono">object-cover</span>, so edges may crop on different screens. Keep key text/logos centered.
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
                  Upload Image
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Image Gallery */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Current Hero Images</h3>
        
        {loading && (
          <div className="flex justify-center my-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        )}

        {!loading && images.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-300" />
              <p className="text-gray-500 mt-2">No hero images found.</p>
              <p className="text-sm text-gray-400">Upload images to display in the homepage hero section.</p>
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
                        alt={image.title || "Hero image"}
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
                            alt={`${image.title || "Hero image"} (Mobile)`}
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
                      {image.title || "Untitled"}
                    </h4>
                    <p className="text-xs text-gray-500 truncate">
                      {image.description || "No description"}
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
    </div>
  );
}
