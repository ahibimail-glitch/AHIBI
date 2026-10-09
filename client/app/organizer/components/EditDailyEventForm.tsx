"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
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
import { PlusCircle, Trash2, Plus, Calendar, X, Loader2 } from "lucide-react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { FileUploadButton } from "@/components/ui/file-upload-button";

interface TicketType {
  _id?: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
  capacity: string;
  benefits: string[];
  sold?: number;
}

interface EditDailyEventFormProps {
  eventId: string;
  onSuccess?: () => void;
}

export default function EditDailyEventForm({ eventId, onSuccess }: EditDailyEventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
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
    periodStartDate: "",
    periodEndDate: "",
    startTime: "",
    durationHours: "1",
    durationMinutes: "0",
    category: "",
    posterImage: "",
    coverImage: "",
    isFreeEvent: false,
    website: "",
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
    bookingDeadlineHours: "0",
  });

  const [activeDates, setActiveDates] = useState<Date[]>([]);
  const [showActiveDatePicker, setShowActiveDatePicker] = useState(false);

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([
    {
      name: "General Admission",
      description: "",
      price: "",
      quantity: "",
      capacity: "1",
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

  const [galleryImages, setGalleryImages] = useState<Array<{ url: string; caption: string; file?: File }>>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setIsFetching(true);
      const token = localStorage.getItem("organizer_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/daily-events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        const event = response.data.data.dailyEvent;
        
        setEventData({
          eventName: event.title || "",
          description: event.description || "",
          termsAndConditions: event.termsAndConditions || "",
          venue: event.location?.address || "",
          city: event.location?.city || "",
          state: event.location?.state || "",
          country: event.location?.country || "India",
          pincode: event.location?.pincode || "",
          periodStartDate: event.periodStartDate ? new Date(event.periodStartDate).toISOString().split('T')[0] : "",
          periodEndDate: event.periodEndDate ? new Date(event.periodEndDate).toISOString().split('T')[0] : "",
          startTime: event.startTime || "",
          durationHours: String(event.duration?.hours || 1),
          durationMinutes: String(event.duration?.minutes || 0),
          category: event.category || "",
          posterImage: event.banner || "",
          coverImage: event.coverImage || "",
          isFreeEvent: event.isFreeEvent || false,
          website: event.socialLinks?.website || "",
          facebook: event.socialLinks?.facebook || "",
          instagram: event.socialLinks?.instagram || "",
          twitter: event.socialLinks?.twitter || "",
          youtube: event.socialLinks?.youtube || "",
          bookingDeadlineHours: String(event.bookingDeadlineHours || 0),
        });

        setPosterPreview(event.banner || null);
        setCoverPreview(event.coverImage || null);

        if (event.activeDates && event.activeDates.length > 0) {
          setActiveDates(event.activeDates.map((d: string) => new Date(d)));
        }

        if (event.ticketTypes && event.ticketTypes.length > 0) {
          setTicketTypes(event.ticketTypes.map((t: any) => ({
            _id: t._id,
            name: t.name,
            description: t.description || "",
            price: String(t.price),
            quantity: String(t.quantity),
            capacity: String(t.capacity || 1),
            benefits: t.benefits || ["Entry to the event"],
            sold: t.sold || 0
          })));
        }

        if (event.gallery && event.gallery.length > 0) {
          setGalleryImages(event.gallery);
        }

        if (event.convenience) {
          setFees(prev => ({
            ...prev,
            conveniencePercentage: event.convenience.percentage || 5,
            convenienceFixedAmount: event.convenience.fixedAmount || 0,
          }));
        }
      }
    } catch (err: any) {
      console.error("Error fetching event data:", err);
      setError(err.response?.data?.message || "Failed to load event data");
    } finally {
      setIsFetching(false);
    }
  };

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
            const uploadedUrl = await uploadFile(image.file);
            return {
              url: uploadedUrl.status === 'success' && uploadedUrl.data?.photo?.url ? uploadedUrl.data.photo.url : image.url,
              caption: image.caption
            };
          } else {
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
        capacity: "1",
        benefits: ["Entry to the event"]
      }
    ]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(prev => prev.filter((_, i) => i !== index));
  };

  const handleActiveDateSelect = (date: Date | undefined) => {
    if (!date) return;
    
    const dateExists = activeDates.some(d => 
      d.toDateString() === date.toDateString()
    );
    
    if (dateExists) {
      setActiveDates(prev => prev.filter(d => d.toDateString() !== date.toDateString()));
    } else {
      setActiveDates(prev => [...prev, date]);
    }
  };

  const removeActiveDate = (index: number) => {
    setActiveDates(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (!eventData.posterImage) {
        throw new Error("Please upload a poster image");
      }

      if (activeDates.length === 0) {
        throw new Error("Please select at least one active date for the daily event");
      }

      if (!eventData.isFreeEvent && ticketTypes.some(t => !t.name || !t.price || !t.quantity)) {
        throw new Error("Please fill in all ticket type details");
      }

      const uploadedGallery = await uploadGalleryImages();

      const token = localStorage.getItem("organizer_token");
      if (!token) {
        throw new Error("Authentication required");
      }

      const payload = {
        title: eventData.eventName,
        description: eventData.description,
        banner: eventData.posterImage,
        coverImage: eventData.coverImage || eventData.posterImage,
        gallery: uploadedGallery,
        category: eventData.category,
        periodStartDate: eventData.periodStartDate,
        periodEndDate: eventData.periodEndDate,
        startTime: eventData.startTime,
        duration: {
          hours: parseInt(eventData.durationHours) || 0,
          minutes: parseInt(eventData.durationMinutes) || 0
        },
        activeDates: activeDates.map(d => d.toISOString()),
        location: {
          address: eventData.venue,
          city: eventData.city,
          state: eventData.state,
          country: eventData.country,
          pincode: eventData.pincode,
          coordinates: [0, 0]
        },
        ticketTypes: eventData.isFreeEvent ? [] : ticketTypes.map(ticket => ({
          _id: ticket._id,
          name: ticket.name,
          description: ticket.description,
          price: parseFloat(ticket.price),
          quantity: parseInt(ticket.quantity),
          capacity: parseInt(ticket.capacity) || 1,
          benefits: ticket.benefits.filter(b => b.trim() !== "")
        })),
        termsAndConditions: eventData.termsAndConditions,
        isFreeEvent: eventData.isFreeEvent,
        convenience: fees.includeConvenience ? {
          percentage: fees.conveniencePercentage,
          fixedAmount: fees.convenienceFixedAmount
        } : {
          percentage: 0,
          fixedAmount: 0
        },
        socialLinks: {
          website: eventData.website,
          facebook: eventData.facebook,
          instagram: eventData.instagram,
          twitter: eventData.twitter,
          youtube: eventData.youtube
        },
        bookingDeadlineHours: parseInt(eventData.bookingDeadlineHours) || 0
      };

      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/organizer/daily-events/${eventId}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.success) {
        setShowActiveDatePicker(false);
        
        alert("Daily event updated successfully!");
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      console.error("Error updating daily event:", err);
      setError(err.response?.data?.message || err.message || "Failed to update daily event");
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Daily Event</CardTitle>
          <CardDescription>
            Update your recurring daily event details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="eventName">Event Name *</Label>
                <Input
                  id="eventName"
                  value={eventData.eventName}
                  onChange={handleChange}
                  placeholder="Enter event name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={eventData.description}
                  onChange={handleChange}
                  placeholder="Describe your daily event"
                  rows={4}
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={eventData.category} onValueChange={handleSelectChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Comedy">Comedy</SelectItem>
                    <SelectItem value="Theatre">Theatre</SelectItem>
                    <SelectItem value="Dance">Dance</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Art">Art</SelectItem>
                    <SelectItem value="Sports">Sports</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="periodStartDate">Period Start Date *</Label>
                  <Input
                    id="periodStartDate"
                    type="date"
                    value={eventData.periodStartDate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="periodEndDate">Period End Date *</Label>
                  <Input
                    id="periodEndDate"
                    type="date"
                    value={eventData.periodEndDate}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={eventData.startTime}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="durationHours">Duration (Hours)</Label>
                  <Input
                    id="durationHours"
                    type="number"
                    min="0"
                    max="23"
                    value={eventData.durationHours}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="durationMinutes">Duration (Minutes)</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={eventData.durationMinutes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bookingDeadlineHours">Booking Deadline (Hours before event)</Label>
                <Input
                  id="bookingDeadlineHours"
                  type="number"
                  min="0"
                  value={eventData.bookingDeadlineHours}
                  onChange={handleChange}
                  placeholder="0"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Set how many hours before the event start time bookings will close. Set to 0 for no deadline.
                </p>
              </div>

              <div>
                <Label>Active Dates (Select dates when event will happen) *</Label>
                <Popover open={showActiveDatePicker} onOpenChange={setShowActiveDatePicker}>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      {activeDates.length > 0 ? `${activeDates.length} dates selected` : "Select active dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="multiple"
                      selected={activeDates}
                      onSelect={(dates) => {
                        if (dates) {
                          setActiveDates(Array.isArray(dates) ? dates : [dates]);
                        }
                      }}
                      disabled={(date) => {
                        const start = eventData.periodStartDate ? new Date(eventData.periodStartDate) : null;
                        const end = eventData.periodEndDate ? new Date(eventData.periodEndDate) : null;
                        if (start && date < start) return true;
                        if (end && date > end) return true;
                        return false;
                      }}
                    />
                  </PopoverContent>
                </Popover>
                {activeDates.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeDates.sort((a, b) => a.getTime() - b.getTime()).map((date, index) => (
                      <div key={index} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {format(date, "MMM dd, yyyy")}
                        <button
                          type="button"
                          onClick={() => removeActiveDate(index)}
                          className="ml-1 hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="venue">Venue Address *</Label>
                  <Input
                    id="venue"
                    value={eventData.venue}
                    onChange={handleChange}
                    placeholder="Enter venue address"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={eventData.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={eventData.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={eventData.country}
                    onChange={handleChange}
                    placeholder="Enter country"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={eventData.pincode}
                    onChange={handleChange}
                    placeholder="Enter pincode"
                  />
                </div>
              </div>

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
                      <FileUploadButton
                        id="eventPoster"
                        ref={posterInputRef}
                        onChange={handlePosterChange}
                        accept="image/*"
                        disabled={isUploadingPoster}
                        uploading={isUploadingPoster}
                        label="Upload Poster"
                        uploadingLabel="Uploading..."
                      />
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
                  <Label htmlFor="eventCover">Event Cover (16:9)</Label>
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
                      <FileUploadButton
                        id="eventCover"
                        ref={coverInputRef}
                        onChange={handleCoverChange}
                        accept="image/*"
                        disabled={isUploadingCover}
                        uploading={isUploadingCover}
                        label="Upload Cover"
                        uploadingLabel="Uploading..."
                      />
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
                    <div className="mt-2">
                      <FileUploadButton
                        id="galleryImages"
                        ref={galleryInputRef}
                        accept="image/*"
                        multiple
                        onChange={handleGalleryImageChange}
                        disabled={isUploadingGallery}
                        uploading={isUploadingGallery}
                        label="Choose Files"
                        uploadingLabel="Uploading..."
                      />
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
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

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isFreeEvent"
                  checked={eventData.isFreeEvent}
                  onCheckedChange={(checked) =>
                    setEventData(prev => ({ ...prev, isFreeEvent: checked as boolean }))
                  }
                />
                <Label htmlFor="isFreeEvent">This is a free event</Label>
              </div>

              {!eventData.isFreeEvent && (
                <div className="space-y-4">
                  <div className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur-sm py-3 px-2 -mx-2 border-b border-gray-200 shadow-sm">
                    <Label className="text-lg font-semibold">
                      Ticket Types ({ticketTypes.length})
                    </Label>
                    <Button type="button" onClick={addTicketType} variant="outline" size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Ticket Type
                    </Button>
                  </div>

                  {ticketTypes.map((ticket, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="font-semibold">Ticket Type {index + 1}</h4>
                          {ticketTypes.length > 1 && (
                            <Button
                              type="button"
                              onClick={() => removeTicketType(index)}
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Name *</Label>
                            <Input
                              value={ticket.name}
                              onChange={(e) => handleTicketTypeChange(index, 'name', e.target.value)}
                              placeholder="e.g., VIP, General"
                              required
                            />
                          </div>
                          <div>
                            <Label>Price (₹) *</Label>
                            <Input
                              type="number"
                              value={ticket.price}
                              onChange={(e) => handleTicketTypeChange(index, 'price', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Quantity *</Label>
                            <Input
                              type="number"
                              value={ticket.quantity}
                              onChange={(e) => handleTicketTypeChange(index, 'quantity', e.target.value)}
                              placeholder="100"
                              min="1"
                              required
                            />
                            {ticket.sold !== undefined && ticket.sold > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                {ticket.sold} tickets already sold
                              </p>
                            )}
                          </div>
                          <div>
                            <Label>Capacity per Ticket</Label>
                            <Input
                              type="number"
                              value={ticket.capacity}
                              onChange={(e) => handleTicketTypeChange(index, 'capacity', e.target.value)}
                              placeholder="1"
                              min="1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={ticket.description}
                            onChange={(e) => handleTicketTypeChange(index, 'description', e.target.value)}
                            placeholder="Ticket description"
                            rows={2}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label>Benefits</Label>
                            <Button
                              type="button"
                              onClick={() => addBenefit(index)}
                              variant="outline"
                              size="sm"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Benefit
                            </Button>
                          </div>
                          {ticket.benefits.map((benefit, benefitIndex) => (
                            <div key={benefitIndex} className="flex gap-2 mb-2">
                              <Input
                                value={benefit}
                                onChange={(e) => handleBenefitChange(index, benefitIndex, e.target.value)}
                                placeholder="e.g., Free drink"
                              />
                              {ticket.benefits.length > 1 && (
                                <Button
                                  type="button"
                                  onClick={() => removeBenefit(index, benefitIndex)}
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="flex justify-center pt-2 pb-1">
                    <Button type="button" onClick={addTicketType} variant="outline">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Another Ticket Type
                    </Button>
                  </div>
                </div>
              )}

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

              <div>
                <Label htmlFor="termsAndConditions">Terms and Conditions</Label>
                <Textarea
                  id="termsAndConditions"
                  value={eventData.termsAndConditions}
                  onChange={handleChange}
                  placeholder="Enter terms and conditions"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowActiveDatePicker(false);
                  if (onSuccess) {
                    onSuccess();
                  }
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Updating..." : "Update Daily Event"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
