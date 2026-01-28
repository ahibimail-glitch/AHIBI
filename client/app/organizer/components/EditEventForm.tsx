"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
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
import { PlusCircle, Trash2, Plus, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface TicketType {
  name: string;
  description: string;
  price: string;
  quantity: string;
  capacity: string;
  benefits: string[];
}

interface Event {
  _id: string;
  title: string;
  description: string;
  banner: string;
  coverImage?: string;
  gallery: Array<{ url: string; caption: string }>;
  category: string;
  startDate: string;
  endDate: string;
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    coordinates?: {
      type: string;
      coordinates: [number, number]; // [longitude, latitude]
    };
  };
  ticketTypes: Array<{
    name: string;
    description: string;
    price: number;
    quantity: number;
    sold: number;
    capacity: number;
    benefits: string[];
  }>;
  termsAndConditions: string;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  status: string;
  approvalStatus: string;
  isFreeEvent?: boolean;
  socialLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
}

interface EditEventFormProps {
  eventId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditEventForm({ eventId, onSuccess, onCancel }: EditEventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    venue: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    startDate: "",
    endDate: "",
    category: "",
    image: "",
    coverImage: "",
    website: "",
    facebook: "",
    instagram: "",
    twitter: "",
    youtube: "",
    isFreeEvent: false,
  });

  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [fees, setFees] = useState({
    includeConvenience: true,
    conveniencePercentage: 5,
    convenienceFixedAmount: 0,
  });

  // Fetch event data on component mount
  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      setIsLoadingEvent(true);
      const token = localStorage.getItem('organizer_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/organizer/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch event data');
      }

      const data = await response.json();
      const event: Event = data.data.event;

      console.log("Fetched event data:", event); // Log the event object

      // Populate form with existing data
      setEventData({
        title: event.title,
        description: event.description,
        venue: event.location.address,
        city: event.location.city,
        state: event.location.state,
        country: event.location.country,
        pincode: event.location.pincode,
        startDate: new Date(new Date(event.startDate).getTime() - new Date(event.startDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        endDate: new Date(new Date(event.endDate).getTime() - new Date(event.endDate).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
        category: event.category,
        image: event.banner,
        coverImage: event.coverImage || "",
        website: event.socialLinks?.website || "",
        facebook: event.socialLinks?.facebook || "",
        instagram: event.socialLinks?.instagram || "",
        twitter: event.socialLinks?.twitter || "",
        youtube: event.socialLinks?.youtube || "",
        isFreeEvent: !!event.isFreeEvent,
      });

      setTicketTypes(event.ticketTypes.map(ticket => ({
        name: ticket.name,
        description: ticket.description || "",
        price: ticket.price.toString(),
        quantity: ticket.quantity.toString(),
        capacity: ticket.capacity.toString(),
        benefits: ticket.benefits || []
      })));

      setTermsAndConditions(event.termsAndConditions || "");
      setFaqs(event.faqs || []);
      setImagePreview(event.banner);
      setCoverPreview(event.coverImage || null);
      setFees({
        includeConvenience: (event as any)?.convenience?.percentage !== 0 || (event as any)?.convenience?.fixedAmount !== 0,
        conveniencePercentage: (event as any)?.convenience?.percentage ?? 5,
        convenienceFixedAmount: (event as any)?.convenience?.fixedAmount ?? 0,
      });
    } catch (err) {
      console.error('Error fetching event data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch event data');
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const handleCoverImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsUploadingCover(true);
      setError(null);

      const preview = await createImagePreview(file);
      setCoverPreview(preview);

      const uploadedUrl = await uploadFile(file);
      setEventData(prev => ({
        ...prev,
        coverImage: uploadedUrl.status === 'success' && uploadedUrl.data?.photo?.url ? uploadedUrl.data.photo.url : prev.coverImage
      }));

    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setIsUploading(true);
      setError(null);

      // Create preview
      const preview = await createImagePreview(file);
      setImagePreview(preview);

      // Upload the file
      const uploadedUrl = await uploadFile(file);
      setEventData(prev => ({
        ...prev,
        image: uploadedUrl.status === 'success' && uploadedUrl.data?.photo?.url ? uploadedUrl.data.photo.url : prev.image
      }));

    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const addTicketType = () => {
    setTicketTypes([
      ...ticketTypes,
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
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: keyof TicketType, value: string | string[]) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets[index] = { ...updatedTickets[index], [field]: value };
    setTicketTypes(updatedTickets);
  };

  const addBenefit = (ticketIndex: number) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets[ticketIndex].benefits.push("");
    setTicketTypes(updatedTickets);
  };

  const removeBenefit = (ticketIndex: number, benefitIndex: number) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets[ticketIndex].benefits.splice(benefitIndex, 1);
    setTicketTypes(updatedTickets);
  };

  const updateBenefit = (ticketIndex: number, benefitIndex: number, value: string) => {
    const updatedTickets = [...ticketTypes];
    updatedTickets[ticketIndex].benefits[benefitIndex] = value;
    setTicketTypes(updatedTickets);
  };

  const addFaq = () => {
    setFaqs([...faqs, { question: "", answer: "" }]);
  };

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index));
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updatedFaqs = [...faqs];
    updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
    setFaqs(updatedFaqs);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventData.title || !eventData.description || !eventData.venue || !eventData.city || !eventData.startDate || !eventData.endDate || !eventData.category) {
      setError('Please fill in all required fields');
      return;
    }

    // Only require tickets for paid events
    if (!eventData.isFreeEvent) {
      if (ticketTypes.length === 0) {
        setError('Please add at least one ticket type');
        return;
      }
      // Validate ticket types
      for (const ticket of ticketTypes) {
        if (!ticket.name || !ticket.price || !ticket.quantity) {
          setError('Please fill in all ticket type fields');
          return;
        }
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('organizer_token');
      if (!token) {
        setError('No authentication token found');
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const eventPayload = {
        title: eventData.title,
        description: eventData.description,
        banner: eventData.image,
        coverImage: eventData.coverImage,
        category: eventData.category,
        startDate: new Date(eventData.startDate).toISOString(),
        endDate: new Date(eventData.endDate).toISOString(),
        isFreeEvent: eventData.isFreeEvent,
        location: {
          address: eventData.venue,
          city: eventData.city,
          state: eventData.state,
          country: eventData.country,
          pincode: eventData.pincode,
          coordinates: {
            type: 'Point',
            coordinates: [0, 0] // [longitude, latitude] - default coordinates
          }
        },
        ticketTypes: eventData.isFreeEvent ? [] : ticketTypes.map(ticket => ({
          name: ticket.name,
          description: ticket.description,
          price: parseFloat(ticket.price),
          quantity: parseInt(ticket.quantity),
          capacity: parseInt(ticket.capacity),
          benefits: ticket.benefits.filter(benefit => benefit.trim() !== '')
        })),
        convenience: eventData.isFreeEvent ? { percentage: 0, fixedAmount: 0 } : {
          percentage: fees.includeConvenience ? fees.conveniencePercentage : 0,
          fixedAmount: fees.includeConvenience ? fees.convenienceFixedAmount : 0,
        },
        termsAndConditions,
        faqs: faqs.filter(faq => faq.question.trim() !== '' && faq.answer.trim() !== ''),
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

      const response = await fetch(`${apiUrl}/api/organizer/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update event');
      }

      toast({
        title: "Success",
        description: "Event updated successfully!",
        variant: "default",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
          <p className="text-gray-600">Loading event data...</p>
        </div>
      </div>
    );
  }

  if (error && !isLoadingEvent) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
            <p className="text-gray-600">Update your event details</p>
          </div>
        </div>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-800 font-medium">Error loading event</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <Button onClick={fetchEventData} className="mt-4" variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Edit Event</h2>
          <p className="text-gray-600">Update your event details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Update the basic details of your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Event Title *</Label>
                <Input
                  id="title"
                  value={eventData.title}
                  onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={eventData.category} onValueChange={(value) => setEventData({ ...eventData, category: value })}>
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
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                placeholder="Describe your event..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={eventData.startDate}
                  onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date *</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={eventData.endDate}
                  onChange={(e) => setEventData({ ...eventData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Where will your event take place?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="venue">Venue Address *</Label>
              <Input
                id="venue"
                value={eventData.venue}
                onChange={(e) => setEventData({ ...eventData, venue: e.target.value })}
                placeholder="Enter venue address"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={eventData.city}
                  onChange={(e) => setEventData({ ...eventData, city: e.target.value })}
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <Label htmlFor="state">State *</Label>
                <input
                  id="state"
                  type="text"
                  value={eventData.state}
                  onChange={(e) => setEventData({ ...eventData, state: e.target.value })}
                  placeholder="State"
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div>
                <Label htmlFor="pincode">Pincode</Label>
                <input
                  id="pincode"
                  type="text"
                  value={eventData.pincode}
                  onChange={(e) => setEventData({ ...eventData, pincode: e.target.value })}
                  placeholder="Pincode"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Event Banner */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Event Banner</CardTitle>
            <CardDescription>Upload an image for your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="banner">Banner Image</Label>
              <Input
                id="banner"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                disabled={isUploading}
              />
              {isUploading && (
                <div className="flex items-center space-x-2 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </div>
            {imagePreview && (
              <div className="mt-4">
                <img
                  src={imagePreview}
                  alt="Event banner preview"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Event Cover</CardTitle>
            <CardDescription>Upload a wide cover image for your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="coverImage">Cover Image</Label>
              <Input
                id="coverImage"
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                ref={coverInputRef}
                disabled={isUploadingCover}
              />
              {isUploadingCover && (
                <div className="flex items-center space-x-2 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </div>
            {coverPreview && (
              <div className="mt-4">
                <img
                  src={coverPreview}
                  alt="Event cover preview"
                  className="w-full max-w-md h-48 object-cover rounded-lg"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Social & Website Links</CardTitle>
            <CardDescription>Add links to your event's official pages</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" value={eventData.website} onChange={(e) => setEventData({ ...eventData, website: e.target.value })} placeholder="https://example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" value={eventData.instagram} onChange={(e) => setEventData({ ...eventData, instagram: e.target.value })} placeholder="https://instagram.com/yourpage" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input id="facebook" value={eventData.facebook} onChange={(e) => setEventData({ ...eventData, facebook: e.target.value })} placeholder="https://facebook.com/yourpage" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="twitter">X/Twitter</Label>
              <Input id="twitter" value={eventData.twitter} onChange={(e) => setEventData({ ...eventData, twitter: e.target.value })} placeholder="https://x.com/yourpage" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="youtube">YouTube</Label>
              <Input id="youtube" value={eventData.youtube} onChange={(e) => setEventData({ ...eventData, youtube: e.target.value })} placeholder="https://youtube.com/@yourchannel" />
            </div>
          </CardContent>
        </Card>

        {/* Free/RSVP Option */}
        <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Event Type</CardTitle>
            <CardDescription>Mark as free/RSVP to disable ticket categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFreeEvent"
                checked={eventData.isFreeEvent}
                onCheckedChange={(checked) => setEventData(prev => ({ ...prev, isFreeEvent: !!checked }))}
              />
              <Label htmlFor="isFreeEvent" className="text-sm font-medium">This is a Free/RSVP Event</Label>
            </div>
          </CardContent>
        </Card>

        {/* Ticket Types (paid events only) */}
        {!eventData.isFreeEvent && (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Ticket Types</CardTitle>
              <CardDescription>Define different ticket categories and pricing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ticketTypes.map((ticket, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Ticket Type {index + 1}</h4>
                    {ticketTypes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeTicketType(index)}
                        className="text-red-600 hover:text-red-700"
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
                        onChange={(e) => updateTicketType(index, 'name', e.target.value)}
                        placeholder="e.g., VIP, General Admission"
                        required
                      />
                    </div>
                    <div>
                      <Label>Price (₹) *</Label>
                      <Input
                        type="number"
                        value={ticket.price}
                        onChange={(e) => updateTicketType(index, 'price', e.target.value)}
                        placeholder="0"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity Available *</Label>
                      <Input
                        type="number"
                        value={ticket.quantity}
                        onChange={(e) => updateTicketType(index, 'quantity', e.target.value)}
                        placeholder="0"
                        min="1"
                        required
                      />
                    </div>
                    <div>
                      <Label>Capacity per Ticket</Label>
                      <Input
                        type="number"
                        value={ticket.capacity}
                        onChange={(e) => updateTicketType(index, 'capacity', e.target.value)}
                        placeholder="1"
                        min="1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={ticket.description}
                      onChange={(e) => updateTicketType(index, 'description', e.target.value)}
                      placeholder="Describe what's included with this ticket"
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label>Benefits</Label>
                    <div className="space-y-2">
                      {ticket.benefits.map((benefit, benefitIndex) => (
                        <div key={benefitIndex} className="flex space-x-2">
                          <Input
                            value={benefit}
                            onChange={(e) => updateBenefit(index, benefitIndex, e.target.value)}
                            placeholder="Enter benefit"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeBenefit(index, benefitIndex)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addBenefit(index)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Benefit
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addTicketType} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Ticket Type
              </Button>
            </CardContent>
          </Card>
        )}

        {!eventData.isFreeEvent && (
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Fee Configuration</CardTitle>
              <CardDescription>Optional platform/convenience fee settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeConvenience"
                  checked={fees.includeConvenience}
                  onCheckedChange={(checked) => setFees(prev => ({ ...prev, includeConvenience: !!checked }))}
                />
                <Label htmlFor="includeConvenience" className="text-sm font-medium">Include Convenience Fee</Label>
              </div>
              {fees.includeConvenience && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="conveniencePercentage">Convenience Percentage (%)</Label>
                    <Input
                      id="conveniencePercentage"
                      type="number"
                      value={fees.conveniencePercentage}
                      onChange={(e) => setFees(prev => ({ ...prev, conveniencePercentage: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="convenienceFixedAmount">Convenience Fixed Amount</Label>
                    <Input
                      id="convenienceFixedAmount"
                      type="number"
                      value={fees.convenienceFixedAmount}
                      onChange={(e) => setFees(prev => ({ ...prev, convenienceFixedAmount: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-90">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Event'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
