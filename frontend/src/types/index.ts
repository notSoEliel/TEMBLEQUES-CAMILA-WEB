export interface ISizeVariant {
  size: string;
  stock: number;
  price_override?: number;
  in_maintenance: boolean;
}

export interface IProduct {
  _id: string;
  name: string;
  category: string;
  description: string;
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

export interface ICategoryConfig {
  id: string;
  label: string;
}

export interface ISizeGroupConfig {
  label: string;
  sizes: string[];
}

export interface ISettings {
  categories: ICategoryConfig[];
  size_groups: ISizeGroupConfig[];
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
