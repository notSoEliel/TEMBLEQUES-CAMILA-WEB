export interface ISizeVariant {
  size: string;
  stock: number;
  price_override?: number;
  in_maintenance: boolean;
}

export interface IProduct {
  _id: string;
  name: string;
  name_en?: string;
  category: string;
  description: string;
  description_en?: string;
  rental_price: number;
  variants: ISizeVariant[];
  images: string[];
  deposit_settings: {
    required: boolean;
    overrideAmount?: number;
  };
  createdAt: string;
  updatedAt: string;
  // Virtuals
  total_stock?: number;
  is_available?: boolean;
}

export interface IUserProfile {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  role: "client" | "owner" | "operator" | "inventory" | "support";
  phone?: string;
  preferredAddress?: string;
  preferredLanguage?: "es" | "en";
  createdAt?: string;
}

export type ContactStatus = "unread" | "read" | "archived";

export interface IContactMessage {
  _id: string;
  name: string;
  email: string;
  message: string;
  status: ContactStatus;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  updatedAt: string;
}

export type CustomerTrustLevel = "alto" | "medio" | "requiere_revision";

export interface IUserAudit {
  totalRentals: number;
  completed: number;
  active: number;
  pending: number;
  cancelled: number;
  late: number;
  damaged: number;
  incidents: number;
  termsAccepted: number;
  totalSpent: number;
  outstandingBalance: number;
  trustLevel: CustomerTrustLevel;
  lastRental?: {
    _id: string;
    status: string;
    total: number;
    createdAt: string;
    product_id?: {
      name?: string;
      category?: string[];
      images?: string[];
    };
  } | null;
  statusBreakdown: Record<string, number>;
}

export interface ICategoryConfig {
  id: string;
  label: string;
  label_en?: string;
}

export interface ISizeGroupConfig {
  label: string;
  sizes: string[];
}

export interface ISettings {
  categories: ICategoryConfig[];
  size_groups: ISizeGroupConfig[];
  low_stock_threshold?: number;
}

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  pagination?: PaginationMetadata;
  message?: string;
}
