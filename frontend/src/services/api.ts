const API_URL = "/api";

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
  
  // Clerk tokens expire quickly. If the user stays on the page, the token in useAuth state becomes stale.
  // We intercept the request here to always fetch a fresh token directly from the Clerk instance.
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
    // Network error (servidor caído, sin conexión)
    throw new Error("No se pudo conectar con el servidor. Verifica tu conexión a internet.");
  }

  // Try to parse JSON — some error responses (503, nginx pages) are plain HTML
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


// Auth — login, register y gestión de sesión los maneja Clerk.
// Solo mantenemos un helper para obtener el perfil de MongoDB si se necesita fuera del hook.
export const authApi = {
  me: (token: string) =>
    api<{ user: any }>("/auth/me", { token }),
};

// Products
export const productsApi = {
  list: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return api<{ products: any[] }>(`/products${query}`);
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

  my: (token: string) =>
    api<{ rentals: any[] }>("/rentals/my", { token }),

  get: (id: string, token: string) =>
    api<{ rental: any }>(`/rentals/${id}`, { token }),

  cancel: (id: string, token: string) =>
    api<{ message: string; rental: any }>(`/rentals/${id}`, { method: "DELETE", token }),
};

// Stripe
export const stripeApi = {
  createCheckoutSession: (rentalId: string, token: string) =>
    api<{ url?: string; mode?: string; message?: string; rental?: any }>("/stripe/create-checkout-session", {
      method: "POST",
      body: { rentalId },
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
  rentals: (token: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    return api<{ rentals: any[] }>(`/admin/rentals${query}`, { token });
  },

  updateRentalStatus: (id: string, status: string, token: string) =>
    api<{ rental: any }>(`/admin/rentals/${id}/status`, { method: "PATCH", body: { status }, token }),

  // Users
  users: (token: string) =>
    api<{ users: any[] }>("/admin/users", { token }),

  userRentals: (userId: string, token: string) =>
    api<{ rentals: any[] }>(`/admin/users/${userId}/rentals`, { token }),
};
