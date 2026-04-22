import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useUser, useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";

interface User {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  role: "client" | "admin";
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  getToken: () => Promise<string | null>;
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
            setUser(data.user);
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

  const logout = () => {
    signOut();
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, getToken, logout, isLoading }}>
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
