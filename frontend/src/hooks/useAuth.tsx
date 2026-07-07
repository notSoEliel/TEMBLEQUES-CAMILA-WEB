import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";

interface User {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  role: "client" | "admin";
  phone?: string;
  preferredAddress?: string;
  avatarUrl?: string;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  getToken: () => Promise<string | null>;
  updateProfile: (data: { name: string; phone?: string; preferredAddress?: string }) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user: clerkUser } = useUser();
  const { getToken: clerkGetToken } = useClerkAuth();
  const { signOut } = useClerk();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const mockToken = localStorage.getItem("mock_auth_token");
    if (mockToken) {
      const role = mockToken === "mock-admin-token" ? "admin" : "client";
      const email = `${role}@test.com`;
      const name = `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`;
      const clerkId = `mock_${role}_id`;

      const fetchMockUser = async () => {
        try {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${mockToken}` },
          });
          if (res.ok) {
            const data = await res.json();
            setUser(data.user);
            setToken(mockToken);
          } else {
            setUser({
              id: clerkId,
              clerkId,
              name,
              email,
              role,
            });
            setToken(mockToken);
          }
        } catch {
          setUser(null);
          setToken(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchMockUser();
      return;
    }

    if (!isLoaded) return;

    if (!isSignedIn || !clerkUser) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    // Resolve MongoDB profile and Clerk token simultaneously
    const initSession = async () => {
      try {
        const freshToken = await clerkGetToken();
        setToken(freshToken);

        if (freshToken) {
          const res = await fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${freshToken}` },
          });

          if (res.ok) {
            const data = await res.json();
            setUser({ ...data.user, avatarUrl: clerkUser.imageUrl });
          } else {
            // Token valid in Clerk but no MongoDB profile yet — build minimal user
            // from Clerk data. The upsert in the middleware will create it on next protected call.
            const primaryEmail =
              clerkUser.primaryEmailAddress?.emailAddress ?? "";
            const role =
              (clerkUser.publicMetadata?.role as "client" | "admin") ?? "client";
            setUser({
              id: clerkUser.id,
              clerkId: clerkUser.id,
              name: clerkUser.fullName ?? primaryEmail,
              email: primaryEmail,
              role,
              avatarUrl: clerkUser.imageUrl,
            });
          }
        }
      } catch {
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [isLoaded, isSignedIn, clerkUser?.id]);

  const getToken = async () => {
    const t = await clerkGetToken();
    setToken(t);
    return t;
  };

  const updateProfile = async (data: { name: string; phone?: string; preferredAddress?: string }) => {
    const currentToken = token ?? await getToken();
    if (!currentToken) {
      throw new Error("Sesión no disponible. Inicia sesión nuevamente.");
    }

    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify(data),
    });

    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload?.error || "No se pudo guardar el perfil.");
    }

    const updatedUser = { ...payload.user, avatarUrl: user?.avatarUrl };
    setUser(updatedUser);
    return updatedUser;
  };

  const logout = () => {
    localStorage.removeItem("mock_auth_token");
    signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, getToken, updateProfile, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
