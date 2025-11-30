"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from 'next/navigation';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Ticket, CheckCircle, Download as DownloadIcon, Calendar, Clock, QrCode } from "lucide-react";
import axios from 'axios';
import InvoiceGenerator from '@/components/invoice-generator';

interface TicketType {
  _id?: string;
  name: string;
  price: number;
  description?: string;
  sold?: number;
  capacity?: number;
}

interface EventItem {
  _id: string;
  title: string;
  ticketTypes: TicketType[];
  startDate: string;
  endDate?: string;
  location?: {
    address?: string;
    city?: string;
  };
}

interface User {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface TicketItem {
  ticketType: string;
  quantity: number;
  price: number;
}

interface BookingFormData {
  event: string;
  user: string;
  ticketType: string;
  quantity: number;
  price: number;
  total: number;
  customerName?: string;
  customerPhone?: string;
  country?: string;
  state?: string;
  modeOfPayment?: string;
}

const ManualBooking: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [invoiceList, setInvoiceList] = useState<any[] | null>(null);
  const [qrValue, setQrValue] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase().trim();
    return users.filter(user => 
      (user.name?.toLowerCase().includes(query) || '') || 
      (user.phone?.includes(query) || '') ||
      (user.email?.toLowerCase().includes(query) || '')
    );
  }, [users, searchQuery]);

  // Handle user selection
  const handleUserSelect = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      user: userId
    }));
    setSearchQuery('');
    setOpen(false);
  };

  // Update search query and reset form user if search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value && formData.user) {
      setFormData(prev => ({
        ...prev,
        user: ''
      }));
    }
  };

  const [formData, setFormData] = useState<BookingFormData>({
    event: "",
    user: "",
    ticketType: "",
    quantity: 1,
    price: 0,
    total: 0,
    modeOfPayment: ""
  });

  const [ticketItems, setTicketItems] = useState<TicketItem[]>([{ ticketType: "", quantity: 1, price: 0 }]);

  // HMF event IDs
  const HMF_IDS = useMemo(() => ([
    "691b1066a9a25d4fec36f96c",
    "691b13caa9a25d4fec36fa70",
    "691b146fa9a25d4fec36fb25",
    "691b14f1a9a25d4fec36fbd7",
    "691b156ea9a25d4fec36fc8d",
    "691b15c5a9a25d4fec36fd3a",
    "691b15faa9a25d4fec36fd3f",
    "691b162ca9a25d4fec36fd44",
    "691b1771a9a25d4fec36feaf",
  ]), []);

  const isHMFSelected = useMemo(() => !!formData.event && HMF_IDS.includes(formData.event), [formData.event, HMF_IDS]);

  // Country/State selection
  const countries = useMemo(() => {
    const list = [
      "India","Nepal","Bhutan","Bangladesh","Sri Lanka","Thailand","Myanmar","United States","United Kingdom","Australia","Canada"
    ];
    return Array.from(new Set(list)).sort((a,b)=>a.localeCompare(b));
  }, []);

  const indianStates = useMemo(() => [
    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh"
  ].sort((a,b)=>a.localeCompare(b)), []);

  const [paymentInfo] = useState({
    transactionId: `TXN${Date.now().toString().slice(-8)}`,
    status: 'success',
    method: 'Admin Generated'
  });

  const ticketRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Use the Next.js proxy route so we don't need CORS or a hardcoded backend URL
      const resp = await axios.get('/api/events?limit=1000');
      // Possible shapes: { events: [...] } or { data: { events: [...] } } or plain array
      const raw = resp.data?.events || resp.data?.data?.events || resp.data?.data || resp.data;
      const arr: EventItem[] = Array.isArray(raw) ? raw : (Array.isArray(resp.data) ? resp.data : []);

      // Exclude past events but include ongoing and same-day events (if no endDate)
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      const isUpcomingOrOngoing = (e: EventItem): boolean => {
        const start = e?.startDate ? new Date(e.startDate) : null;
        const end = e?.endDate ? new Date(e.endDate) : null;
        if (start && !isNaN(start.getTime())) {
          if (end && !isNaN(end.getTime())) {
            // Include if event hasn't ended yet
            return end >= now;
          }
          // No end date: include if start is today or in the future
          const startDay = new Date(start);
          startDay.setHours(0, 0, 0, 0);
          return startDay >= todayStart;
        }
        return false;
      };

      let upcoming = arr.filter(isUpcomingOrOngoing)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      // Fallback: if filtering removes everything (e.g., bad dates), show all to avoid empty list
      if (!upcoming.length) {
        upcoming = arr;
      }

      setEvents(upcoming);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching events', err);
      toast({ title: 'Error', description: 'Failed to load events', variant: 'destructive' });
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const token = localStorage.getItem('admin_token');
      const resp = await axios.get(`${apiUrl}/api/admin/users?limit=1000`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = resp.data?.data?.users || resp.data?.users || resp.data?.data || resp.data;
      if (Array.isArray(data)) setUsers(data);
      else setUsers([]);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching users', err);
      toast({ title: 'Error', description: 'Failed to load users', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleEventChange = (eventId: string) => {
    setFormData({ ...formData, event: eventId });
    const ev = events.find(e => e._id === eventId) || null;
    setSelectedEvent(ev);
    setTicketTypes(ev?.ticketTypes || []);
    // Reset ticket items when event changes
    setTicketItems([{ ticketType: '', quantity: 1, price: 0 }]);
    // Reset country/state/modeOfPayment when switching events
    setFormData(prev => ({ ...prev, country: undefined, state: undefined, modeOfPayment: undefined }));
  };

  const handleSelectChange = (field: keyof BookingFormData, value: any) => {
    setFormData({ ...formData, [field]: value } as any);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value } as any);
  };

  const handleTicketItemChange = (index: number, field: keyof TicketItem | 'price', value: any) => {
    const items = [...ticketItems];
    if (field === 'ticketType') {
      items[index].ticketType = value;
      const t = ticketTypes.find(tt => tt.name === value);
      items[index].price = t?.price || 0;
    } else if (field === 'quantity') {
      items[index].quantity = Number(value) || 1;
    } else if (field === 'price') {
      items[index].price = Number(value) || 0;
    }
    setTicketItems(items);
  };

  const addTicketItem = () => {
    setTicketItems([...ticketItems, { ticketType: '', quantity: 1, price: 0 }]);
  };

  const removeTicketItem = (index: number) => {
    const items = ticketItems.filter((_, i) => i !== index);
    setTicketItems(items.length ? items : [{ ticketType: '', quantity: 1, price: 0 }]);
  };

  const totalQuantity = useMemo(() => ticketItems.reduce((s, it) => s + (it.quantity || 0), 0), [ticketItems]);
  const computedTotal = useMemo(() => ticketItems.reduce((s, it) => s + (it.price || 0) * (it.quantity || 0), 0), [ticketItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.event || !formData.user) return toast({ title: 'Missing Data', description: 'Select event and user', variant: 'destructive' });
    if (isHMFSelected) {
      if (!formData.country || !formData.state) {
        return toast({ title: 'Country/State required', description: 'For HMF events, please provide both country and state/province.', variant: 'destructive' });
      }
      if (!formData.modeOfPayment) {
        return toast({ title: 'Mode of Payment required', description: 'For HMF events, please select a mode of payment.', variant: 'destructive' });
      }
    }

    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const ticketsPayload = ticketItems.map(it => ({ ticketType: it.ticketType, quantity: it.quantity, price: it.price }));

      const payload: any = {
        event: formData.event,
        user: formData.user,
        tickets: ticketsPayload,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        paymentMethod: paymentInfo.method,
        paymentStatus: paymentInfo.status,
        ...(formData.country ? { country: formData.country } : {}),
        ...(formData.state ? { state: formData.state } : {}),
        ...(formData.modeOfPayment ? { modeOfPayment: formData.modeOfPayment } : {}),
      };

      const resp = await axios.post(`${apiUrl}/api/bookings/admin-manual-booking`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = resp.data;
      setBookingResult(data);
      setSuccess(true);

      // Build invoice list from returned bookings array
      const bookings = data?.bookings || [];
      const userObj = users.find(u => u._id === formData.user);

      const invoices: any[] = bookings.map((b: any, idx: number) => ({
        bookingId: b.id || b._id || `${b.bookingId || 'bk'}_${idx}`,
        eventTitle: selectedEvent?.title || '',
        eventDate: selectedEvent?.startDate || new Date().toISOString(),
        eventTime: selectedEvent?.startDate || new Date().toISOString(),
        eventLocation: selectedEvent?.location?.address || '',
        seats: [{ id: b.id || b._id || `${b.bookingId || 'bk'}_${idx}`, price: b.price || b.amount || (ticketItems[idx]?.price || computedTotal) }],
        totalAmount: b.price || b.amount || (ticketItems[idx]?.price || computedTotal),
        transactionId: paymentInfo.transactionId,
        customerName: formData.customerName || userObj?.name,
        customerEmail: userObj?.email,
        customerPhone: formData.customerPhone || userObj?.phone,
        bookingDate: new Date().toISOString(),
        ticketType: b.ticketType || ticketItems[idx]?.ticketType
      }));

      setInvoiceList(invoices);
      setLoading(false);
    } catch (err: any) {
      console.error('Error creating booking:', err);
      toast({ title: 'Booking Failed', description: err?.response?.data?.message || err.message || 'An error occurred', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({ event: '', user: '', ticketType: '', quantity: 1, price: 0, total: 0 });
    setSelectedEvent(null);
    setSuccess(false);
    setBookingResult(null);
    setQrValue('');
    setTicketItems([{ ticketType: '', quantity: 1, price: 0 }]);
    setInvoiceList(null);
  };

  const downloadQRCode = async () => {
    // keep a placeholder implementation; invoice generator handles invoice download
    toast({ title: 'Info', description: 'Use the invoice download buttons to save invoices.' });
  };

  const formatDate = (date: string | number | Date) => new Date(date).toLocaleDateString();
  const formatTime = (date: string | number | Date) => new Date(date).toLocaleTimeString();
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Ticket className="h-5 w-5 mr-2" />
            Manual Ticket Booking
          </CardTitle>
          <CardDescription>Create tickets manually for users without payment processing</CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <div className="max-w-5xl mx-auto my-6 p-4">
              {invoiceList && invoiceList.length > 0 ? (
                <div className="space-y-6">
                  <InvoiceGenerator invoiceData={invoiceList} onDownload={() => toast({ title: 'Invoice Downloaded', description: 'Invoice saved.' })} />
                  <div className="flex justify-end">
                    <button onClick={handleReset} className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-md">Book Another</button>
                  </div>
                </div>
              ) : (
                <div className="max-w-md mx-auto my-10" ref={ticketRef}>
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800">Booking Successful</AlertTitle>
                    <AlertDescription className="text-green-700">The ticket has been booked successfully.</AlertDescription>
                  </Alert>
                  <div className="mt-4 flex justify-end">
                    <button onClick={downloadQRCode} className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md mr-2">Download Ticket</button>
                    <button onClick={handleReset} className="border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 py-2 px-4 rounded-md">Book Another</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="event">Select Event</Label>
                    <Select onValueChange={(value) => handleEventChange(value)} value={formData.event}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                      <SelectContent>
                        {events.map((event) => (
                          <SelectItem key={event._id} value={event._id}>{event.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <Label htmlFor="user">Search User</Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={open}
                          className="w-full justify-between"
                        >
                          {formData.user
                            ? users.find((user) => user._id === formData.user)?.name || "Select user..."
                            : searchQuery || "Search user by name, email or phone..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Search users..."
                            value={searchQuery}
                            onValueChange={handleSearchChange}
                            className="h-9"
                          />
                          <CommandEmpty>
                            {isSearching ? 'Searching...' : 'No users found. Try a different search term.'}
                          </CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-y-auto">
                            {filteredUsers.map((user) => (
                              <CommandItem
                                key={user._id}
                                value={user._id}
                                onSelect={() => handleUserSelect(user._id)}
                                className="cursor-pointer"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4 flex-shrink-0",
                                    formData.user === user._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{user.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {[user.email, user.phone].filter(Boolean).join(' • ')}
                                  </p>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="customerName">Customer Name (optional)</Label>
                    <Input id="customerName" name="customerName" type="text" placeholder="Full name for guest (optional)" value={formData.customerName || ''} onChange={handleInputChange} className="w-full" />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone">Customer Mobile (optional)</Label>
                    <Input id="customerPhone" name="customerPhone" type="tel" placeholder="Mobile number (optional)" value={formData.customerPhone || ''} onChange={handleInputChange} className="w-full" />
                  </div>

                  {isHMFSelected && (
                    <>
                      <div>

                        <Label htmlFor="country">Country <span className="text-red-500">(Mandatory)</span></Label>
                        <Select value={formData.country || ''} onValueChange={(v) => handleSelectChange('country', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="state">State / Province <span className="text-red-500">(Mandatory)</span></Label>
                        {(formData.country || '') === 'India' ? (
                          <Select value={formData.state || ''} onValueChange={(v) => handleSelectChange('state', v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {indianStates.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input id="state" name="state" type="text" placeholder="State / Province" value={formData.state || ''} onChange={(e) => handleSelectChange('state', e.target.value)} className="w-full" />
                        )}
                      </div>

                   
                    </>
                  )}
                </div>
                

                <div className="space-y-4">
                  <div>
                    <Label>Ticket Items</Label>
                    <div className="space-y-2">
                      {ticketItems.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <div className="col-span-6">
                            <Select disabled={!selectedEvent} onValueChange={(value) => handleTicketItemChange(idx, 'ticketType', value)} value={item.ticketType}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ticket type" />
                              </SelectTrigger>
                              <SelectContent>
                                {ticketTypes.map((ticket) => (
                                  <SelectItem key={ticket.name} value={ticket.name}>{ticket.name} - ₹{ticket.price}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3">
                            <Input id={`quantity-${idx}`} name={`quantity-${idx}`} type="number" min={1} value={item.quantity} onChange={(e) => handleTicketItemChange(idx, 'quantity', Number(e.target.value))} className="w-full" />
                          </div>
                          <div className="col-span-2 text-sm">₹{item.price}</div>
                          <div className="col-span-1">{ticketItems.length > 1 && (<button type="button" onClick={() => removeTicketItem(idx)} className="text-red-500">Remove</button>)}</div>
                        </div>
                      ))}

                      <div>
                        <button type="button" onClick={addTicketItem} className="text-sm text-blue-600">+ Add ticket type</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                 <div>
                        <Label htmlFor="modeOfPayment">Mode of Payment <span className="text-red-500">(Mandatory)</span></Label>
                        <Select value={formData.modeOfPayment || ''} onValueChange={(v) => handleSelectChange('modeOfPayment', v)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select mode of payment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="UPI">UPI</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

              <div className="bg-gray-50 p-4 rounded-md mt-4">
                <h3 className="font-semibold mb-2">Order Summary</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="font-medium">Price per ticket:</div>
                  <div>{ticketItems.length === 1 ? `₹${ticketItems[0].price}` : `-`}</div>

                  <div className="font-medium">Quantity:</div>
                  <div>{totalQuantity}</div>

                  <div className="font-medium">Total Amount:</div>
                  <div className="text-lg font-bold">{formatCurrency(computedTotal)}</div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={handleReset}>Reset</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading || !formData.event || !formData.user || !ticketItems.some(it => it.ticketType && it.quantity > 0)}>
                  {loading ? 'Processing...' : 'Book Ticket'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualBooking;
