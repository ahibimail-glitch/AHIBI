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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  CreditCard,
  Heart,
  Ticket,
  Settings,
  Camera,
  Edit,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "../Navbar";
import Footer from "../Footer";

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+91 9876543210",
    city: "Mumbai",
    bio: "Event enthusiast who loves discovering new experiences and connecting with like-minded people.",
    dateOfBirth: "1990-05-15",
    gender: "male",
    interests: ["Music", "Technology", "Food", "Art"],
    avatar: "/images/carausel1.jpg?height=100&width=100",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    eventRecommendations: true,
    promotionalEmails: false,
    weeklyDigest: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: "public",
    showAttendedEvents: true,
    showInterests: true,
    allowMessages: true,
  });

  const recentBookings = [
    {
      id: 1,
      event: "Summer Music Festival 2024",
      date: "July 15, 2024",
      status: "confirmed",
      amount: "₹1,500",
      image: "/images/carausel1.jpg?height=60&width=80",
    },
    {
      id: 2,
      event: "Tech Conference 2024",
      date: "August 20, 2024",
      status: "upcoming",
      amount: "₹2,500",
      image: "/images/carausel1.jpg?height=60&width=80",
    },
    {
      id: 3,
      event: "Comedy Night Special",
      date: "June 10, 2024",
      status: "completed",
      amount: "₹800",
      image: "/images/carausel1.jpg?height=60&width=80",
    },
  ];

  const savedEvents = [
    {
      id: 1,
      title: "Jazz Night Under Stars",
      date: "July 22, 2024",
      price: "₹800",
      image: "/images/carausel1.jpg?height=100&width=150",
    },
    {
      id: 2,
      title: "Food & Wine Festival",
      date: "August 5, 2024",
      price: "₹1,200",
      image: "/images/carausel1.jpg?height=100&width=150",
    },
    {
      id: 3,
      title: "Art Exhibition Opening",
      date: "August 10, 2024",
      price: "₹500",
      image: "/images/carausel1.jpg?height=100&width=150",
    },
  ];

  const handleSaveProfile = () => {
    // Save profile data
    setIsEditing(false);
  };

  const handleInterestToggle = (interest: string) => {
    setProfileData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const availableInterests = [
    "Music",
    "Comedy",
    "Technology",
    "Food",
    "Art",
    "Dance",
    "Sports",
    "Theater",
    "Literature",
    "Photography",
    "Travel",
    "Fashion",
    "Gaming",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-0 z-50">
        <Navbar />
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Profile Header */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage
                    src={profileData.avatar || "/images/carausel1.jpg"}
                  />
                  <AvatarFallback>
                    {profileData.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">{profileData.name}</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    {isEditing ? "Cancel" : "Edit Profile"}
                  </Button>
                </div>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-1" />
                    {profileData.email}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {profileData.city}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Member since 2024
                  </div>
                </div>
                <p className="text-muted-foreground mb-3">{profileData.bio}</p>
                <div className="flex flex-wrap gap-2">
                  {profileData.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="saved">Saved Events</TabsTrigger>
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Ticket className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-sm text-muted-foreground">
                    Events Attended
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-2xl font-bold">8</p>
                  <p className="text-sm text-muted-foreground">Saved Events</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">₹18,500</p>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-2xl font-bold">3</p>
                  <p className="text-sm text-muted-foreground">
                    Upcoming Events
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Bookings</CardTitle>
                  <CardDescription>Your latest event bookings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center space-x-4 p-3 border rounded-lg"
                    >
                      <Image
                        src={booking.image || "/images/carausel1.jpg"}
                        alt={booking.event}
                        width={80}
                        height={60}
                        className="w-12 h-9 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{booking.event}</h3>
                        <p className="text-xs text-muted-foreground">
                          {booking.date}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "upcoming"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {booking.status}
                          </Badge>
                          <span className="text-sm font-medium">
                            {booking.amount}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    asChild
                  >
                    <Link href="/bookings">View All Bookings</Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommended for You</CardTitle>
                  <CardDescription>Based on your interests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {savedEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center space-x-4 p-3 border rounded-lg"
                    >
                      <Image
                        src={event.image || "/images/carausel1.jpg"}
                        alt={event.title}
                        width={150}
                        height={100}
                        className="w-12 h-9 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{event.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {event.date}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-sm font-medium text-primary">
                            {event.price}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-xs bg-transparent"
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full bg-transparent"
                    asChild
                  >
                    <Link href="/events">Discover More Events</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>
                  All your event bookings and tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Image
                          src={booking.image || "/images/carausel1.jpg"}
                          alt={booking.event}
                          width={80}
                          height={60}
                          className="w-16 h-12 rounded object-cover"
                        />
                        <div>
                          <h3 className="font-semibold">{booking.event}</h3>
                          <p className="text-sm text-muted-foreground">
                            {booking.date}
                          </p>
                          <Badge
                            variant={
                              booking.status === "confirmed"
                                ? "default"
                                : booking.status === "upcoming"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{booking.amount}</p>
                        <div className="flex space-x-2 mt-2">
                          <Button size="sm" variant="outline">
                            View Ticket
                          </Button>
                          {booking.status === "upcoming" && (
                            <Button size="sm">Download QR</Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved">
            <Card>
              <CardHeader>
                <CardTitle>Saved Events</CardTitle>
                <CardDescription>
                  Events you've bookmarked for later
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border rounded-lg overflow-hidden"
                    >
                      <Image
                        src={event.image || "/images/carausel1.jpg"}
                        alt={event.title}
                        width={150}
                        height={100}
                        className="w-full h-24 object-cover"
                      />
                      <div className="p-3">
                        <h3 className="font-medium text-sm mb-1">
                          {event.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {event.date}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-primary">
                            {event.price}
                          </span>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs bg-transparent"
                            >
                              <Heart className="h-3 w-3" />
                            </Button>
                            <Button size="sm" className="h-6 text-xs">
                              Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Manage your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) =>
                        setProfileData({ ...profileData, name: e.target.value })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          email: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Input
                        id="phone"
                        type={showPhone ? "text" : "password"}
                        value={profileData.phone}
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            phone: e.target.value,
                          })
                        }
                        disabled={!isEditing}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPhone(!showPhone)}
                      >
                        {showPhone ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Select
                      value={profileData.city}
                      onValueChange={(value) =>
                        setProfileData({ ...profileData, city: value })
                      }
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mumbai">Mumbai</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Bangalore">Bangalore</SelectItem>
                        <SelectItem value="Pune">Pune</SelectItem>
                        <SelectItem value="Chennai">Chennai</SelectItem>
                        <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">Date of Birth</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={profileData.dateOfBirth}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          dateOfBirth: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={profileData.gender}
                      onValueChange={(value) =>
                        setProfileData({ ...profileData, gender: value })
                      }
                      disabled={!isEditing}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({ ...profileData, bio: e.target.value })
                    }
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Interests</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableInterests.map((interest) => (
                      <Badge
                        key={interest}
                        variant={
                          profileData.interests.includes(interest)
                            ? "default"
                            : "outline"
                        }
                        className={`cursor-pointer ${
                          !isEditing ? "pointer-events-none" : ""
                        }`}
                        onClick={() =>
                          isEditing && handleInterestToggle(interest)
                        }
                      >
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex space-x-2">
                    <Button onClick={handleSaveProfile}>
                      <Save className="h-4 w-4 mr-1" />
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose how you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-notifications">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates via email
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={preferences.emailNotifications}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          emailNotifications: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sms-notifications">
                        SMS Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates via SMS
                      </p>
                    </div>
                    <Switch
                      id="sms-notifications"
                      checked={preferences.smsNotifications}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          smsNotifications: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="push-notifications">
                        Push Notifications
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive browser notifications
                      </p>
                    </div>
                    <Switch
                      id="push-notifications"
                      checked={preferences.pushNotifications}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          pushNotifications: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="event-recommendations">
                        Event Recommendations
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Get personalized event suggestions
                      </p>
                    </div>
                    <Switch
                      id="event-recommendations"
                      checked={preferences.eventRecommendations}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          eventRecommendations: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="promotional-emails">
                        Promotional Emails
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Receive offers and promotions
                      </p>
                    </div>
                    <Switch
                      id="promotional-emails"
                      checked={preferences.promotionalEmails}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          promotionalEmails: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-digest">Weekly Digest</Label>
                      <p className="text-sm text-muted-foreground">
                        Weekly summary of events
                      </p>
                    </div>
                    <Switch
                      id="weekly-digest"
                      checked={preferences.weeklyDigest}
                      onCheckedChange={(checked) =>
                        setPreferences({
                          ...preferences,
                          weeklyDigest: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control your privacy and visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-visibility">Profile Visibility</Label>
                  <Select
                    value={privacy.profileVisibility}
                    onValueChange={(value) =>
                      setPrivacy({ ...privacy, profileVisibility: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-attended">Show Attended Events</Label>
                    <p className="text-sm text-muted-foreground">
                      Display events you've attended
                    </p>
                  </div>
                  <Switch
                    id="show-attended"
                    checked={privacy.showAttendedEvents}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, showAttendedEvents: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-interests">Show Interests</Label>
                    <p className="text-sm text-muted-foreground">
                      Display your interests publicly
                    </p>
                  </div>
                  <Switch
                    id="show-interests"
                    checked={privacy.showInterests}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, showInterests: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="allow-messages">Allow Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Let others send you messages
                    </p>
                  </div>
                  <Switch
                    id="allow-messages"
                    checked={privacy.allowMessages}
                    onCheckedChange={(checked) =>
                      setPrivacy({ ...privacy, allowMessages: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Phone Number Verified</p>
                        <p className="text-sm text-muted-foreground">
                          Your phone number is verified
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Verified</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Email Verified</p>
                        <p className="text-sm text-muted-foreground">
                          Your email is verified
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Verified</Badge>
                  </div>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">
                          Add extra security to your account
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Enable
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Account Actions</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Change Phone Number
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Change Email Address
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start bg-transparent"
                    >
                      Download My Data
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                    >
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
