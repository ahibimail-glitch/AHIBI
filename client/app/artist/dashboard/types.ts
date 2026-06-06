export interface ArtistUser {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

export interface Photo {
  _id: string;
  url: string;
  caption: string;
  isProfileImage: boolean;
  isCoverImage: boolean;
}

export interface Video {
  _id: string;
  url: string;
  thumbnail: string;
  caption: string;
  platform: string;
}

export interface Accolade {
  _id: string;
  title: string;
  description: string;
  year: number;
  organization: string;
  certificate?: string;
}

export interface TechRider {
  soundRequirements?: string;
  lightingRequirements?: string;
  stageRequirements?: string;
  instrumentsEquipmentNeeded?: string;
  powerRequirements?: string;
  specialNotes?: string;
  file?: {
    url?: string;
    fileType?: 'pdf' | 'image';
    uploadedAt?: string;
  };
  epkFile?: {
    url?: string;
    fileType?: 'pdf' | 'image';
    uploadedAt?: string;
  };
  updatedAt?: string;
}

export interface ArtistProfile {
  _id: string;
  user: string;
  name?: string;
  stageName?: string;
  gender?: string;
  email?: string;
  phone?: string;
  emergencyContact?: string;
  city?: string;
  type: string;
  bio?: string;
  shortBio?: string;
  longBio?: string;
  genres: string[];
  artistCategories?: string[];
  languages: string[];
  basePrice?: number;
  location?: string;
  profilePic?: string;
  profileImage?: string;
  coverImage?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  performanceRegions?: string[];
  eventTypes?: string[];
  eventTypesOther?: string;
  audienceVibe?: string[];
  performanceDurations?: string[];
  performanceDurationOther?: string;
  performanceFormats?: string[];
  performanceFormatsOther?: string;
  feeRange?: {
    min?: number;
    max?: number;
  };
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    spotify?: string;
    appleMusic?: string;
    youtubeMusic?: string;
    soundCloud?: string;
    facebook?: string;
    twitter?: string;
    website?: string;
    [key: string]: string | undefined;
  };
  rating?: {
    average: number;
    count: number;
  };
  totalBookings?: number;
  gallery?: {
    photos: Photo[];
    videos: Video[];
  };
  accolades?: Accolade[];
  termsAndConditions?: {
    content: string;
    lastUpdated: string;
  };
  cancellationPolicy?: {
    advanceNotice: number;
    refundPolicy: string;
    emergencyContact: string;
  };
  techRider?: TechRider;
}

export interface BookingRequest {
  _id: string;
  event: {
    name: string;
    date: string;
    startTime?: string;
    endTime?: string;
    venue: {
      name: string;
      address: string;
    };
  };
  organizer: {
    name: string;
    email: string;
    phone?: string;
  };
  booking: {
    requestedAmount: number;
    status: string;
  };
  createdAt: string;
}
