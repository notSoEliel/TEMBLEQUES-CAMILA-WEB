import { 
  IProduct, 
  ISettings, 
  ICategoryConfig, 
  ISizeGroupConfig, 
  PaginationMetadata, 
  ApiResponse,
  IContactMessage,
  ContactStatus,
  IUserAudit,
  IUserProfile,
} from "@/types";

function resolveApiUrl(): string {
  const configuredUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
  if (configuredUrl === "/api" || configuredUrl.endsWith("/api")) return configuredUrl;
  return `${configuredUrl}/api`;
}

const API_URL = resolveApiUrl();

export type { PaginationMetadata };

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

export interface ObservabilityMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
}

export interface ObservabilityAlert {
  _id: string;
  type: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "resolved";
  message: string;
  source: string;
  createdAt: string;
}

export interface ObservabilityOverview {
  health: {
    checkedAt: string;
    database: { status: "ok" | "unavailable"; state: number };
    dependencies: Record<string, "configured" | "not_configured">;
    configuration: {
      appEnv: string;
      cors: "configured" | "not_configured";
      backups: "configured" | "not_configured";
    };
    cron: { job: string; lastRunAt?: string; lastSuccessAt?: string; lastError?: string };
    recentErrors: Array<{ timestamp: string; requestId?: string; path?: string; code: string; statusCode: number }>;
  };
  metrics: {
    counters: ObservabilityMetric[];
    latency: { requestCount: number; averageMs: number; p95Ms: number };
  };
  alerts: ObservabilityAlert[];
}

interface ApiOptions {
  method?: string;
  body?: any;
  token?: string;
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, token } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  let currentToken = token;
  
  if (typeof window !== "undefined" && (window as any).Clerk?.session) {
    try {
      const freshToken = await (window as any).Clerk.session.getToken();
      if (freshToken) currentToken = freshToken;
    } catch (e) {
      console.warn("Failed to get fresh Clerk token", e);
    }
  }

  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(
        `El servidor respondió con un error inesperado (${response.status}). Intenta de nuevo más tarde.`,
      );
    }
    throw new Error("La respuesta del servidor no pudo ser procesada.");
  }

  if (!response.ok) {
    throw new Error(data?.error || "Ocurrió un error inesperado. Por favor, intenta de nuevo.");
  }

  return data;
}


// Auth
export const authApi = {
  me: (token: string) =>
    api<{ user: IUserProfile }>("/auth/me", { token }),
  updateMe: (data: { name: string; phone?: string; preferredAddress?: string }, token: string) =>
    api<{ user: IUserProfile }>("/auth/me", { method: "PATCH", body: data, token }),
};

// Contact
export const contactApi = {
  submit: (data: { name: string; email: string; message: string }) =>
    api<{ message: string }>("/contact", { method: "POST", body: data }),
};

// Products
export const productsApi = {
  list: (params?: Record<string, any>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => searchParams.append(key, v));
        } else if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<IProduct>>(`/products${query}`);
  },

  get: (id: string) =>
    api<{ product: IProduct }>(`/products/${id}`),

  availability: (id: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString() ? `?${params.toString()}` : "";
    return api<{ booked: Array<{ start: string; end: string; size: string }> }>(`/products/${id}/availability${query}`);
  },
};

// Rentals
export const rentalsApi = {
  create: (data: { productId: string; selectedSize: string; startDate: string; endDate: string; termsAccepted: boolean; orderGroupId?: string; paymentType?: "reservation" | "full" }, token: string) =>
    api<{ rental: any }>("/rentals", { method: "POST", body: data, token }),

  bulkCreate: (items: any[], token: string) =>
    api<{ rentals: any[] }>("/rentals/bulk", { method: "POST", body: { items }, token }),

  my: (token: string, params: { page?: number; limit?: number; view?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.view) searchParams.set("view", params.view);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<any>>(`/rentals/my${query}`, { token });
  },

  get: (id: string, token: string) =>
    api<{ rental: any }>(`/rentals/${id}`, { token }),

  cancel: (id: string, token: string) =>
    api<{ message: string; rental: any }>(`/rentals/${id}`, { method: "DELETE", token }),

  cancellationPreview: (id: string, token: string) =>
    api<{ cancellable: boolean; paid: boolean; daysUntilStart: number; refundPercentage: number; refundableAmount: number; policyLabel: string }>(`/rentals/${id}/cancellation-preview`, { token }),

  downloadReceipt: async (rentalId: string, token: string) => {
    const response = await fetch(`${API_URL}/rentals/${rentalId}/receipt.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      let message = "No se pudo generar el comprobante.";
      try {
        const data = await response.json();
        message = data?.error || message;
      } catch {
        message = `No se pudo generar el comprobante (${response.status}).`;
      }
      throw new Error(message);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `comprobante-${rentalId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

// Stripe
export const stripeApi = {
  createCheckoutSession: (rentalId: string, token: string, couponCode?: string) =>
    api<{
      url?: string;
      mode?: string;
      message?: string;
      rental?: any;
      sessionId?: string;
      deposit?: { required: boolean; amount: number; status: string };
    }>("/stripe/create-checkout-session", {
      method: "POST",
      body: { rentalId, couponCode },
      token,
    }),

  createBulkCheckoutSession: (rentalIds: string[], token: string, orderGroupId?: string, paymentType?: "reservation" | "full", couponCode?: string) =>
    api<{
      url?: string;
      mode?: string;
      message?: string;
      rentals?: any[];
      sessionId?: string;
    }>("/stripe/create-checkout-session", {
      method: "POST",
      body: { rentalIds, orderGroupId, paymentType, couponCode },
      token,
    }),
  verifySession: (sessionId: string, token: string) =>
    api<{ verified: boolean; payment_status?: string }>(`/stripe/verify-session?session_id=${sessionId}`, { token }),
};

// Admin
export const adminApi = {
  dashboard: (token: string) =>
    api<{ dashboard: any }>("/admin/dashboard", { token }),

  observabilityOverview: (token: string) =>
    api<ObservabilityOverview>("/admin/observability/overview", { token }),

  resolveObservabilityAlert: (id: string, token: string) =>
    api<{ alert: ObservabilityAlert }>(`/admin/observability/alerts/${id}/resolve`, {
      method: "PATCH",
      token,
    }),

  // Products CRUD
  createProduct: (data: any, token: string) =>
    api<{ product: IProduct }>("/admin/products", { method: "POST", body: data, token }),

  updateProduct: (id: string, data: any, token: string) =>
    api<{ product: IProduct }>(`/admin/products/${id}`, { method: "PUT", body: data, token }),

  deleteProduct: (id: string, token: string) =>
    api<{ message: string }>(`/admin/products/${id}`, { method: "DELETE", token }),

  // Rentals
  rentals: (token: string, params: { status?: string; page?: number; limit?: number; sort?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.sort) searchParams.set("sort", params.sort);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<any>>(`/admin/rentals${query}`, { token });
  },

  calendarRentals: (token: string, from: string, to: string) => {
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    return api<{ data: any[] }>(`/admin/rentals/calendar?${params.toString()}`, { token });
  },

  updateRentalStatus: (id: string, status: string, token: string) =>
    api<{ rental: any }>(`/admin/rentals/${id}/status`, { method: "PATCH", body: { status }, token }),

  // Users
  users: (token: string, params: { page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<any>>(`/admin/users${query}`, { token });
  },

  getUser: (id: string, token: string) =>
    api<{ user: any }>(`/admin/users/${id}`, { token }),

  userRentals: (userId: string, token: string, params: { page?: number; limit?: number; status?: string } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    if (params.status) searchParams.set("status", params.status);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<any>>(`/admin/users/${userId}/rentals${query}`, { token });
  },

  userStats: (userId: string, token: string) =>
    api<{ stats: { total: number; completed?: number; cancelled: number; pending: number; reserved: number; totalSpent: number } }>(`/admin/users/${userId}/stats`, { token }),

  userAudit: (userId: string, token: string) =>
    api<{ audit: IUserAudit }>(`/admin/users/${userId}/audit`, { token }),

  // Maintenance Blocks
  listMaintenance: (token: string) =>
    api<{ blocks: any[] }>("/admin/maintenance", { token }),

  createMaintenance: (data: any, token: string) =>
    api<{ block: any }>("/admin/maintenance", { method: "POST", body: data, token }),

  deleteMaintenance: (id: string, token: string) =>
    api<{ message: string; block: any }>(`/admin/maintenance/${id}`, { method: "DELETE", token }),

  // Reports
  getInventoryStats: (token: string) =>
    api<{ stats: any[] }>("/admin/reports/inventory-stats", { token }),

  exportCsv: async (token: string): Promise<string> => {
    const freshToken = typeof window !== "undefined" && (window as any).Clerk?.session
      ? await (window as any).Clerk.session.getToken()
      : token;
    
    const res = await fetch("/api/admin/reports/export-csv", {
      headers: { Authorization: `Bearer ${freshToken || token}` }
    });
    if (!res.ok) throw new Error("Error al exportar reporte");
    return res.text();
  },

  exportFinancialCsv: async (token: string, from?: string, to?: string): Promise<string> => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_URL}/admin/reports/financial/export-csv${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("No se pudo exportar el reporte financiero.");
    return res.text();
  },

  downloadFinancialPdf: async (token: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_URL}/admin/reports/financial/export.pdf${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("No se pudo exportar el PDF financiero.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reporte-financiero-academico.pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  // Contacts
  contacts: (token: string, params: { status?: ContactStatus; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<IContactMessage>>(`/admin/contacts${query}`, { token });
  },

  updateContactStatus: (id: string, status: ContactStatus, token: string) =>
    api<{ contact: IContactMessage }>(`/admin/contacts/${id}/status`, { method: "PATCH", body: { status }, token }),

  downloadRentalContract: async (rentalId: string, token: string) => {
    const response = await fetch(`${API_URL}/admin/rentals/${rentalId}/contract.pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      let message = "No se pudo generar el contrato.";
      try {
        const data = await response.json();
        message = data?.error || message;
      } catch {
        message = `No se pudo generar el contrato (${response.status}).`;
      }
      throw new Error(message);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contrato-${rentalId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

// Coupons
export const couponsApi = {
  validate: (code: string, subtotal: number, categories: string[], token: string) =>
    api<{ valid: boolean; coupon: { code: string; discount_type: string; value: number } }>("/coupons/validate", {
      method: "POST",
      body: { code, subtotal, categories },
      token,
    }),
  list: (token: string) =>
    api<{ coupons: any[] }>("/coupons", { token }),
  create: (data: any, token: string) =>
    api<{ coupon: any }>("/coupons", { method: "POST", body: data, token }),
  update: (id: string, data: any, token: string) =>
    api<{ coupon: any }>(`/coupons/${id}`, { method: "PUT", body: data, token }),
  delete: (id: string, token: string) =>
    api<{ message: string; coupon: any }>(`/coupons/${id}`, { method: "DELETE", token }),
};

// Settings
export const settingsApi = {
  get: () => api<{ settings: ISettings }>("/settings"),
  update: (data: ISettings, token: string) =>
    api<{ settings: ISettings }>("/settings", { method: "PUT", body: data, token }),
};

// Media
interface SignResponse {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  uploadPreset: string;
}

interface CloudinaryUploadSuccess {
  secure_url?: unknown;
}

interface CloudinaryUploadError {
  error: {
    message: string;
  };
}

export const mediaApi = {
  uploadImage: async (file: File, token?: string): Promise<{ success: boolean; url: string }> => {
    try {
      // 1. Obtener la firma de nuestro backend seguro
      const signRes = await api<{ success: boolean; data: SignResponse }>("/media/sign", { 
        method: "GET",
        token 
      });
      const { timestamp, signature, apiKey, cloudName, uploadPreset } = signRes.data;

      // 2. Preparar el payload para Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("upload_preset", uploadPreset);
      formData.append("signature", signature);

      // 3. Subida directa a Cloudinary
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
      
      const uploadRes = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = (await uploadRes.json().catch(() => null)) as CloudinaryUploadError | null;
        throw new Error(errorData?.error?.message || "Error al subir a Cloudinary");
      }

      const data = (await uploadRes.json()) as CloudinaryUploadSuccess;
      if (typeof data.secure_url !== "string" || data.secure_url.length === 0) {
        throw new Error("Cloudinary no devolvió la URL de la imagen");
      }

      const finalUrl = data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
      return { success: true, url: finalUrl };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Cloudinary upload failed:", error.message);
        throw new Error(error.message || "No se pudo completar la subida de la imagen. Inténtalo nuevamente.");
      }
      console.error("Cloudinary upload failed with unknown error", error);
      throw new Error("No se pudo completar la subida de la imagen. Inténtalo nuevamente.");
    }
  },
};
