const API_URL = "/api";

export interface PaginationMetadata {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
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
    api<{ user: any }>("/auth/me", { token }),
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
    return api<PaginatedResponse<any>>(`/products${query}`);
  },

  get: (id: string) =>
    api<{ product: any }>(`/products/${id}`),

  availability: (id: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const query = params.toString() ? `?${params.toString()}` : "";
    return api<{ booked: Array<{ start: string; end: string }> }>(`/products/${id}/availability${query}`);
  },
};

// Rentals
export const rentalsApi = {
  create: (data: { productId: string; selectedSize: string; startDate: string; endDate: string; termsAccepted: boolean }, token: string) =>
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
};

// Stripe
export const stripeApi = {
  createCheckoutSession: (rentalId: string, token: string) =>
    api<{
      url?: string;
      mode?: string;
      message?: string;
      rental?: any;
      deposit?: { required: boolean; amount: number; status: string };
    }>("/stripe/create-checkout-session", {
      method: "POST",
      body: { rentalId },
      token,
    }),

  createBulkCheckoutSession: (rentalIds: string[], token: string, orderGroupId?: string, paymentType?: "reservation" | "full") =>
    api<{
      url?: string;
      mode?: string;
      message?: string;
      rentals?: any[];
    }>("/stripe/create-checkout-session", {
      method: "POST",
      body: { rentalIds, orderGroupId, paymentType },
      token,
    }),
  verifySession: (sessionId: string, token: string) =>
    api<{ verified: boolean; payment_status?: string }>(`/stripe/verify-session?session_id=${sessionId}`, { token }),
};

// Admin
export const adminApi = {
  dashboard: (token: string) =>
    api<{ dashboard: any }>("/admin/dashboard", { token }),

  // Products CRUD
  createProduct: (data: any, token: string) =>
    api<{ product: any }>("/admin/products", { method: "POST", body: data, token }),

  updateProduct: (id: string, data: any, token: string) =>
    api<{ product: any }>(`/admin/products/${id}`, { method: "PUT", body: data, token }),

  deleteProduct: (id: string, token: string) =>
    api<{ message: string }>(`/admin/products/${id}`, { method: "DELETE", token }),

  // Rentals
  rentals: (token: string, params: { status?: string; page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status) searchParams.set("status", params.status);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<any>>(`/admin/rentals${query}`, { token });
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


  userRentals: (userId: string, token: string, params: { page?: number; limit?: number } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return api<PaginatedResponse<any>>(`/admin/users/${userId}/rentals${query}`, { token });
  },

  userStats: (userId: string, token: string) =>
    api<{ stats: { completed: number; cancelled: number; pending: number } }>(`/admin/users/${userId}/stats`, { token }),
};

// Settings
export const settingsApi = {
  get: () => api<{ settings: any }>("/settings"),
  update: (data: any, token: string) =>
    api<{ settings: any }>("/settings", { method: "PUT", body: data, token }),
};
