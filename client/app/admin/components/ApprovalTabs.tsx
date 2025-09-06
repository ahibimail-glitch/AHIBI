"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Palette, MapPin, Calendar } from "lucide-react";
import OrganizerApprovalList from "./OrganizerApprovalList";
import ArtistApprovalList from "./ArtistApprovalList";
import VenueApprovalList from "./VenueApprovalList";
import EventApprovalList from "./EventApprovalList";

export default function ApprovalTabs() {
  const [activeTab, setActiveTab] = useState("organizers");

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organizers" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span>Organizers</span>
          </TabsTrigger>
          <TabsTrigger value="artists" className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Artists</span>
          </TabsTrigger>
          <TabsTrigger value="venues" className="flex items-center space-x-2">
            <MapPin className="h-4 w-4" />
            <span>Venues</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Events</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="organizers" className="mt-6">
          <OrganizerApprovalList />
        </TabsContent>
        
        <TabsContent value="artists" className="mt-6">
          <ArtistApprovalList />
        </TabsContent>
        
        <TabsContent value="venues" className="mt-6">
          <VenueApprovalList />
        </TabsContent>
        
        <TabsContent value="events" className="mt-6">
          <EventApprovalList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
