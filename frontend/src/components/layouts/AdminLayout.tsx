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
  Mail,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  Settings,
  Info,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inventory", label: "Inventario", icon: Package },
  { href: "/admin/reservations", label: "Reservas", icon: CalendarCheck },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/contacts", label: "Mensajes", icon: Mail },
  { href: "/admin/business-rules", label: "Info y Reglas", icon: Info },
  { href: "/admin/settings", label: "Ajustes", icon: Settings },
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
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-background border-r border-border/60 h-[100dvh] sticky top-0 overflow-y-auto shadow-elegant">
        {/* Brand */}
        <div className="p-6 pb-5">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Tembleques Camila"
              className="h-8 w-8 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <h1
                className="text-base font-semibold text-primary leading-tight"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                TC Admin
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">Panel de Administración</p>
            </div>
          </div>
        </div>

        <Separator />

        <nav className="flex-1 p-3 space-y-0.5 mt-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary pl-[calc(0.875rem-2px)]"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground border-l-2 border-transparent pl-[calc(0.875rem-2px)]"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-1">
          <Separator className="mb-3" />
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Sitio
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/8"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </Button>

          {/* User info */}
          <div className="mt-3 px-2 py-2.5 bg-muted/60 rounded-xl">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/60 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Tembleques Camila"
            className="h-7 w-7 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <h1
            className="text-base font-semibold text-primary"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            TC Admin
          </h1>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-primary/8 rounded-full transition-colors"
          aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-background border-r border-border/60 p-3 pt-20 shadow-elegant-lg">
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary pl-[calc(0.875rem-2px)]"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground border-l-2 border-transparent pl-[calc(0.875rem-2px)]"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 space-y-1">
              <Separator className="mb-3" />
              <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-primary/5 rounded-xl transition-colors"
                onClick={() => setSidebarOpen(false)}
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al Sitio
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/8 rounded-xl transition-colors w-full text-left"
              >
                <LogOut className="h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:p-8 p-4 pt-20 lg:pt-8 min-w-0">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
