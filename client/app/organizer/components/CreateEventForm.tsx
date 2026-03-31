"use client";

import { useState, useRef, ChangeEvent } from "react";
import axios from "axios";
import { uploadFile, validateFile, createImagePreview } from "@/lib/cloudinary";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Trash2, Plus } from "lucide-react";
import PriceBreakdown from "@/components/PriceBreakdown";

interface TicketType {
  name: string;
  description: string;
  price: string;
  quantity: string;
  capacity: string;
  benefits: string[];
}

interface CreateEventFormProps {
  onSuccess?: () => void;
}

export default function CreateEventForm({ onSuccess }: CreateEventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState({
    eventName: "",
    description: "",
    termsAndConditions: "",
    venue: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    startDate: "",
    endDate: "",
    category: "",
    posterImage: "",
    coverImage: "",
    isFreeEvent: false,
    website: "",
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    {
      name: "General Admission",
      description: "",
      price: "",
      quantity: "",
      capacity: "1", // Default capacity is 1 entry per ticket
      benefits: ["Entry to the event"]
    }
  ]);

  const [fees, setFees] = useState({
    gstPercentage: 18,
    includeGst: false,
    conveniencePercentage: 5,
    convenienceFixedAmount: 0,
    includeConvenience: true
  });

  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Gallery/Map images state
  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; caption: string; file?: File }>>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const uploadAndSetImage = async (
    file: File,
    kind: 'poster' | 'cover'
  ) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const setUploading = kind === 'poster' ? setIsUploadingPoster : setIsUploadingCover;
    const setPreview = kind === 'poster' ? setPosterPreview : setCoverPreview;
    const inputRef = kind === 'poster' ? posterInputRef : coverInputRef;

    try {
      setUploading(true);
      setError(null);

      const preview = await createImagePreview(file);
      setPreview(preview);

      const uploadResponse = await uploadFile(file);
      if (uploadResponse.status !== 'success') {
        throw new Error(uploadResponse.message || 'Failed to upload image');
      }

      if (!uploadResponse.data?.photo?.url) {
        throw new Error('Invalid response from server - missing photo URL');
      }

      const imageUrl = uploadResponse.data.photo.url;
      setEventData(prev => ({
        ...prev,
        ...(kind === 'poster' ? { posterImage: imageUrl } : { coverImage: imageUrl })
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      setPreview(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handlePosterChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await uploadAndSetImage(e.target.files[0], 'poster');
  };

  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    await uploadAndSetImage(e.target.files[0], 'cover');
  };

  // Gallery/Map image handlers
  const handleGalleryImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const newImages: Array<{ url: string; caption: string; file?: File }> = [];

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      try {
        const preview = await createImagePreview(file);
        newImages.push({
          url: preview,
          caption: '',
          file: file
        });
      } catch (err) {
        console.error('Error creating preview:', err);
        setError('Failed to process image. Please try again.');
        return;
      }
    }

    setGalleryImages(prev => [...prev, ...newImages]);
    // Reset file input
    if (galleryInputRef.current) {
      galleryInputRef.current.value = '';
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateGalleryCaption = (index: number, caption: string) => {
    setGalleryImages(prev => prev.map((img, i) => 
      i === index ? { ...img, caption } : img
    ));
  };

  const uploadGalleryImages = async () => {
    if (galleryImages.length === 0) return [];

    try {
      setIsUploadingGallery(true);
      setError(null);

      const uploadedImages = await Promise.all(
        galleryImages.map(async (image) => {
          if (image.file) {
            // Upload new file
            const uploadedUrl = await uploadFile(image.file);
            return {
              url: uploadedUrl.status === 'success' && uploadedUrl.data?.photo?.url ? uploadedUrl.data.photo.url : image.url,
              caption: image.caption
            };
          } else {
            // Already uploaded image
            return {
              url: image.url,
              caption: image.caption
            };
          }
        })
      );

      setGalleryImages(uploadedImages);
      return uploadedImages;
    } catch (err) {
      console.error('Error uploading gallery images:', err);
      setError('Failed to upload gallery images. Please try again.');
      return [];
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEventData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setEventData((prev) => ({ ...prev, category: value }));
  };

  const handleTicketTypeChange = (index: number, field: keyof TicketType, value: string) => {
    setTicketTypes(prev =>
      prev.map((ticket, i) =>
        i === index
          ? { ...ticket, [field]: value }
          : ticket
      )
    );
  };

  const handleBenefitChange = (ticketIndex: number, benefitIndex: number, value: string) => {
    setTicketTypes(prev =>
      prev.map((ticket, i) =>
        i === ticketIndex
          ? {
            ...ticket,
            benefits: ticket.benefits.map((benefit, j) =>
              j === benefitIndex ? value : benefit
            )
          }
          : ticket
      )
    );
  };

  const addBenefit = (ticketIndex: number) => {
    setTicketTypes(prev =>
      prev.map((ticket, i) =>
        i === ticketIndex
          ? { ...ticket, benefits: [...ticket.benefits, ""] }
          : ticket
      )
    );
  };

  const removeBenefit = (ticketIndex: number, benefitIndex: number) => {
    setTicketTypes(prev =>
      prev.map((ticket, i) =>
        i === ticketIndex
          ? {
            ...ticket,
            benefits: ticket.benefits.filter((_, j) => j !== benefitIndex)
          }
          : ticket
      )
    );
  };

  const addTicketType = () => {
    setTicketTypes(prev => [
      ...prev,
      {
        name: "",
        description: "",
        price: "",
        quantity: "",
        capacity: "1", // Default capacity is 1 entry per ticket
        benefits: ["Entry to the event"]
      }
    ]);
  };

  const removeTicketType = (index: number) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleFeeChange = (field: keyof typeof fees, value: boolean | number) => {
    setFees(prev => ({ ...prev, [field]: value }));
  };

  const calculateFinalPrice = (basePrice: number) => {
    let finalPrice = basePrice;

    if (fees.includeGst) {
      finalPrice += (basePrice * fees.gstPercentage) / 100;
    }

    if (fees.includeConvenience) {
      finalPrice += (basePrice * fees.conveniencePercentage) / 100;
      finalPrice += fees.convenienceFixedAmount;
    }

    return finalPrice;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate required fields including image
    if (!eventData.posterImage || !eventData.coverImage) {
      setError('Please upload both event poster and cover images');
      return;
    }

    // Validate ticket types (only for paid events)
    if (!eventData.isFreeEvent) {
      const hasValidTickets = ticketTypes.every(ticket =>
        ticket.name && ticket.price && ticket.quantity
      );

      if (!hasValidTickets) {
        setError('Please fill in all ticket type details');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    // Upload gallery images first
    const uploadedGallery = await uploadGalleryImages();
    if (uploadedGallery === undefined && galleryImages.length > 0) {
      // If upload failed and we have gallery images, don't proceed
      setIsLoading(false);
      return;
    }

    // Basic validation
    if (!eventData.eventName || !eventData.description || !eventData.venue ||
      !eventData.startDate || !eventData.endDate || !eventData.category) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    // Get organizer user ID from local storage
    const organizerUserStr = localStorage.getItem('organizer_user');
    if (!organizerUserStr) {
      setError("Organizer session not found. Please log in again.");
      setIsLoading(false);
      window.location.href = "/organizer/auth/login";
      return;
    }

    let organizerUser;
    try {
      organizerUser = JSON.parse(organizerUserStr);
    } catch (error) {
      setError("Invalid organizer session. Please log in again.");
      setIsLoading(false);
      window.location.href = "/organizer/auth/login";
      return;
    }

    const organizerId = organizerUser._id || organizerUser.id;
    if (!organizerId) {
      setError("Organizer ID not found. Please log in again.");
      setIsLoading(false);
      window.location.href = "/organizer/auth/login";
      return;
    }

    // Map frontend category to backend enum values
    const categoryMap: { [key: string]: string } = {
      music: 'Music',
      comedy: 'Comedy',
      theatre: 'Theatre',
      dance: 'Dance',
      food: 'Food',
      art: 'Art',
      sports: 'Sports',
      business: 'Business',
      education: 'Education',
      other: 'Other'
    };

    // Prepare the event data for the API
    const payload = {
      title: eventData.eventName,
      description: eventData.description,
      termsAndConditions: eventData.termsAndConditions,
      banner: eventData.posterImage,
      coverImage: eventData.coverImage,
      gallery: uploadedGallery,
      category: categoryMap[eventData.category.toLowerCase()] || 'Other',
      startDate: new Date(eventData.startDate).toISOString(),
      endDate: new Date(eventData.endDate).toISOString(),
      status: 'pending',
      organizer: organizerId,
      isFreeEvent: eventData.isFreeEvent,
      location: {
        address: eventData.venue,
        city: eventData.city || "Mumbai",
        state: eventData.state || "Maharashtra",
        country: eventData.country || "India",
        pincode: eventData.pincode || "400001",
        coordinates: {
          type: 'Point',
          coordinates: [
            parseFloat("72.8777"),
            parseFloat("19.0760")
          ]
        }
      },
      ticketTypes: eventData.isFreeEvent ? [] : ticketTypes.map(ticket => {
        const basePrice = parseFloat(ticket.price) || 0;
        const finalPrice = calculateFinalPrice(basePrice);
        return {
          name: ticket.name,
          description: ticket.description || "",
          price: finalPrice, // Save final price instead of base price
          basePrice: basePrice, // Keep base price for reference
          quantity: parseInt(ticket.quantity, 10) || 0,
          benefits: ticket.benefits.filter(benefit => benefit.trim() !== ""),
          sold: 0,
          capacity: parseInt(ticket.capacity, 10) || 1,
        };
      }),
      convenience: eventData.isFreeEvent ? {
        percentage: 0,
        fixedAmount: 0,
        includeGst: false,
        gstPercentage: 0
      } : {
        percentage: fees.includeConvenience ? fees.conveniencePercentage : 0,
        fixedAmount: fees.includeConvenience ? fees.convenienceFixedAmount : 0,
        includeGst: fees.includeGst,
        gstPercentage: fees.includeGst ? fees.gstPercentage : 0
      },
      socialLinks: Object.fromEntries(
        Object.entries({
          website: eventData.website?.trim(),
          facebook: eventData.facebook?.trim(),
          instagram: eventData.instagram?.trim(),
          twitter: eventData.twitter?.trim(),
          youtube: eventData.youtube?.trim(),
        }).filter(([_, v]) => !!v)
      )
    };

    try {
      // Use env variable or fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("organizer_token");

      if (!token) {
        setError("You are not authenticated. Please log in again.");
        window.location.href = "/organizer/auth/login";
        return;
      }

      const endpoint = `${apiUrl}/api/organizer/events`;

      console.log("Submitting to:", endpoint);
      console.log("Payload:", payload);
      console.log("Organizer ID:", organizerId);
      console.log("Token exists:", !!token);

      const response = await axios.post(
        endpoint,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status === 201) {
        alert(`Event "${eventData.eventName}" created successfully!`);
        if (onSuccess) {
          onSuccess();
        }
      } else if (response.status === 401) {
        setError("Your session has expired. Please log in again.");
        localStorage.removeItem("organizer_token");
        window.location.href = "/organizer/auth/login";
        return;
      } else {
        const errorMessage = response.data?.message || "Failed to create event";
        setError(errorMessage);
      }
    } catch (err: any) {
      console.error("Failed to create event:", err);
      const errorMessage = err.response?.data?.message || "An unexpected error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6">
      <form onSubmit={handleSubmit}>
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg w-full">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl text-gray-900">Create New Event</CardTitle>
            <CardDescription className="text-sm sm:text-base text-gray-600">
              Fill in the details below to add a new event to the platform.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="eventPoster">Event Poster (2:3) *</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {posterPreview ? (
                      <img
                        src={posterPreview}
                        alt="Event poster preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <span>No image</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      id="eventPoster"
                      type="file"
                      ref={posterInputRef}
                      onChange={handlePosterChange}
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingPoster}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => posterInputRef.current?.click()}
                      disabled={isUploadingPoster}
                    >
                      {isUploadingPoster ? 'Uploading...' : 'Upload Poster'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Recommended: 1000×1500 (2:3)
                    </p>
                    <p className="text-sm text-gray-500">
                      JPG, PNG or WebP. Max 10MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventCover">Event Cover (16:9) *</Label>
                <div className="flex items-center gap-4">
                  <div className="relative w-48 h-28 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Event cover preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500">
                        <span>No image</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      id="eventCover"
                      type="file"
                      ref={coverInputRef}
                      onChange={handleCoverChange}
                      accept="image/*"
                      className="hidden"
                      disabled={isUploadingCover}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => coverInputRef.current?.click()}
                      disabled={isUploadingCover}
                    >
                      {isUploadingCover ? 'Uploading...' : 'Upload Cover'}
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Recommended: 1920×1080 (16:9)
                    </p>
                    <p className="text-sm text-gray-500">
                      JPG, PNG or WebP. Max 10MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Event Maps/Gallery */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Event Maps & Gallery (optional)</CardTitle>
                <CardDescription>Upload maps and additional images for your event</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="galleryImages">Upload Images</Label>
                  <Input
                    id="galleryImages"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryImageChange}
                    ref={galleryInputRef}
                    disabled={isUploadingGallery}
                  />
                  {isUploadingGallery && (
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="mr-2">⏳</span>
                      <span className="text-sm text-gray-600">Uploading gallery images...</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    You can upload multiple images. Each image can have an optional caption.
                  </p>
                </div>

                {galleryImages.length > 0 && (
                  <div className="space-y-4">
                    <Label>Gallery Images ({galleryImages.length})</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {galleryImages.map((image, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="relative">
                            <img
                              src={image.url}
                              alt={`Gallery image ${index + 1}`}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2 h-6 w-6 p-0"
                              onClick={() => removeGalleryImage(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div>
                            <Label className="text-sm">Caption (optional)</Label>
                            <Input
                              value={image.caption}
                              onChange={(e) => updateGalleryCaption(index, e.target.value)}
                              placeholder="Describe this image"
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Basic Event Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventName">Event Name *</Label>
                <Input
                  id="eventName"
                  value={eventData.eventName}
                  onChange={handleChange}
                  placeholder="e.g., Annual Tech Conference"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue">Venue Address *</Label>
                <Input
                  id="venue"
                  value={eventData.venue}
                  onChange={handleChange}
                  placeholder="e.g., 123 Main St, City Convention Center"
                  required
                />
              </div>
            </div>

            {/* Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={eventData.city}
                  onChange={handleChange}
                  placeholder="e.g., Mumbai"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={eventData.state}
                  onChange={handleChange}
                  placeholder="e.g., Maharashtra"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  value={eventData.country}
                  onChange={handleChange}
                  placeholder="e.g., India"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode *</Label>
                <Input
                  id="pincode"
                  value={eventData.pincode}
                  onChange={handleChange}
                  placeholder="e.g., 400001"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Event Description *</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={handleChange}
                placeholder="Describe the event..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termsAndConditions">Terms & Conditions (optional)</Label>
              <Textarea
                id="termsAndConditions"
                value={eventData.termsAndConditions}
                onChange={handleChange}
                placeholder="Add terms & conditions for attendees (optional)..."
              />
            </div>

            {/* Date and Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time *</Label>
                <Input
                  id="startDate"
                  value={eventData.startDate}
                  onChange={handleChange}
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time *</Label>
                <Input
                  id="endDate"
                  value={eventData.endDate}
                  onChange={handleChange}
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  onValueChange={handleSelectChange}
                  value={eventData.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="theatre">Theatre</SelectItem>
                    <SelectItem value="dance">Dance</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="art">Art</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Social Links */}
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Social & Website Links (optional)</CardTitle>
                <CardDescription>Add links to your event's official pages.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={eventData.website} onChange={handleChange} placeholder="https://example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input id="instagram" value={eventData.instagram} onChange={handleChange} placeholder="https://instagram.com/yourpage" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="facebook">Facebook</Label>
                  <Input id="facebook" value={eventData.facebook} onChange={handleChange} placeholder="https://facebook.com/yourpage" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">X/Twitter</Label>
                  <Input id="twitter" value={eventData.twitter} onChange={handleChange} placeholder="https://x.com/yourpage" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="youtube">YouTube</Label>
                  <Input id="youtube" value={eventData.youtube} onChange={handleChange} placeholder="https://youtube.com/@yourchannel" />
                </div>
              </CardContent>
            </Card>

            {/* Free Event Option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFreeEvent"
                checked={eventData.isFreeEvent}
                onCheckedChange={(checked) =>
                  setEventData(prev => ({ ...prev, isFreeEvent: checked as boolean }))
                }
              />
              <Label htmlFor="isFreeEvent" className="text-sm font-medium">
                This is a Free/RSVP Event
              </Label>
            </div>
            {/* Ticket Types Section - Only for paid events */}
            {!eventData.isFreeEvent && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Ticket Types *</Label>
                  <Button type="button" variant="outline" onClick={addTicketType}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Ticket Type
                  </Button>
                </div>

                {ticketTypes.map((ticket, ticketIndex) => (
                  <Card key={ticketIndex} className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Ticket Type {ticketIndex + 1}
                        </CardTitle>
                        {ticketTypes.length > 1 && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeTicketType(ticketIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ticket Name *</Label>
                          <Input
                            value={ticket.name}
                            onChange={(e) => handleTicketTypeChange(ticketIndex, 'name', e.target.value)}
                            placeholder="e.g., VIP, General Admission"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={ticket.description}
                            onChange={(e) => handleTicketTypeChange(ticketIndex, 'description', e.target.value)}
                            placeholder="Brief description of this ticket type"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Price (₹) *</Label>
                          <Input
                            type="number"
                            value={ticket.price}
                            onChange={(e) => handleTicketTypeChange(ticketIndex, 'price', e.target.value)}
                            placeholder="e.g., 500"
                            required
                          />
                          {ticket.price && (
                            <div className="text-xs text-gray-500 pt-1">
                              Final Price: ₹{calculateFinalPrice(parseFloat(ticket.price) || 0).toFixed(2)}
                              {(fees.includeGst || fees.includeConvenience) && " (incl. fees)"}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            value={ticket.quantity}
                            onChange={(e) => handleTicketTypeChange(ticketIndex, 'quantity', e.target.value)}
                            placeholder="e.g., 100"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Entry Capacity Per Ticket *</Label>
                          <Input
                            type="number"
                            value={ticket.capacity}
                            onChange={(e) => handleTicketTypeChange(ticketIndex, 'capacity', Math.max(1, parseInt(e.target.value) || 1).toString())}
                            placeholder="e.g., 1"
                            min="1"
                            step="1"
                            required
                          />
                          <div className="text-xs text-gray-500 pt-1">
                            <span className="font-medium">Maximum entries per ticket:</span> Set to 1 for single entry, 3 for family passes, or higher for season passes. This controls how many times each ticket can be scanned.
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Benefits</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addBenefit(ticketIndex)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {ticket.benefits.map((benefit, benefitIndex) => (
                            <div key={benefitIndex} className="flex gap-2">
                              <Input
                                value={benefit}
                                onChange={(e) => handleBenefitChange(ticketIndex, benefitIndex, e.target.value)}
                                placeholder="e.g., Entry to the event"
                              />
                              {ticket.benefits.length > 1 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeBenefit(ticketIndex, benefitIndex)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Fees Configuration - Only for paid events */}
            {!eventData.isFreeEvent && (
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Fee Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* GST Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeGst"
                        checked={fees.includeGst}
                        onCheckedChange={(checked) => handleFeeChange('includeGst', checked as boolean)}
                      />
                      <Label htmlFor="includeGst" className="text-sm font-medium">
                        Include GST
                      </Label>
                    </div>
                    {fees.includeGst && (
                      <div className="space-y-2 pl-6">
                        <Label htmlFor="gstPercentage">GST Percentage (%)</Label>
                        <Input
                          id="gstPercentage"
                          type="number"
                          value={fees.gstPercentage}
                          onChange={(e) => handleFeeChange('gstPercentage', parseFloat(e.target.value) || 0)}
                          placeholder="18"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Convenience Fee Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeConvenience"
                        checked={fees.includeConvenience}
                        onCheckedChange={(checked) => handleFeeChange('includeConvenience', checked as boolean)}
                      />
                      <Label htmlFor="includeConvenience" className="text-sm font-medium">
                        Include Convenience Fee
                      </Label>
                    </div>
                    {fees.includeConvenience && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-6">
                        <div className="space-y-2">
                          <Label htmlFor="conveniencePercentage">Convenience Percentage (%)</Label>
                          <Input
                            id="conveniencePercentage"
                            type="number"
                            value={fees.conveniencePercentage}
                            onChange={(e) => handleFeeChange('conveniencePercentage', parseFloat(e.target.value) || 0)}
                            placeholder="5"
                            min="0"
                            max="100"
                            step="0.1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="convenienceFixed">Fixed Amount (₹)</Label>
                          <Input
                            id="convenienceFixed"
                            type="number"
                            value={fees.convenienceFixedAmount}
                            onChange={(e) => handleFeeChange('convenienceFixedAmount', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Price Breakdown Example - Only for paid events with fees */}
            {!eventData.isFreeEvent && (fees.includeGst || fees.includeConvenience) && (
              <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-base">Price Breakdown Example</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ticketTypes.map((ticket, index) => (
                      ticket.price && (
                        <div key={index} className="space-y-2">
                          <div className="text-sm font-medium text-gray-700">
                            {ticket.name || `Ticket ${index + 1}`} - Base Price: ₹{parseFloat(ticket.price).toFixed(2)}
                          </div>
                          <PriceBreakdown
                            basePrice={parseFloat(ticket.price) || 0}
                            includeGst={fees.includeGst}
                            gstPercentage={fees.gstPercentage}
                            includeConvenience={fees.includeConvenience}
                            conveniencePercentage={fees.conveniencePercentage}
                            convenienceFixedAmount={fees.convenienceFixedAmount}
                          />
                        </div>
                      )
                    ))}
                    {ticketTypes.every(ticket => !ticket.price) && (
                      <div className="text-sm text-gray-500">
                        Enter ticket prices above to see price breakdown examples
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {error && (
              <div className="p-4 text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6">
              <Button
                type="submit"
                disabled={isLoading || isUploadingPoster || isUploadingCover}
                className="bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90 transition-opacity w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Creating Event...
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create Event
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
