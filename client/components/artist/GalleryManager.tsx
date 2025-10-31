"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Video, Plus, Trash2, Edit, Star, Upload, Loader2 } from "lucide-react";
import Image from "next/image";
import { uploadPhoto, validateFile } from "@/lib/cloudinary";

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoForm, setPhotoForm] = useState({
    caption: '',
    isProfileImage: false,
    isCoverImage: false,
    file: null as File | null
  });
  const [videoForm, setVideoForm] = useState({
    url: '',
    thumbnail: '',
    caption: '',
    platform: 'youtube'
  });

  const handleAddPhoto = async () => {
    try {
      if (!photoForm.file) {
        alert('Please select an image file to upload');
        return;
      }

      setUploadingPhoto(true);
      const validationError = validateFile(photoForm.file);
      if (validationError) {
        alert(validationError);
        setUploadingPhoto(false);
        return;
      }

      console.log('Starting image upload...');
      
      // Upload the image using the proper Cloudinary function
      const uploadedPhoto = await uploadPhoto(photoForm.file, 'gallery');
      console.log('Image uploaded. Photo data:', uploadedPhoto);

      if (!uploadedPhoto || !uploadedPhoto.url) {
        throw new Error('No URL returned from image upload');
      }

      const token = localStorage.getItem('artist_token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      console.log('Saving photo to gallery with URL:', uploadedPhoto.url);
      
      // Save the photo to the gallery
      const response = await fetch('/api/artist/gallery/photo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: uploadedPhoto.url,
          caption: photoForm.caption || '',
          isProfileImage: photoForm.isProfileImage || false,
          isCoverImage: photoForm.isCoverImage || false
        })
      });

      const responseData = await response.json();
      console.log('API Response:', responseData);

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to save photo to gallery');
      }

      // Reset form and update gallery
      setPhotoForm({
        caption: '',
        isProfileImage: false,
        isCoverImage: false,
        file: null
      });
      setIsAddingPhoto(false);
      onUpdate();
      
    } catch (error: any) {
      console.error('Error adding photo:', error);
      alert(`Error: ${error?.message || 'Failed to add photo. Please try again.'}`);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleAddVideo = async () => {
    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch('/api/artist/gallery/video', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(videoForm)
      });

      if (response.ok) {
        setVideoForm({ url: '', thumbnail: '', caption: '', platform: 'youtube' });
        setIsAddingVideo(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding video:', error);
    }
  };

  const handleRemovePhoto = async (photoId: string) => {
    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch(`/api/artist/gallery/photo/${photoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing photo:', error);
    }
  };

  const handleRemoveVideo = async (videoId: string) => {
    try {
      const token = localStorage.getItem('artist_token');
      const response = await fetch(`/api/artist/gallery/video/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing video:', error);
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
                  <DialogTitle>Upload New Photo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* File Input */}
                  <div>
                    <Label htmlFor="photo-file">Select Image File</Label>
                    <div className="mt-1">
                      <Input
                        id="photo-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setPhotoForm({ ...photoForm, file });
                          }
                        }}
                        className="cursor-pointer"
                      />
                      {photoForm.file && (
                        <p className="text-sm text-green-600 mt-1">
                          Selected: {photoForm.file.name} ({(photoForm.file.size / 1024 / 1024).toFixed(2)}MB)
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Supported formats: JPEG, PNG, WebP. Max size: 5MB
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="photo-caption">Caption (Optional)</Label>
                    <Textarea
                      id="photo-caption"
                      value={photoForm.caption}
                      onChange={(e) => setPhotoForm({ ...photoForm, caption: e.target.value })}
                      placeholder="Add a caption for your photo..."
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={photoForm.isProfileImage}
                        onChange={(e) => setPhotoForm({ ...photoForm, isProfileImage: e.target.checked })}
                      />
                      <span>Set as Profile Image</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={photoForm.isCoverImage}
                        onChange={(e) => setPhotoForm({ ...photoForm, isCoverImage: e.target.checked })}
                      />
                      <span>Set as Cover Image</span>
                    </label>
                  </div>
                  <Button onClick={handleAddPhoto} className="w-full" disabled={!photoForm.file || uploadingPhoto}>
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {photoForm.file ? 'Upload & Add Photo' : 'Select a file to upload'}
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
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRemovePhoto(photo._id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(photo.isProfileImage || photo.isCoverImage) && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-yellow-500 text-white px-2 py-1 rounded text-xs flex items-center">
                      <Star className="h-3 w-3 mr-1" />
                      {photo.isProfileImage ? 'Profile' : 'Cover'}
                    </span>
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
      {/* <Card>
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
                  <DialogTitle>Add New Video</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="video-url">Video URL</Label>
                    <Input
                      id="video-url"
                      value={videoForm.url}
                      onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="video-thumbnail">Thumbnail URL</Label>
                    <Input
                      id="video-thumbnail"
                      value={videoForm.thumbnail}
                      onChange={(e) => setVideoForm({ ...videoForm, thumbnail: e.target.value })}
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                  </div>
                  <div>
                    <Label htmlFor="video-caption">Caption</Label>
                    <Textarea
                      id="video-caption"
                      value={videoForm.caption}
                      onChange={(e) => setVideoForm({ ...videoForm, caption: e.target.value })}
                      placeholder="Video description..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="video-platform">Platform</Label>
                    <Select value={videoForm.platform} onValueChange={(value) => setVideoForm({ ...videoForm, platform: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="vimeo">Vimeo</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
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
                  <Image
                    src={video.thumbnail}
                    alt={video.caption}
                    width={300}
                    height={200}
                    className="w-full h-48 object-cover rounded-lg"
                  />
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
                      onClick={() => window.open(video.url, '_blank')}
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
      </Card> */}
    </div>
  );
}
