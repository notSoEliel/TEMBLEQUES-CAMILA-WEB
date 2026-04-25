import React from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Users,
  ArrowLeft,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Inventario", icon: Package },
  { href: "/admin/reservations", label: "Reservas", icon: CalendarCheck },
  { href: "/admin/users", label: "Usuarios", icon: Users },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r-2 border-border bg-card h-[100dvh] sticky top-0 overflow-y-auto">
        <div className="p-6">
          <h1 className="text-xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
            TC Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Panel de Administracion</p>
        </div>

        <Separator />

        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                  isActive
                    ? "bg-primary text-primary-foreground border-border"
                    : "border-transparent hover:bg-muted hover:border-border"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-2">
          <Separator />
          <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Sitio
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesion
          </Button>
          <div className="px-2 pt-2">
            <p className="text-xs font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b-2 border-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
          TC Admin
        </h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r-2 border-border p-4 pt-16">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all border-2 ${
                      isActive
                        ? "bg-primary text-primary-foreground border-border"
                        : "border-transparent hover:bg-muted hover:border-border"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-8 space-y-2">
              <Separator />
              <Link to="/" className="flex items-center gap-2 px-4 py-2 text-sm" onClick={() => setSidebarOpen(false)}>
                <ArrowLeft className="h-4 w-4" />
                Volver al Sitio
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-destructive">
                <LogOut className="h-4 w-4" />
                Cerrar Sesion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-16 lg:pt-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
