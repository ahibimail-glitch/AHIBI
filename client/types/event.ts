export interface Location {
  address: string;
  city: string;
  coordinates?: {
    type: string;
    coordinates: number[];
  };
}

export interface TicketType {
  _id?: string;
  name: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  sold?: number;
  benefits?: string[];
}

export interface Event {
  _id: string;
  title: string;
  description: string;
  banner: string;
  gallery?: Array<{ url: string; caption?: string }>;
  category: string;
  startDate: string | Date;
  endDate: string | Date;
  location: Location;
  ticketTypes: TicketType[];
  status: string;
  isFeatured?: boolean;
  isFreeEvent?: boolean;
  tags?: string[];
  slug: string;
  attendees?: number;
  totalTickets?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface EventsResponse {
  events: Event[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  data: {
    events: Event[];
  };
}
