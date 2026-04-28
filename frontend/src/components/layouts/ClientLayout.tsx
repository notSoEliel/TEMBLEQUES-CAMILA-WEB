import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, LogOut, Menu, X, ShoppingCart, Flower } from "lucide-react";

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="Tembleques Camila"
                className="h-11 w-11 object-contain transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="flex flex-col leading-[0.5] pt-1">
                <span className="text-lg font-black text-foreground tracking-tighter">
                  Tembleques
                </span>
                <span className="text-lg font-black text-primary tracking-tighter">
                  Camila
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <Link 
                to="/catalog" 
                className="text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                Catálogo
              </Link>

              <Link
                to="/cart"
                className="relative p-2 hover:bg-primary/5 rounded-full transition-colors text-foreground"
              >
                <ShoppingCart className="h-5 w-5" />
                {items.length > 0 && (
                  <span className="absolute top-0 right-0 h-4 w-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center shadow-sm">
                    {items.length}
                  </span>
                )}
              </Link>

              {user ? (
                <>
                  <Link 
                    to="/profile" 
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-primary/5 transition-colors text-sm font-bold text-foreground"
                  >
                    <User className="h-4.5 w-4.5" />
                    <span>{user.name.split(" ")[0]}</span>
                  </Link>

                  {user.role === "admin" && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      asChild 
                      className="rounded-full border-primary/30 text-primary hover:bg-primary/5 px-6 font-bold h-10 border"
                    >
                      <Link to="/admin">Panel Admin</Link>
                    </Button>
                  )}

                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-destructive/5 text-sm font-bold text-foreground transition-colors"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" asChild className="font-bold">
                    <Link to="/login">Iniciar Sesión</Link>
                  </Button>
                  <Button size="sm" asChild className="rounded-full px-6 font-bold">
                    <Link to="/register">Registrarse</Link>
                  </Button>
                </>
              )}
            </nav>

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2.5 hover:bg-primary/8 rounded-full transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-border/60 bg-background/98 backdrop-blur-md px-4 py-5 space-y-1 shadow-elegant">
            <Link
              to="/catalog"
              className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/8 hover:text-primary transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              Catálogo
            </Link>
            <Link
              to="/cart"
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/8 hover:text-primary transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              <ShoppingCart className="h-4 w-4" />
              Carrito
              {items.length > 0 && (
                <span className="ml-auto h-5 w-5 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                  {items.length}
                </span>
              )}
            </Link>

            <Separator className="my-2" />

            {user ? (
              <>
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/8 hover:text-primary transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Mi Perfil ({user.name.split(" ")[0]})
                </Link>
                {user.role === "admin" && (
                  <Link
                    to="/admin"
                    className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-primary hover:bg-primary/8 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    Panel Admin
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/8 transition-colors w-full text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/8 hover:text-primary transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="flex items-center px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/8 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
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
      <footer className="border-t border-border/60 bg-muted/40 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img
                  src="/logo.png"
                  alt="Tembleques Camila"
                  className="h-8 w-8 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <h3
                  className="text-lg font-semibold text-foreground"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Tembleques Camila
                </h3>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Alquiler premium de vestimenta típica panameña y accesorios folclóricos. La tradición se luce mejor cuando se reserva fácil.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-5 text-sm tracking-wide uppercase text-muted-foreground/70">
                Navegación
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/catalog" className="text-muted-foreground hover:text-primary transition-colors">
                    Catálogo
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-muted-foreground hover:text-primary transition-colors">
                    Crear Cuenta
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
                    Iniciar Sesión
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-5 text-sm tracking-wide uppercase text-muted-foreground/70">
                Contacto
              </h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li>contacto@temblequescamila.com</li>
                <li>+507 6000-0000</li>
                <li>Panamá, PA</li>
              </ul>
            </div>
          </div>
          <Separator className="my-10" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground/60">
              © 2026 Tembleques Camila. Todos los derechos reservados.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <Flower className="h-3.5 w-3.5 text-primary/40" />
              <span>Hecho con orgullo en Panamá</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
