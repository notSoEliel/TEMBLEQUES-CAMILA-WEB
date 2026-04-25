import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AuthProvider } from "@/hooks/useAuth";
import ClientLayout from "@/components/layouts/ClientLayout";
import AdminLayout from "@/components/layouts/AdminLayout";
import Landing from "@/pages/Landing";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import Confirmation from "@/pages/Confirmation";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import ErrorPage from "@/pages/ErrorPage";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminInventory from "@/pages/admin/Inventory";
import AdminReservations from "@/pages/admin/Reservations";
import AdminUsers from "@/pages/admin/Users";
import AdminSettings from "@/pages/admin/Settings";
import AdminBusinessRules from "@/pages/admin/BusinessRules";

/**
 * Guards a route that requires the user to be logged in.
 * Shows a full error page instead of silently redirecting,
 * so the user understands WHY they were blocked.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <ErrorPage variant="unauthorized" />;
  }

  return <>{children}</>;
}

/**
 * Guards a route that requires admin role.
 * Shows a forbidden page if the user is not an admin.
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <ErrorPage variant="unauthorized" />;
  }

  if (user.role !== "admin") {
    return <ErrorPage variant="forbidden" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Client Routes */}
          <Route element={<ClientLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            {/* Clerk handles the full auth UI — routing="path" must match these paths */}
            <Route path="/login" element={<Login />} />
            <Route path="/login/*" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/*" element={<Register />} />
            <Route
              path="/checkout/:productId"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route
              path="/confirmation"
              element={
                <ProtectedRoute>
                  <Confirmation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* 404 Catch-all — must be last inside ClientLayout */}
            <Route path="*" element={<ErrorPage variant="not-found" />} />
          </Route>

          {/* Admin Routes */}
          <Route
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/reservations" element={<AdminReservations />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/business-rules" element={<AdminBusinessRules />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
