import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, ShoppingBag, LogOut, Menu, X } from "lucide-react";

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b-2 border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                Tembleques Camila
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/catalog">Catálogo</Link>
              </Button>
              {user ? (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/profile">
                      <User className="h-4 w-4 mr-1" />
                      {user.name}
                    </Link>
                  </Button>
                  {user.role === "admin" && (
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/admin">Panel Admin</Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-1" />
                    Salir
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/login">Iniciar Sesión</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/register">Registrarse</Link>
                  </Button>
                </>
              )}
            </nav>

            {/* Mobile menu toggle */}
            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t-2 border-border bg-background px-4 py-4 space-y-2">
            <Link to="/catalog" className="block py-2 font-medium" onClick={() => setMenuOpen(false)}>
              Catálogo
            </Link>
            {user ? (
              <>
                <Link to="/profile" className="block py-2 font-medium" onClick={() => setMenuOpen(false)}>
                  Mi Perfil
                </Link>
                {user.role === "admin" && (
                  <Link to="/admin" className="block py-2 font-medium text-primary" onClick={() => setMenuOpen(false)}>
                    Panel Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="block py-2 font-medium text-destructive">
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="block py-2 font-medium" onClick={() => setMenuOpen(false)}>
                  Iniciar Sesión
                </Link>
                <Link to="/register" className="block py-2 font-medium text-primary" onClick={() => setMenuOpen(false)}>
                  Registrarse
                </Link>
              </>
            )}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-border bg-card mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Tembleques Camila
              </h3>
              <p className="text-muted-foreground text-sm">
                Alquiler premium de vestimenta típica panameña y accesorios folclóricos. La tradición se luce mejor cuando se reserva fácil.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Navegación</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/catalog" className="hover:text-primary transition-colors">Catálogo</Link></li>
                <li><Link to="/register" className="hover:text-primary transition-colors">Crear Cuenta</Link></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">Iniciar Sesión</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Contacto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>contacto@temblequescamila.com</li>
                <li>+507 6000-0000</li>
                <li>Panamá, PA</li>
              </ul>
            </div>
          </div>
          <Separator className="my-8" />
          <p className="text-center text-sm text-muted-foreground">
            2026 Tembleques Camila. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
