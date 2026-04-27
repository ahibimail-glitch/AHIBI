"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Video, Plus, Trash2, Star, Upload, Loader2, X } from "lucide-react";
import Image from "next/image";
import { uploadFile, validateFile, createImagePreview } from "@/lib/cloudinary";

interface Photo {
  _id: string;
  url: string;
  caption: string;
  isProfileImage: boolean;
  isCoverImage: boolean;
}

interface Video {
  _id: string;
  url: string;
  thumbnail: string;
  caption: string;
  platform: string;
}

interface GalleryManagerProps {
  photos: Photo[];
  videos: Video[];
  onUpdate: () => void;
}

export default function GalleryManager({ photos, videos, onUpdate }: GalleryManagerProps) {
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoForm, setPhotoForm] = useState({
    url: "",
    caption: "",
    isProfileImage: false,
    isCoverImage: false
  });
  const [videoForm, setVideoForm] = useState({
    url: "",
    caption: "",
    platform: "youtube"
  });

  // Auto-generate thumbnail from video URL based on platform
  const generateThumbnail = (url: string, platform: string): string => {
    try {
      if (platform === "youtube") {
        // Extract video ID from various YouTube URL formats
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        if (match) {
          return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
        }
      } else if (platform === "vimeo") {
        // Vimeo requires API call, return placeholder for now
        const match = url.match(/vimeo\.com\/(\d+)/);
        if (match) {
          // Vimeo thumbnail API (will be fetched on backend or use default)
          return `https://vumbnail.com/${match[1]}.jpg`;
        }
      }
      // For Instagram and other platforms, return empty string to use fallback UI
    } catch {
      // fall through to default
    }
    // Return empty string to trigger fallback UI
    return "";
  };
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file, 10 * 1024 * 1024); // 10MB max
    if (error) {
      setUploadError(error);
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    const preview = await createImagePreview(file);
    setPreviewUrl(preview);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadError(null);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) {
      setUploadError("Please select a file to upload");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const result = await uploadFile(selectedFile);

      if (result.status === "success" && result.data?.photo) {
        const token = localStorage.getItem("artist_token");
        const response = await fetch("/api/artist/gallery/photo", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            url: result.data.photo.url,
            caption: photoForm.caption,
            isProfileImage: photoForm.isProfileImage,
            isCoverImage: photoForm.isCoverImage
          })
        });

        if (response.ok) {
          setPhotoForm({ url: "", caption: "", isProfileImage: false, isCoverImage: false });
          setSelectedFile(null);
          setPreviewUrl(null);
          setIsAddingPhoto(false);
          onUpdate();
        }
      } else {
        setUploadError(result.message || "Upload failed");
      }
    } catch (error) {
      console.error("Error uploading photo:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleAddVideo = async () => {
    try {
      const token = localStorage.getItem("artist_token");
      
      // Auto-generate thumbnail based on platform
      const thumbnail = generateThumbnail(videoForm.url, videoForm.platform);
      
      const response = await fetch("/api/artist/gallery/video", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...videoForm,
          thumbnail
        })
      });

      if (response.ok) {
        setVideoForm({ url: "", caption: "", platform: "youtube" });
        setIsAddingVideo(false);
        onUpdate();
      }
    } catch (error) {
      console.error("Error adding video:", error);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    try {
      const token = localStorage.getItem("artist_token");
      const response = await fetch(`/api/artist/gallery/photo/${photoId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error removing photo:", error);
    }
  };

  const handleSetProfileImage = async (photoId: string) => {
    try {
      const token = localStorage.getItem("artist_token");
      const response = await fetch(`/api/artist/gallery/photo/${photoId}/profile`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error setting profile image:", error);
    }
  };

  const handleSetCoverImage = async (photoId: string) => {
    try {
      const token = localStorage.getItem("artist_token");
      const response = await fetch(`/api/artist/gallery/photo/${photoId}/cover`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error setting cover image:", error);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    try {
      const token = localStorage.getItem("artist_token");
      const response = await fetch(`/api/artist/gallery/video/${videoId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error("Error removing video:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Photos Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Photos ({photos.length})
            </CardTitle>
            <Dialog open={isAddingPhoto} onOpenChange={setIsAddingPhoto}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Photo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Upload Photo to Gallery</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-500 transition-colors">
                    <input
                      type="file"
                      id="photo-upload"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleFileSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer block">
                      {previewUrl ? (
                        <div className="relative">
                          <Image
                            src={previewUrl}
                            alt="Preview"
                            width={300}
                            height={200}
                            className="w-full h-48 object-cover rounded-lg mx-auto"
                          />
                          {!uploading && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                clearSelectedFile();
                              }}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">Click to select an image</p>
                          <p className="text-xs text-gray-400 mt-1">JPEG, PNG, GIF, WebP up to 10MB</p>
                        </>
                      )}
                    </label>
                  </div>

                  {uploadError && (
                    <p className="text-sm text-red-500">{uploadError}</p>
                  )}

                  <div>
                    <Label htmlFor="photo-caption">Caption</Label>
                    <Textarea
                      id="photo-caption"
                      value={photoForm.caption}
                      onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })}
                      placeholder="Photo description..."
                      disabled={uploading}
                    />
                  </div>

                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={photoForm.isProfileImage}
                        onChange={(e) => setPhotoForm({ ...photoForm, isProfileImage: e.target.checked })}
                        disabled={uploading}
                      />
                      <div className="flex flex-col">
                        <span>Set as Profile Image</span>
                        <span className="text-xs text-muted-foreground">Recommended: 124x124px (square)</span>
                      </div>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={photoForm.isCoverImage}
                        onChange={(e) => setPhotoForm({ ...photoForm, isCoverImage: e.target.checked })}
                        disabled={uploading}
                      />
                      <div className="flex flex-col">
                        <span>Set as Cover Image</span>
                        <span className="text-xs text-muted-foreground">Recommended: 1920x1080px (16:9)</span>
                      </div>
                    </label>
                  </div>

                  <Button 
                    onClick={handleUploadPhoto} 
                    className="w-full"
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading to Cloudinary...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div key={photo._id} className="relative group">
                <Image
                  src={photo.url}
                  alt={photo.caption}
                  width={300}
                  height={200}
                  className="w-full h-48 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="flex flex-col gap-2">
                    <div className="flex space-x-2">
                      {!photo.isProfileImage && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetProfileImage(photo._id)}
                          title="Set as Profile Image"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      {!photo.isCoverImage && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleSetCoverImage(photo._id)}
                          title="Set as Cover Image"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemovePhoto(photo._id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
                {(photo.isProfileImage || photo.isCoverImage) && (
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {photo.isProfileImage && (
                      <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center">
                        <Star className="h-3 w-3 mr-1" />
                        Profile
                      </span>
                    )}
                    {photo.isCoverImage && (
                      <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs flex items-center">
                        <Camera className="h-3 w-3 mr-1" />
                        Cover
                      </span>
                    )}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 rounded-b-lg">
                  <p className="text-sm truncate">{photo.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Videos Section */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center">
              <Video className="h-5 w-5 mr-2" />
              Videos ({videos.length})
            </CardTitle>
            <Dialog open={isAddingVideo} onOpenChange={setIsAddingVideo}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Video
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Video Link</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="video-platform">Platform</Label>
                    <Select value={videoForm.platform} onValueChange={(value) => setVideoForm({ ...videoForm, platform: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="vimeo">Vimeo</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="twitter">Twitter / X</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="video-url">Video URL</Label>
                    <Input
                      id="video-url"
                      value={videoForm.url}
                      onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                      placeholder={`https://${videoForm.platform === "youtube" ? "youtube.com/watch?v=" : videoForm.platform === "instagram" ? "instagram.com/p/" : videoForm.platform === "tiktok" ? "tiktok.com/@user/video/" : "..."}`}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Thumbnail will be auto-generated from the {videoForm.platform} URL
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="video-caption">Caption (optional)</Label>
                    <Textarea
                      id="video-caption"
                      value={videoForm.caption}
                      onChange={(e) => setVideoForm({ ...videoForm, caption: e.target.value })}
                      placeholder="Video description..."
                    />
                  </div>
                  <Button onClick={handleAddVideo} className="w-full">
                    Add Video
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <div key={video._id} className="relative group">
                <div className="relative">
                  {video.thumbnail ? (
                    <Image
                      src={video.thumbnail}
                      alt={video.caption}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover rounded-lg"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center">
                      <Video className="h-12 w-12 text-slate-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/50 rounded-full p-3">
                      <Video className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => window.open(video.url, "_blank")}
                    >
                      <Video className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRemoveVideo(video._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="absolute top-2 right-2">
                  <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs">
                    {video.platform}
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 rounded-b-lg">
                  <p className="text-sm truncate">{video.caption}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
