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
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Save, RefreshCw, Bell, Shield, Globe } from "lucide-react";

export default function Settings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "Ahibi Events",
    siteDescription: "Your one-stop platform for event discovery and booking",
    contactEmail: "support@ahibi.com",
    contactPhone: "+91 98765 43210",
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: true,
    pushNotifications: false,
    marketingEmails: true,
  });

    const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setGeneralSettings((prev) => ({ ...prev, [id]: value }));
  };

  const handleNotificationChange = (id: string, checked: boolean) => {
    setNotificationSettings((prev) => ({ ...prev, [id]: checked }));
  };

  const handleSaveSettings = () => {
    console.log("Saving settings:", {
      generalSettings,
      notificationSettings,
    });
    alert("Settings saved successfully!");
  };

  const handleChangePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("The new passwords do not match.");
      return;
    }
    const token = localStorage.getItem("admin_token");
    if (!token) {
      setPasswordError("Your admin session is missing. Sign in again and retry.");
      return;
    }

    setPasswordBusy(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/admin/password`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to change password.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password changed. All admin sessions are being signed out; sign in with your new password.");
      window.setTimeout(() => {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_id");
        localStorage.removeItem("admin_username");
        window.location.assign("/admin/login");
      }, 1800);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general">
            <Globe className="h-4 w-4 mr-2" /> General
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure basic information about your platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input
                    id="siteName"
                    value={generalSettings.siteName}
                    onChange={handleGeneralChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={generalSettings.contactEmail}
                    onChange={handleGeneralChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={generalSettings.siteDescription}
                  onChange={handleGeneralChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={generalSettings.contactPhone}
                    onChange={handleGeneralChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <select
                    id="timezone"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when notifications are sent.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive important updates via email
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("emailNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive important updates via SMS
                    </p>
                  </div>
                  <Switch
                    id="smsNotifications"
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("smsNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="pushNotifications">Push Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive push notifications on your devices
                    </p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={notificationSettings.pushNotifications}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("pushNotifications", checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="marketingEmails">Marketing Emails</Label>
                    <p className="text-sm text-gray-500">
                      Receive promotional content and newsletters
                    </p>
                  </div>
                  <Switch
                    id="marketingEmails"
                    checked={notificationSettings.marketingEmails}
                    onCheckedChange={(checked) =>
                      handleNotificationChange("marketingEmails", checked)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security options for your platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleChangePassword} className="max-w-xl space-y-4 rounded-lg border border-gray-200 p-4">
                <div>
                  <h3 className="font-semibold">Change admin password</h3>
                  <p className="mt-1 text-sm text-gray-500">Use a private password with at least 12 characters. Changing it signs out all admin sessions.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminCurrentPassword">Current password</Label>
                  <Input id="adminCurrentPassword" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminNewPassword">New password</Label>
                  <Input id="adminNewPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adminConfirmPassword">Confirm new password</Label>
                  <Input id="adminConfirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                </div>
                {passwordError && <p role="alert" className="text-sm text-red-600">{passwordError}</p>}
                {passwordMessage && <p role="status" className="text-sm text-green-700">{passwordMessage}</p>}
                <Button type="submit" disabled={passwordBusy || newPassword.length < 12 || !currentPassword || !confirmPassword}>
                  {passwordBusy ? "Changing password…" : "Change password"}
                </Button>
              </form>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="twoFactorAuth" />
                    <Label htmlFor="twoFactorAuth">Enable for all admins</Label>
                  </div>
                  <p className="text-sm text-gray-500">
                    Require two-factor authentication for all admin users
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>API Access</Label>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      Manage API Keys
                    </Button>
                    <Button variant="outline" size="sm">
                      View API Logs
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Session Management</Label>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" /> Revoke All Sessions
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500">
                    Force all users to log in again
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSaveSettings}>
          <Save className="h-4 w-4 mr-2" /> Save Settings
        </Button>
      </div>
    </div>
  );
}
