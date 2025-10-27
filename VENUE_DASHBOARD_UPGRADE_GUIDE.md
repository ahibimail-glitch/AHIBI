# Venue Dashboard Upgrade Guide

## Summary
The venue dashboard at `/venue/dashboard` needs to be upgraded with all features from the Aiko Hall admin dashboard to provide a comprehensive management interface.

---

## ✅ Already Implemented

1. **Basic Structure**
   - Authentication check with `useVenueAuth`
   - Data fetching (venue, stats, bookings)
   - Profile update functionality
   - Basic booking action handler

2. **State Management**
   - Added dialog states (`showSettingsDialog`, `showBookingDialog`)
   - Added filtering states (`searchTerm`, `statusFilter`)
   - Added `activeTab` for tab navigation
   - Added `bookingAction` state for booking management

3. **Helper Functions**
   - `exportBookings()` - CSV export functionality
   - `getStatusBadge()` - Status badge rendering
   - `filteredBookings` - Search and filter logic
   - Updated `handleBookingAction()` - Dialog-based booking management

---

## 🔧 Required UI Updates

### 1. Header Section (Replace existing header)
```tsx
{/* Header */}
<div className="flex justify-between items-center mb-6">
  <div>
    <h2 className="text-2xl font-bold text-gray-900">{venueData?.name} Management</h2>
    <p className="text-gray-600">Manage bookings and settings for your venue</p>
  </div>
  <div className="flex space-x-2">
    <Button onClick={exportBookings} variant="outline">
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
    <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
      <DialogTrigger asChild>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        {/* Settings form content - see below */}
      </DialogContent>
    </Dialog>
  </div>
</div>
```

### 2. Tabs Structure (Replace existing tabs)
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="bookings">Bookings</TabsTrigger>
    <TabsTrigger value="calendar">Calendar</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>

  {/* Tab contents - see below */}
</Tabs>
```

### 3. Overview Tab
```tsx
<TabsContent value="overview" className="space-y-6">
  {/* Stats Cards */}
  {stats && (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalBookings}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingBookings}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{stats.totalRevenue?.toLocaleString()}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.monthlyBookings}</div>
        </CardContent>
      </Card>
    </div>
  )}

  {/* Venue Information Card */}
  {venueData && (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Building2 className="h-5 w-5 mr-2" />
          Venue Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Contact Information</h4>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Phone:</strong> {venueData.contactInfo.phone}
            </p>
            {venueData.contactInfo.email && (
              <p className="text-sm text-gray-600 mb-1">
                <strong>Email:</strong> {venueData.contactInfo.email}
              </p>
            )}
            <p className="text-sm text-gray-600">
              <strong>Address:</strong> {venueData.address.street}, {venueData.address.city}, {venueData.address.state} - {venueData.address.pincode}
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Venue Details</h4>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Max Capacity:</strong> {venueData.capacity} guests
            </p>
            <p className="text-sm text-gray-600 mb-1">
              <strong>Price:</strong> ₹{venueData.pricing.hourlyRate || venueData.pricing.basePrice}/hour
            </p>
            <p className="text-sm text-gray-600">
              <strong>Total Bookings:</strong> {venueData.totalBookings}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )}
</TabsContent>
```

### 4. Bookings Tab with Search & Filter
```tsx
<TabsContent value="bookings" className="space-y-4">
  {/* Filters */}
  <div className="flex flex-col sm:flex-row gap-4">
    <div className="flex-1">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search bookings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="w-full sm:w-48">
        <SelectValue placeholder="Filter by status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Status</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
        <SelectItem value="confirmed">Confirmed</SelectItem>
        <SelectItem value="rejected">Rejected</SelectItem>
        <SelectItem value="cancelled">Cancelled</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Bookings Table */}
  <Card>
    <CardHeader>
      <CardTitle>Bookings ({filteredBookings.length})</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBookings.map((booking) => (
              <TableRow key={booking._id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{booking.user?.name || 'Unknown User'}</div>
                    <div className="text-sm text-gray-500">{booking.user?.phone || 'No phone'}</div>
                    <div className="text-sm text-gray-500">{booking.user?.email || 'No email'}</div>
                  </div>
                  {booking.specialRequirements && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center text-xs text-blue-600 hover:underline cursor-pointer mt-1">
                          <FileText className="h-3 w-3 mr-1" />
                          View Notes
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs whitespace-pre-wrap">{booking.specialRequirements}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {format(new Date(booking.bookingDate), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.startTime} - {booking.endTime}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{booking.duration} hours</TableCell>
                <TableCell>{booking.guestCount}</TableCell>
                <TableCell>₹{booking.pricing?.totalAmount?.toLocaleString()}</TableCell>
                <TableCell>{getStatusBadge(booking.status)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedBooking(booking);
                      setBookingAction({
                        status: booking.status,
                        rejectionReason: booking.rejectionReason || "",
                        venueNotes: booking.venueNotes || ""
                      });
                      setShowBookingDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

### 5. Calendar Tab
```tsx
<TabsContent value="calendar" className="space-y-4">
  <Card>
    <CardHeader>
      <CardTitle>Booking Calendar</CardTitle>
      <CardDescription>View all bookings in calendar format</CardDescription>
    </CardHeader>
    <CardContent>
      <CalendarComponent
        mode="multiple"
        selected={bookings
          .filter(b => b.status === 'confirmed' || b.status === 'pending')
          .map(b => new Date(b.bookingDate))
        }
        className="rounded-md border"
      />
    </CardContent>
  </Card>
</TabsContent>
```

### 6. Booking Action Dialog
```tsx
<Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Manage Booking</DialogTitle>
      <DialogDescription>
        Update booking status and add notes
      </DialogDescription>
    </DialogHeader>
    {selectedBooking && (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Customer</Label>
            <p className="text-sm font-medium">{selectedBooking.user?.name || 'Unknown User'}</p>
            <p className="text-sm text-gray-500">{selectedBooking.user?.phone || 'No phone'}</p>
          </div>
          <div>
            <Label>Event Details</Label>
            <p className="text-sm font-medium">
              {format(new Date(selectedBooking.bookingDate), 'MMM dd, yyyy')}
            </p>
            <p className="text-sm text-gray-500">
              {selectedBooking.startTime} - {selectedBooking.endTime}
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={bookingAction.status} onValueChange={(value) => setBookingAction({
            ...bookingAction,
            status: value
          })}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {bookingAction.status === 'rejected' && (
          <div>
            <Label htmlFor="rejectionReason">Rejection Reason</Label>
            <Textarea
              id="rejectionReason"
              value={bookingAction.rejectionReason}
              onChange={(e) => setBookingAction({
                ...bookingAction,
                rejectionReason: e.target.value
              })}
              rows={3}
            />
          </div>
        )}

        <div>
          <Label htmlFor="venueNotes">Venue Notes</Label>
          <Textarea
            id="venueNotes"
            value={bookingAction.venueNotes}
            onChange={(e) => setBookingAction({
              ...bookingAction,
              venueNotes: e.target.value
            })}
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleBookingAction} disabled={updating}>
            {updating ? 'Updating...' : 'Update Booking'}
          </Button>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

---

## 📝 Implementation Steps

1. **Update Imports** ✅ (Already done)
   - Added Dialog, Select, Tooltip components
   - Added new icons (Building2, BarChart3, Download, Edit, etc.)

2. **Update State** ✅ (Already done)
   - Added dialog states
   - Added filter states
   - Added booking action state

3. **Update Functions** ✅ (Already done)
   - Updated `handleBookingAction()`
   - Added `exportBookings()`
   - Added `getStatusBadge()`
   - Added `filteredBookings`

4. **Update UI** ⏳ (Needs to be done)
   - Replace header section
   - Update tabs structure
   - Add Overview tab with stats cards
   - Update Bookings tab with search/filter
   - Add Calendar tab
   - Add Booking Action Dialog

---

## 🎯 Key Features to Add

### Overview Tab
- ✅ Stats cards (Total, Pending, Revenue, Monthly)
- ✅ Venue information display
- ✅ Contact details

### Bookings Tab
- ✅ Search functionality
- ✅ Status filter dropdown
- ✅ Enhanced table with all booking details
- ✅ Tooltip for special requirements
- ✅ Edit button for each booking

### Calendar Tab
- ✅ Visual calendar with booked dates
- ✅ Multiple date selection display

### Booking Management
- ✅ Dialog-based booking editing
- ✅ Status dropdown
- ✅ Rejection reason (conditional)
- ✅ Venue notes
- ✅ Update functionality

### Export
- ✅ CSV export with all booking details
- ✅ Formatted filename with venue name and date

---

## 🔄 Migration Notes

The current venue dashboard has basic functionality. The upgrade adds:

1. **Better Organization**: Tabs for different sections
2. **Advanced Filtering**: Search and status filters
3. **Enhanced UI**: Dialog-based editing instead of inline
4. **Export Capability**: CSV export for reporting
5. **Visual Calendar**: See all bookings at a glance
6. **Better Stats**: Comprehensive dashboard stats

All backend APIs are already in place. Only frontend UI needs to be updated.

---

## ✅ Testing Checklist

After implementation:
- [ ] Overview tab shows correct stats
- [ ] Bookings tab displays all bookings
- [ ] Search filters bookings correctly
- [ ] Status filter works
- [ ] Edit booking opens dialog
- [ ] Status can be updated
- [ ] Rejection reason shows when status is rejected
- [ ] CSV export downloads correctly
- [ ] Calendar shows booked dates
- [ ] Settings dialog works (if implemented)

---

## 🚀 Status

**Backend**: ✅ Complete
**Frontend State**: ✅ Complete  
**Frontend UI**: ⏳ Needs implementation (follow guide above)

The venue dashboard now has all the logic and state management. Just need to update the JSX to match the Aiko Hall admin dashboard UI.
