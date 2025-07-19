"use client";

import { useState } from "react";
import axios from "axios";
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
import { PlusCircle } from "lucide-react";

interface CreateEventFormProps {
  onSuccess?: () => void;
}

export default function CreateEventForm({ onSuccess }: CreateEventFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState({
    eventName: "",
    description: "",
    venue: "",
    city: "",
    state: "",
    country: "India",
    pincode: "",
    startDate: "",
    endDate: "",
    category: "",
    ticketName: "General Admission",
    ticketPrice: "",
    capacity: "",
    includeGst: false,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setEventData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (value: string) => {
    setEventData((prev) => ({ ...prev, category: value }));
  };

  const handleGstChange = (checked: boolean) => {
    setEventData((prev) => ({ ...prev, includeGst: checked }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Basic validation
    if (!eventData.eventName || !eventData.description || !eventData.venue || 
        !eventData.startDate || !eventData.endDate || !eventData.category || 
        !eventData.ticketPrice || !eventData.capacity) {
      setError("Please fill in all required fields");
      setIsLoading(false);
      return;
    }

    // Get admin user ID from local storage or context
    const adminId = localStorage.getItem('admin_id');
    if (!adminId) {
      setError("Admin session not found. Please log in again.");
      setIsLoading(false);
      window.location.href = "/admin/login";
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
      banner: "https://placehold.co/1200x400", // Placeholder banner URL
      category: categoryMap[eventData.category.toLowerCase()] || 'Other',
      startDate: new Date(eventData.startDate).toISOString(),
      endDate: new Date(eventData.endDate).toISOString(),
      status: 'pending', // Default status for new events
      organizer: adminId, // Set organizer to current admin
      location: {
        address: eventData.venue,
        city: eventData.city || "Mumbai",
        state: eventData.state || "Maharashtra",
        country: eventData.country || "India",
        pincode: eventData.pincode || "400001",
        type: 'Point',
        coordinates: [
          parseFloat("72.8777"), // Default to Mumbai coordinates
          parseFloat("19.0760")
        ]
      },
      ticketTypes: [
        {
          name: eventData.ticketName || "General Admission",
          price: parseFloat(eventData.ticketPrice) || 0,
          quantity: parseInt(eventData.capacity, 10) || 0,
          description: "General admission ticket",
          benefits: ["Entry to the event"],
          saleStartDate: new Date().toISOString(),
          saleEndDate: new Date(eventData.endDate).toISOString(),
          minOrder: 1,
          maxOrder: 10,
          isActive: true
        }
      ],
    };

    try {
      // Use env variable or fallback
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("admin_token"); // Changed from adminToken to admin_token
      
      if (!token) {
        setError("You are not authenticated. Please log in again.");
        // Optionally redirect to login
        window.location.href = "/admin/login";
        return;
      }
      
      const endpoint = `${apiUrl}/api/admin/events`;
      
      // Debug: Log URL and payload
      console.log("Submitting to:", endpoint);
      console.log("Payload:", payload);
      console.log("Using token:", token ? "[token exists]" : "[no token]");
      
      const response = await axios.post(
        endpoint,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          validateStatus: (status) => status < 500, // Don't throw for 4xx errors
        }
      );

      if (response.status === 201) {
        alert(`Event "${eventData.eventName}" created successfully!`);
        if (onSuccess) {
          onSuccess();
        }
      } else if (response.status === 401) {
        // Handle unauthorized (token expired or invalid)
        setError("Your session has expired. Please log in again.");
        // Clear invalid token and redirect to login
        localStorage.removeItem("admin_token");
        window.location.href = "/admin/login";
        return;
      } else {
        // Handle other error responses
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
    <form onSubmit={handleSubmit}>
      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Create New Event</CardTitle>
          <CardDescription>
            Fill in the details below to add a new event to the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={eventData.eventName}
                onChange={handleChange}
                placeholder="e.g., Annual Tech Conference"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue Address</Label>
              <Input
                id="venue"
                value={eventData.venue}
                onChange={handleChange}
                placeholder="e.g., 123 Main St, City Convention Center"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={eventData.city}
                onChange={handleChange}
                placeholder="e.g., Mumbai"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={eventData.state}
                onChange={handleChange}
                placeholder="e.g., Maharashtra"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={eventData.country}
                onChange={handleChange}
                placeholder="e.g., India"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
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
            <Label htmlFor="description">Event Description</Label>
            <Textarea
              id="description"
              value={eventData.description}
              onChange={handleChange}
              placeholder="Describe the event..."
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date & Time</Label>
              <Input
                id="startDate"
                value={eventData.startDate}
                onChange={handleChange}
                type="datetime-local"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date & Time</Label>
              <Input
                id="endDate"
                value={eventData.endDate}
                onChange={handleChange}
                type="datetime-local"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                onValueChange={handleSelectChange}
                value={eventData.category}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="music">Music</SelectItem>
                  <SelectItem value="tech">Technology</SelectItem>
                  <SelectItem value="art">Art & Culture</SelectItem>
                  <SelectItem value="food">Food & Drink</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketName">Ticket Type Name</Label>
              <Input
                id="ticketName"
                value={eventData.ticketName}
                onChange={handleChange}
                placeholder="e.g., General Admission"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticketPrice">Ticket Price (₹)</Label>
              <Input
                id="ticketPrice"
                value={eventData.ticketPrice}
                onChange={handleChange}
                type="number"
                placeholder="e.g., 500"
                required
              />
              {eventData.ticketPrice && (
                <div className="text-xs text-gray-700 pt-1">
                  Final Price: ₹{
                    (() => {
                      const price = parseFloat(eventData.ticketPrice);
                      if (isNaN(price)) return "-";
                      return eventData.includeGst
                        ? (price * 1.18).toFixed(2)
                        : price.toFixed(2);
                    })()
                  }
                  {eventData.includeGst ? " (incl. 18% GST)" : " (no GST)"}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                value={eventData.capacity}
                onChange={handleChange}
                type="number"
                placeholder="e.g., 2000"
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeGst"
                checked={eventData.includeGst}
                onCheckedChange={handleGstChange}
              />
              <Label
                htmlFor="includeGst"
                className="text-sm font-medium leading-none"
              >
                Apply 18% GST to the ticket price
              </Label>
            </div>
            <p className="text-xs text-gray-500 pl-6">
              If checked, the final price will include Goods and Services
              Tax.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-poster">Event Poster</Label>
            <Input
              id="event-poster"
              type="file"
              className="file:text-blue-700 file:font-semibold"
            />
            <p className="text-xs text-gray-500">
              Upload an image for the event (e.g., JPG, PNG).
            </p>
          </div>
        </CardContent>
        <CardContent className="text-right">
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Event
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
