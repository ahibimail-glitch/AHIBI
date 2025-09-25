"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Plus, RefreshCw } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "react-qr-code"; // Install react-qr-code if you want QR codes

type EventSummary = { _id: string; title: string };
type EventDetail = EventSummary & { ticketTypes?: { name: string }[] };

type Coupon = {
  _id: string;
  code: string;
  event: { id: string; name: string };
  ticketCategory: string;
  discountPercentage: number;
  status: "active" | "used";
  createdAt: string;
  expiresAt?: string;
};

export default function Coupons() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null);
  const [ticketCategory, setTicketCategory] = useState<string>("");
  const [discount, setDiscount] = useState<string>("10");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"active" | "used">("active");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`/api/events`);
        const { data } = response;
        if (data && data.success && data.data && Array.isArray(data.data.events)) {
          setEvents(data.data.events);
        } else if (Array.isArray(data)) {
          setEvents(data);
        } else if (data && Array.isArray(data.events)) {
          setEvents(data.events);
        } else if (data && data.data && Array.isArray(data.data)) {
          setEvents(data.data);
        } else {
          setEvents([]);
        }
      } catch (error) {
        console.error(error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchCoupons = async () => {
      const { data } = await axios.get<Coupon[]>(`/api/coupons`, { params: { status: activeTab } });
      setCoupons(data || []);
    };
    fetchCoupons();
  }, [activeTab]);

  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!selectedEventId) {
        setSelectedEvent(null);
        setTicketCategory("");
        return;
      }
      const { data } = await axios.get<EventDetail>(`/api/events/${selectedEventId}`);
      setSelectedEvent(data);
      const firstCategory = data?.ticketTypes?.[0]?.name || "";
      setTicketCategory(firstCategory);
    };
    fetchEventDetail();
  }, [selectedEventId]);

  const ticketCategories = useMemo(() => selectedEvent?.ticketTypes?.map(t => t.name) || [], [selectedEvent]);

  const handleGenerate = async () => {
    if (!selectedEventId || !ticketCategory || !discount) return;
    setLoading(true);
    try {
      await axios.post(`/api/coupons`, {
        eventId: selectedEventId,
        ticketCategory,
        discountPercentage: Number(discount),
        expiresAt: expiresAt || undefined,
      });
      setDiscount("10");
      setExpiresAt("");
      const { data } = await axios.get<Coupon[]>(`/api/coupons`, { params: { status: activeTab } });
      setCoupons(data || []);
    } finally {
      setLoading(false);
    }
  };

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const downloadPng = async (coupon: Coupon) => {
    const node = cardRefs.current[coupon._id];
    if (!node) return;
    const canvas = await html2canvas(node);
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${coupon.code}.png`;
    link.click();
  };

  const downloadPdf = async (coupon: Coupon) => {
    const node = cardRefs.current[coupon._id];
    if (!node) return;
    const canvas = await html2canvas(node);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
    const imgWidth = canvas.width * ratio;
    const imgHeight = canvas.height * ratio;
    const x = (pageWidth - imgWidth) / 2;
    const y = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, "PNG", x, y, imgWidth, imgHeight);
    pdf.save(`${coupon.code}.pdf`);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="text-sm text-gray-600">Event</label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  {isLoading ? (
                    <SelectItem value="loading" disabled>Loading events...</SelectItem>
                  ) : events.length === 0 ? (
                    <SelectItem value="no-events" disabled>No events available</SelectItem>
                  ) : (
                    events.map(ev => <SelectItem key={ev._id} value={ev._id}>{ev.title}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Ticket Category</label>
              <Select value={ticketCategory} onValueChange={setTicketCategory} disabled={!ticketCategories.length}>
                <SelectTrigger>
                  <SelectValue placeholder={ticketCategories.length ? "Select category" : "No categories"} />
                </SelectTrigger>
                <SelectContent>
                  {ticketCategories.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-gray-600">Discount %</label>
              <Input type="number" min={0} max={100} value={discount} onChange={e => setDiscount(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-end">
              <Button disabled={loading || !selectedEventId || !ticketCategory || !discount} onClick={handleGenerate}>
                <Plus className="h-4 w-4 mr-2" /> Generate Coupon
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="used">Used</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <CouponTable coupons={coupons} cardRefs={cardRefs} onRefresh={async () => {
            const { data } = await axios.get<Coupon[]>(`/api/coupons`, { params: { status: "active" } });
            setCoupons(data || []);
          }} onDownloadPng={downloadPng} onDownloadPdf={downloadPdf} />
        </TabsContent>
        <TabsContent value="used">
          <CouponTable coupons={coupons} cardRefs={cardRefs} onRefresh={async () => {
            const { data } = await axios.get<Coupon[]>(`/api/coupons`, { params: { status: "used" } });
            setCoupons(data || []);
          }} onDownloadPng={downloadPng} onDownloadPdf={downloadPdf} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CouponTable({ coupons, cardRefs, onRefresh, onDownloadPng, onDownloadPdf }: {
  coupons: Coupon[];
  cardRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onRefresh: () => void;
  onDownloadPng: (c: Coupon) => void;
  onDownloadPdf: (c: Coupon) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Coupon</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Ticket Category</TableHead>
            <TableHead>Discount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {coupons.map(c => (
            <TableRow key={c._id}>
              <TableCell><div className="text-sm font-mono font-semibold">{c.code}</div></TableCell>
              <TableCell>{c.event?.name}</TableCell>
              <TableCell>{c.ticketCategory}</TableCell>
              <TableCell>{c.discountPercentage}%</TableCell>
              <TableCell>
                <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>
                  {c.status === 'active' ? 'Active' : 'Used'}
                </Badge>
              </TableCell>
              <TableCell>{new Date(c.createdAt).toLocaleString()}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button size="sm" variant="outline" onClick={() => onDownloadPng(c)}>
                  <Download className="h-3 w-3 mr-1" /> PNG
                </Button>
                <Button size="sm" onClick={() => onDownloadPdf(c)}>
                  <Download className="h-3 w-3 mr-1" /> PDF
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Hidden render targets for export with template */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c => (
          <div
            key={`card-${c._id}`}
            ref={(el) => { cardRefs.current[c._id] = el; }}
            className="relative w-full h-64 rounded-xl shadow-lg overflow-hidden border border-gray-200"
            style={{
              backgroundImage: `url('/bgmi.jpg')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-black/25"></div>

            {/* Coupon Code */}
            <div className="absolute top-6 left-6 text-white font-mono font-extrabold text-2xl tracking-widest z-10">
              {c.code}
            </div>

            {/* Event & Ticket Category */}
            <div className="absolute top-20 left-6 text-white z-10">
              <div className="text-sm font-semibold">{c.event?.name}</div>
              <div className="text-xs">{c.ticketCategory}</div>
            </div>

            {/* Discount Badge */}
            <div className="absolute top-6 right-6 bg-red-500 text-white px-3 py-1 rounded-bl-lg font-bold text-xs z-10">
              {c.discountPercentage}% OFF
            </div>

            {/* Created Date */}
            <div className="absolute bottom-6 left-6 text-white text-xs z-10">
              Created {new Date(c.createdAt).toLocaleDateString()}
            </div>

            {/* QR Code */}
            <div className="absolute bottom-6 right-6 z-10">
              <QRCode value={c.code} size={64} bgColor="transparent" fgColor="white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
