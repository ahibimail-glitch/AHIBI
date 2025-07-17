"use client";

import { useState } from "react";
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
  const [eventData, setEventData] = useState({
    eventName: "",
    description: "",
    venue: "",
    startDate: "",
    endDate: "",
    category: "",
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Submitting New Event:", eventData);
    alert(`Event "${eventData.eventName}" created successfully!`);
    // Reset form and navigate away
    setEventData({
      eventName: "",
      description: "",
      venue: "",
      startDate: "",
      endDate: "",
      category: "",
      ticketPrice: "",
      capacity: "",
      includeGst: false,
    });
    if (onSuccess) {
      onSuccess();
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
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                value={eventData.venue}
                onChange={handleChange}
                placeholder="e.g., City Convention Center"
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
              <Label htmlFor="ticketPrice">Ticket Price (₹)</Label>
              <Input
                id="ticketPrice"
                value={eventData.ticketPrice}
                onChange={handleChange}
                type="number"
                placeholder="e.g., 500"
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
          <Button type="submit">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Event
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
