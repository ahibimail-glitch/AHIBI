import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests (admin > arenaPartner > user)
api.interceptors.request.use((config) => {
  // Pick token based on route prefix to avoid sending the wrong-role token.
  // Example bug: having admin_token in storage would override a user token
  // and cause "User not found" on user-protected routes.
  const url = (config.url || '').toString();

  let token: string | null = null;
  if (url.startsWith('/api/admin')) {
    token = localStorage.getItem('admin_token');
  } else if (url.startsWith('/api/arena-partner')) {
    token = localStorage.getItem('arenaPartnerToken');
  } else if (url.startsWith('/api/organizer')) {
    token = localStorage.getItem('organizer_token') || localStorage.getItem('token');
  } else if (url.startsWith('/api/artist')) {
    token = localStorage.getItem('artist_token') || localStorage.getItem('token');
  } else if (url.startsWith('/api/venue')) {
    token = localStorage.getItem('venue_token') || localStorage.getItem('token');
  } else {
    token = localStorage.getItem('token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============ ARENA PARTNER AUTH API ============

export const arenaPartnerAuth = {
  sendOtp: (phone: string, mode: 'signup' | 'login') =>
    api.post('/api/arena-partner/auth/send-otp', { phone, mode }),

  verifyOtp: (data: {
    phone: string;
    otp: string;
    mode: 'signup' | 'login';
    name?: string;
    email?: string;
    businessName?: string;
  }) => api.post('/api/arena-partner/auth/verify-otp', data),

  getProfile: () => api.get('/api/arena-partner/auth/profile'),

  updateProfile: (data: any) => api.put('/api/arena-partner/auth/profile', data),

  uploadKyc: (documentType: string, url: string) =>
    api.post('/api/arena-partner/auth/kyc-upload', { documentType, url }),

  submitForApproval: () => api.post('/api/arena-partner/auth/submit-approval'),
};

// ============ ARENA PARTNER VENUE API ============

export const arenaPartnerVenues = {
  create: (data: any) => api.post('/api/arena-partner/venues', data),

  getAll: (status?: string) => {
    const params = status ? { status } : {};
    return api.get('/api/arena-partner/venues', { params });
  },

  getById: (id: string) => api.get(`/api/arena-partner/venues/${id}`),

  update: (id: string, data: any) => api.put(`/api/arena-partner/venues/${id}`, data),

  delete: (id: string) => api.delete(`/api/arena-partner/venues/${id}`),
};

// ============ ARENA PARTNER COURT API ============

export const arenaPartnerCourts = {
  create: (venueId: string, data: any) =>
    api.post(`/api/arena-partner/venues/${venueId}/courts`, data),

  getAll: (venueId: string) => api.get(`/api/arena-partner/venues/${venueId}/courts`),

  getById: (id: string) => api.get(`/api/arena-partner/courts/${id}`),

  update: (id: string, data: any) => api.put(`/api/arena-partner/courts/${id}`, data),

  delete: (id: string) => api.delete(`/api/arena-partner/courts/${id}`),

  addBlackout: (id: string, data: any) =>
    api.post(`/api/arena-partner/courts/${id}/blackout`, data),

  removeBlackout: (id: string, blackoutId: string) =>
    api.delete(`/api/arena-partner/courts/${id}/blackout/${blackoutId}`),
};

// ============ ARENA PARTNER BOOKING API ============

export const arenaPartnerBookings = {
  getAll: (params?: any) => api.get('/api/arena-partner/bookings', { params }),

  getById: (id: string) => api.get(`/api/arena-partner/bookings/${id}`),

  checkIn: (id: string) => api.post(`/api/arena-partner/bookings/${id}/check-in`),

  complete: (id: string) => api.post(`/api/arena-partner/bookings/${id}/complete`),

  createWalkIn: (data: any) => api.post('/api/arena-partner/bookings/walk-in', data),
};

// ============ ARENA PARTNER DASHBOARD API ============

export const arenaPartnerDashboard = {
  getStats: () => api.get('/api/arena-partner/dashboard/stats'),

  getRevenueAnalytics: (params?: any) =>
    api.get('/api/arena-partner/analytics/revenue', { params }),
};

// ============ ARENA PARTNER PAYOUT API ============

export const arenaPartnerPayouts = {
  getAll: (status?: string) => {
    const params = status ? { status } : {};
    return api.get('/api/arena-partner/payouts', { params });
  },

  getById: (id: string) => api.get(`/api/arena-partner/payouts/${id}`),
};

// ============ USER SPORTS API ============

export const sportsApi = {
  // Venue Discovery
  searchVenues: (params?: any) => api.get('/api/sports/venues', { params }),

  getVenueDetails: (id: string) => api.get(`/api/sports/venues/${id}`),

  getAvailableCourts: (venueId: string, params?: any) =>
    api.get(`/api/sports/venues/${venueId}/courts`, { params }),

  // Court Details
  getCourtDetails: (courtId: string) => api.get(`/api/sports/courts/${courtId}`),

  // Slot Availability
  getAvailableSlots: (courtId: string, date: string) =>
    api.get(`/api/sports/courts/${courtId}/slots`, { params: { date } }),

  // Booking Process
  holdSlots: (slotIds: string[]) => api.post('/api/sports/slots/hold', { slotIds }),

  releaseSlots: (slotIds: string[]) => api.post('/api/sports/slots/release', { slotIds }),

  createBookingOrder: (data: any) => api.post('/api/sports/bookings/create-order', data),

  verifyPayment: (data: any) => api.post('/api/sports/bookings/verify-payment', data),

  // My Bookings
  getMyBookings: (params?: any) => api.get('/api/sports/my-bookings', { params }),

  getBookingById: (id: string) => api.get(`/api/sports/bookings/${id}`),

  cancelBooking: (id: string, reason: string) =>
    api.post(`/api/sports/bookings/${id}/cancel`, { reason }),

  // Reviews
  addReview: (venueId: string, data: any) =>
    api.post(`/api/sports/venues/${venueId}/reviews`, data),
};

// ============ ADMIN SPORTS API ============

export const adminSportsApi = {
  // Arena Partners
  getAllPartners: (params?: any) => api.get('/api/admin/sports/arena-partners', { params }),

  getPartnerById: (id: string) => api.get(`/api/admin/sports/arena-partners/${id}`),

  approvePartner: (id: string) => api.put(`/api/admin/sports/arena-partners/${id}/approve`),

  rejectPartner: (id: string, reason: string) =>
    api.put(`/api/admin/sports/arena-partners/${id}/reject`, { reason }),

  suspendPartner: (id: string, reason: string) =>
    api.put(`/api/admin/sports/arena-partners/${id}/suspend`, { reason }),

  updateCommission: (id: string, commissionRate: number) =>
    api.put(`/api/admin/sports/arena-partners/${id}/commission`, { commissionRate }),

  updatePartnerCommission: (id: string, commissionRate: number) =>
    api.put(`/api/admin/sports/arena-partners/${id}/commission`, { commissionRate }),

  updateAdvancePaymentPercent: (id: string, advancePaymentPercent: number) =>
    api.put(`/api/admin/sports/arena-partners/${id}/advance-payment`, { advancePaymentPercent }),

  getPartnerVenues: (id: string) => api.get(`/api/admin/sports/arena-partners/${id}/venues`),

  getPartnerBookings: (id: string) => api.get(`/api/admin/sports/arena-partners/${id}/bookings`),

  getPartnerDisputes: (id: string) => api.get(`/api/admin/sports/arena-partners/${id}/disputes`),

  verifyKycDocument: (id: string, documentType: string) =>
    api.put(`/api/admin/sports/arena-partners/${id}/kyc/verify`, { documentType }),

  resolveDispute: (id: string, resolution: string) =>
    api.put(`/api/admin/sports/disputes/${id}/resolve`, { resolution }),

  // Venues
  getAllVenues: (params?: any) => api.get('/api/admin/sports/venues', { params }),

  getVenueById: (id: string) => api.get(`/api/admin/sports/venues/${id}`),

  getVenueCourts: (id: string) => api.get(`/api/admin/sports/venues/${id}/courts`),

  getVenueBookings: (id: string) => api.get(`/api/admin/sports/venues/${id}/bookings`),

  getVenueReviews: (id: string) => api.get(`/api/admin/sports/venues/${id}/reviews`),

  toggleVenueActive: (id: string) => api.put(`/api/admin/sports/venues/${id}/toggle-active`),

  deleteReview: (id: string) => api.delete(`/api/admin/sports/reviews/${id}`),

  approveVenue: (id: string) => api.put(`/api/admin/sports/venues/${id}/approve`),

  rejectVenue: (id: string, reason: string) =>
    api.put(`/api/admin/sports/venues/${id}/reject`, { reason }),

  toggleFeatured: (id: string) => api.put(`/api/admin/sports/venues/${id}/featured`),

  // Bookings
  getAllBookings: (params?: any) => api.get('/api/admin/sports/bookings', { params }),

  getBookingById: (id: string) => api.get(`/api/admin/sports/bookings/${id}`),

  // Payouts
  getAllPayouts: (params?: any) => api.get('/api/admin/sports/payouts', { params }),

  getPayoutById: (id: string) => api.get(`/api/admin/sports/payouts/${id}`),

  createPayout: (data: any) => api.post('/api/admin/sports/payouts/create', data),

  processPayout: (id: string, data: any) =>
    api.put(`/api/admin/sports/payouts/${id}/process`, data),

  completePayout: (id: string) => api.put(`/api/admin/sports/payouts/${id}/complete`),

  failPayout: (id: string, reason: string) =>
    api.put(`/api/admin/sports/payouts/${id}/fail`, { reason }),

  generateScheduledPayouts: (frequency: 'weekly' | 'monthly') =>
    api.post('/api/admin/sports/payouts/generate-scheduled', { frequency }),

  // Analytics
  getDashboardStats: () => api.get('/api/admin/sports/dashboard/stats'),

  getRevenueAnalytics: (params?: any) =>
    api.get('/api/admin/sports/analytics/revenue', { params }),
};

export default api;
