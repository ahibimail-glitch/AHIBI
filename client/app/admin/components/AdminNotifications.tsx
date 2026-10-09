"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Bell,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
  AlertTriangle,
  Clock,
  Eye,
  Archive,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Users,
  Music,
  Building2,
  Calendar,
  Trophy,
  Ticket,
  CreditCard,
  HeadphonesIcon,
  User,
  Settings,
  ExternalLink,
} from "lucide-react";

interface AdminNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  status: "unread" | "read" | "archived";
  actionRequired: boolean;
  actionType: string;
  entityType?: string;
  entityId?: string;
  triggeredBy?: {
    userType?: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata?: Record<string, unknown>;
  redirectUrl?: string;
  createdAt: string;
}

interface NotificationStats {
  totalUnread: number;
  totalActionRequired: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  byCategory: Record<string, { total: number; unread: number }>;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

const categoryIcons: Record<string, React.ElementType> = {
  organizer: Users,
  artist: Music,
  venue: Building2,
  event: Calendar,
  sports: Trophy,
  booking: Ticket,
  payment: CreditCard,
  support: HeadphonesIcon,
  user: User,
  system: Settings,
};

// New: both badge and row accent styles per priority for clearer visual hierarchy
const priorityStyles: Record<string, { badge: string; accent: string; iconColor: string }> = {
  low: { badge: "bg-gray-100 text-gray-800", accent: "border-l-4 border-gray-300 bg-white", iconColor: "text-gray-500" },
  medium: { badge: "bg-blue-100 text-blue-800", accent: "border-l-4 border-blue-400 bg-blue-50/40", iconColor: "text-blue-500" },
  high: { badge: "bg-orange-100 text-orange-800", accent: "border-l-4 border-orange-400 bg-orange-50/40", iconColor: "text-orange-500" },
  urgent: { badge: "bg-red-100 text-red-800", accent: "border-l-4 border-red-500 bg-red-50/40", iconColor: "text-red-500" },
};

const typeLabels: Record<string, string> = {
  organizer_registration: "New Organizer",
  artist_registration: "New Artist",
  venue_registration: "New Venue",
  event_created: "New Event",
  event_updated: "Event Updated",
  sports_partner_registration: "New Sports Partner",
  sports_venue_created: "New Sports Venue",
  court_created: "New Court",
  booking_created: "New Booking",
  payment_failed: "Payment Failed",
  support_ticket_created: "Support Ticket",
  user_registered: "New User",
  system_alert: "System Alert",
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("unread");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Fetching admin notifications...');
      
      const token = localStorage.getItem("admin_token");
      if (!token) throw new Error("Admin authentication required");

      const params: Record<string, string> = {};
      if (categoryFilter !== "all") params.category = categoryFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      params.page = page.toString();
      params.limit = limit.toString();

      console.log('Notifications API params:', params);

      const response = await fetch(`/api/admin/notifications?${new URLSearchParams(params)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Notifications API response:', await response.json());

      if (!response.ok) {
        throw new Error((await response.json())?.message || "Failed to fetch notifications");
      }

      const data = await response.json();
      const notificationsData = data.data.notifications || [];
      console.log('Notifications data:', notificationsData);
      setNotifications(notificationsData);
      setTotalPages(data.data.pagination?.pages || 1);
      setTotal(data.data.pagination?.total || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, categoryFilter, statusFilter, priorityFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const response = await fetch(`/api/admin/notifications/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchStats();
  }, [fetchNotifications, fetchStats]);

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/notifications/${id}/archive`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error("Error archiving notification:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const token = localStorage.getItem("admin_token");
      await fetch(`/api/admin/notifications/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchNotifications();
      fetchStats();
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const openNotificationDetail = (notification: AdminNotification) => {
    setSelectedNotification(notification);
    setShowDetailDialog(true);
    if (notification.status === "unread") {
      markAsRead(notification._id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getCategoryIcon = (category: string) => {
    const Icon = categoryIcons[category] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const getPriorityIcon = (priority: string) => {
    const colorClass = priorityStyles[priority]?.iconColor || "text-gray-500";
    switch (priority) {
      case "urgent":
        return <AlertCircle className={`h-4 w-4 ${colorClass}`} />;
      case "high":
        return <AlertTriangle className={`h-4 w-4 ${colorClass}`} />;
      case "medium":
        return <Info className={`h-4 w-4 ${colorClass}`} />;
      default:
        return <CheckCircle className={`h-4 w-4 ${colorClass}`} />;
    }
  };

  // Build row classes: actionRequired rows get an accent left border and soft bg
  const getRowClass = (notification: AdminNotification) => {
    const base = `cursor-pointer transition-shadow duration-150 hover:shadow-sm`;
    const unread = notification.status === "unread" ? "bg-blue-50/40" : "bg-white";
    const priority = priorityStyles[notification.priority] || priorityStyles["low"];
    const actionAccent = notification.actionRequired ? `${priority.accent}` : `hover:bg-gray-50`;
    return `${base} ${unread} ${actionAccent} rounded-md overflow-hidden`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-600 font-medium">Unread</p>
                <p className="text-2xl font-bold text-red-700">{stats?.totalUnread || 0}</p>
              </div>
              <Bell className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-orange-600 font-medium">Action Required</p>
                <p className="text-2xl font-bold text-orange-700">{stats?.totalActionRequired || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 font-medium">Today</p>
                <p className="text-2xl font-bold text-blue-700">{stats?.todayCount || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 font-medium">This Week</p>
                <p className="text-2xl font-bold text-green-700">{stats?.weekCount || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 font-medium">This Month</p>
                <p className="text-2xl font-bold text-purple-700">{stats?.monthCount || 0}</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 font-medium">Total</p>
                <p className="text-2xl font-bold text-gray-700">{total}</p>
              </div>
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

   

      {/* Filters and Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="venue">Venue</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="sports">Sports</SelectItem>
                  <SelectItem value="booking">Booking</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { fetchNotifications(); fetchStats(); }}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark All Read
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardContent className="pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Bell className="h-12 w-12 mb-4 text-gray-300" />
              <p>No notifications found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Notification</TableHead>
                    <TableHead className="w-28">Category</TableHead>
                    <TableHead className="w-24">Priority</TableHead>
                    <TableHead className="w-32">From</TableHead>
                    <TableHead className="w-28">Time</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map((notification) => (
                    <TableRow
                      key={notification._id}
                      className={getRowClass(notification)}
                      onClick={() => openNotificationDetail(notification)}
                    >
                      <TableCell>
                        <div className="flex items-center">
                          {notification.status === "unread" && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                          )}
                          {getPriorityIcon(notification.priority)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className={`font-medium ${notification.status === "unread" ? "text-gray-900" : "text-gray-600"}`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 truncate max-w-md">
                            {notification.message}
                          </p>
                          {notification.actionRequired && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              Action Required
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {getCategoryIcon(notification.category)}
                          <span className="capitalize">{notification.category}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={priorityStyles[notification.priority].badge}>
                          {notification.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium truncate max-w-24">
                            {notification.triggeredBy?.name || "System"}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {notification.triggeredBy?.userType || ""}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {formatDate(notification.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openNotificationDetail(notification)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => archiveNotification(notification._id)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => deleteNotification(notification._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} notifications
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedNotification && getCategoryIcon(selectedNotification.category)}
              {selectedNotification?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedNotification && formatDate(selectedNotification.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={priorityStyles[selectedNotification.priority].badge}>
                  {selectedNotification.priority} priority
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {selectedNotification.category}
                </Badge>
                {selectedNotification.actionRequired && (
                  <Badge variant="destructive">Action Required</Badge>
                )}
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700">{selectedNotification.message}</p>
              </div>

              {selectedNotification.triggeredBy && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Triggered By</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>{" "}
                      <span className="font-medium">{selectedNotification.triggeredBy.name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>{" "}
                      <span className="font-medium capitalize">{selectedNotification.triggeredBy.userType || "N/A"}</span>
                    </div>
                    {selectedNotification.triggeredBy.email && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Email:</span>{" "}
                        <span className="font-medium">{selectedNotification.triggeredBy.email}</span>
                      </div>
                    )}
                    {selectedNotification.triggeredBy.phone && (
                      <div className="col-span-2">
                        <span className="text-gray-500">Phone:</span>{" "}
                        <span className="font-medium">{selectedNotification.triggeredBy.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Additional Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{" "}
                        <span className="font-medium">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => archiveNotification(selectedNotification._id)}
                  >
                    <Archive className="h-4 w-4 mr-1" />
                    Archive
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-600"
                    onClick={() => {
                      deleteNotification(selectedNotification._id);
                      setShowDetailDialog(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedNotification.actionRequired && (
                    <Button size="sm" onClick={() => {
                      // placeholder for resolving action. You can wire this to your resolver endpoint
                      archiveNotification(selectedNotification._id);
                      setShowDetailDialog(false);
                    }}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Resolve
                    </Button>
                  )}

                  {selectedNotification.redirectUrl && (
                    <Button
                      size="sm"
                      onClick={() => {
                        window.location.href = selectedNotification.redirectUrl!;
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
