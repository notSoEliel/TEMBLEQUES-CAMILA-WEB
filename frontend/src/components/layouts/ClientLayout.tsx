import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User as UserIcon, LogOut, Menu, ShoppingCart, Flower, ShoppingBag, Settings, LayoutDashboard, Home, ChevronDown } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { SkipLink } from "@/components/ui/AccessibilityTools";

export default function ClientLayout() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SkipLink />
      {/* Navbar Premium */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Mobile: Hamburger Menu (Left) */}
            <div className="flex items-center md:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2.5 hover:bg-primary/8 rounded-full transition-colors flex items-center justify-center">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">{t("nav.openMenu")}</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[350px] rounded-r-[var(--radius-popover)] border-none shadow-elegant-lg">
                  <SheetHeader className="pb-8 border-b border-border/40">
                    <SheetTitle className="text-2xl pt-4">{t("nav.navigation")}</SheetTitle>
                  </SheetHeader>
                  <nav className="flex flex-col gap-5 mt-8">
                    <Link
                      to="/"
                      className="flex items-center gap-3 text-2xl font-bold tracking-tight hover:text-primary transition-colors px-2"
                    >
                      <Home className="h-6 w-6" />
                      {t("nav.home")}
                    </Link>
                    <Link
                      to="/catalog"
                      className="text-2xl font-bold tracking-tight hover:text-primary transition-colors px-2"
                    >
                      {t("nav.catalog")}
                    </Link>
                    <Link
                      to="/historia"
                      className="text-2xl font-bold tracking-tight hover:text-primary transition-colors px-2"
                    >
                      {t("nav.history")}
                    </Link>
                    <Link
                      to="/credencial"
                      className="text-2xl font-bold tracking-tight hover:text-primary transition-colors px-2"
                    >
                      {t("nav.credentials")}
                    </Link>
                    <div className="flex flex-col gap-4 mt-4 px-2 pt-4 border-t border-border/40">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/50">{t("nav.help")}</p>
                      <Link
                        to="/faq"
                        className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
                      >
                        {t("nav.faq")}
                      </Link>
                      <Link
                        to="/contacto"
                        className="text-2xl font-bold tracking-tight hover:text-primary transition-colors"
                      >
                        {t("nav.contact")}
                      </Link>
                      <LanguageToggle className="mt-4 w-fit" />
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo (Absolute Center on Mobile, Left on Desktop) */}
            <div className="flex items-center justify-center md:justify-start absolute left-1/2 -translate-x-1/2 md:relative md:left-auto md:translate-x-0">
              <Link to="/" aria-label="Ir a la página de inicio" className="flex items-center gap-3 group">
                <img
                  src="/logo.png"
                  alt="Logo Tembleques Camila"
                  className="h-11 w-11 object-contain transition-transform duration-500 group-hover:rotate-6"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="hidden sm:flex flex-col leading-[0.8] pt-1">
                  <span className="text-xl font-display font-black text-foreground tracking-tighter">
                    Tembleques
                  </span>
                  <span className="text-xl font-display font-black text-primary tracking-tighter">
                    Camila
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop: Central Navigation (NavigationMenu) */}
            <nav className="hidden md:flex flex-1 items-center justify-center">
              <NavigationMenu>
                <NavigationMenuList className="flex items-center gap-1">
                  <NavigationMenuItem>
                    <Link to="/catalog">
                      <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                        {t("nav.catalog")}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(navigationMenuTriggerStyle(), "cursor-pointer group flex items-center gap-1.5 focus:outline-none")}>
                        {t("nav.essence")}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[450px] p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-1 bg-primary/5 border border-primary/10 rounded-[0.75rem] p-5 flex flex-col justify-end min-h-[180px]">
                            <Flower className="h-8 w-8 text-primary/40 mb-4" />
                            <div className="text-lg font-bold text-primary font-display leading-tight mb-2">
                              {t("nav.cultureTitle")}
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {t("nav.cultureText")}
                            </p>
                          </div>
                          <div className="col-span-1 flex flex-col gap-1">
                            <DropdownMenuItem asChild>
                              <Link to="/historia" className="flex flex-col items-start px-3 py-2 rounded-[0.5rem]">
                                <span className="font-bold text-sm">{t("nav.history")}</span>
                                <span className="text-[11px] text-muted-foreground leading-tight">{t("nav.historySub")}</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/credencial" className="flex flex-col items-start px-3 py-2 rounded-[0.5rem]">
                                <span className="font-bold text-sm">{t("nav.credentials")}</span>
                                <span className="text-[11px] text-muted-foreground leading-tight">{t("nav.credentialsSub")}</span>
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/mision-vision" className="flex flex-col items-start px-3 py-2 rounded-[0.5rem]">
                                <span className="font-bold text-sm">{t("nav.missionVision")}</span>
                                <span className="text-[11px] text-muted-foreground leading-tight">{t("nav.missionSub")}</span>
                              </Link>
                            </DropdownMenuItem>
                          </div>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={cn(navigationMenuTriggerStyle(), "cursor-pointer group flex items-center gap-1.5 focus:outline-none")}>
                        {t("nav.help")}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" className="w-56 p-2">
                        <DropdownMenuItem asChild>
                          <Link to="/faq" className="w-full flex items-center gap-2 px-3 py-2.5">
                            <span className="font-bold">{t("nav.faq")}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/contacto" className="w-full flex items-center gap-2 px-3 py-2.5">
                            <span className="font-bold">{t("nav.contact")}</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            </nav>

            {/* Actions: Cart & User (Right) */}
            <div className="flex items-center gap-3 md:gap-5">
              <LanguageToggle className="hidden md:flex" />
              <Link
                to="/cart"
                aria-label={`${t("nav.cart")}${items.length > 0 ? `, ${items.length} ${t("nav.cartItems")}` : ""}`}
                className="group relative p-2.5 hover:bg-primary/5 rounded-full transition-all duration-300 flex items-center justify-center"
              >
                <ShoppingCart className="h-5.5 w-5.5 text-foreground group-hover:text-primary" />
                {items.length > 0 && (
                  <Badge
                    variant="default"
                    className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-primary text-[10px] font-bold text-primary-foreground border-2 border-background flex items-center justify-center animate-in zoom-in"
                  >
                    {items.length}
                  </Badge>
                )}
              </Link>

              {user ? (
                <div className="flex items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="focus:outline-none relative group">
                      <Avatar className="h-10 w-10 border-2 border-transparent hover:border-primary/30 transition-all cursor-pointer active:scale-95 flex items-center justify-center">
                        <AvatarFallback><UserIcon className="h-5 w-5" /></AvatarFallback>
                      </Avatar>
                      {user.role !== "client" && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-[8px] font-black text-white px-1 rounded-full border border-background shadow-sm uppercase tracking-tighter">
                          Admin
                        </div>
                      )}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 p-2">
                      <DropdownMenuLabel className="px-3 py-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold leading-none text-foreground truncate">
                              {user.name}
                            </p>
                          </div>
                          <p className="text-xs leading-none text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="opacity-50" />
                      <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                          <Link to="/profile" className="w-full flex items-center gap-2.5">
                            <UserIcon className="h-4 w-4 opacity-70" />
                            <span>{t("nav.profile")}</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/profile/orders" className="w-full flex items-center gap-2.5">
                            <ShoppingBag className="h-4 w-4 opacity-70" />
                            <span>{t("nav.orders")}</span>
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator className="opacity-50" />
                      {user.role !== "client" && (
                        <>
                          <DropdownMenuGroup>
                            <DropdownMenuItem asChild>
                              <Link to="/admin" className="w-full flex items-center gap-2.5 text-primary font-bold">
                                <LayoutDashboard className="h-4 w-4" />
                                <span>{t("nav.admin")}</span>
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator className="opacity-50" />
                        </>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/profile?tab=settings" className="w-full flex items-center gap-2.5">
                          <Settings className="h-4 w-4 opacity-70" />
                          <span>{t("nav.settings")}</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="opacity-50" />
                      <DropdownMenuItem
                        onClick={handleLogout}
                        className="text-destructive focus:bg-destructive/5 focus:text-destructive font-bold flex items-center gap-2.5"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t("nav.logout")}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-3">
                  <Link to="/login">
                    <Button variant="ghost" size="sm" className="font-bold hover:bg-primary/5 rounded-full px-5">
                      {t("nav.login")}
                    </Button>
                  </Link>
                  <Link to="/register">
                    <Button size="sm" className="shadow-sm font-bold rounded-full px-6">
                      {t("nav.register")}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile Auth (if not logged in) */}
              {!user && (
                <div className="flex items-center md:hidden">
                  <Link to="/login" className="p-2.5 hover:bg-primary/5 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-foreground" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>


      {/* Main content */}
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
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
                {t("nav.footerText")}
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-5 text-sm tracking-wide uppercase text-muted-foreground/70">
                {t("nav.footerNav")}
              </h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <Link to="/catalog" className="text-muted-foreground hover:text-primary transition-colors">
                    {t("nav.catalog")}
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="text-muted-foreground hover:text-primary transition-colors">
                    {t("nav.createAccount")}
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
                    {t("nav.signIn")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-5 text-sm tracking-wide uppercase text-muted-foreground/70">
                {t("nav.contact")}
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
              © 2026 Tembleques Camila. {t("nav.footerRights")}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
              <Flower className="h-3.5 w-3.5 text-primary/40" />
              <span>{t("nav.madeInPanama")}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
