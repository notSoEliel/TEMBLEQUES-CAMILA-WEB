import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { rentalsApi, type RentalSummary } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  User, 
  ShoppingBag, 
  Settings, 
  MapPin, 
  Phone, 
  ChevronRight, 
  Package,
  Calendar,
  Clock,
  Sparkles,
  CreditCard,
  ArrowUpRight
} from "lucide-react";
import { formatCurrency, getLocalizedText, cn } from "@/lib/utils";
import { useErrorModal } from "@/components/ErrorModal";
import { useSearchParams, Link } from "react-router-dom";
import { useI18n } from "@/i18n";

type TabType = "account" | "rentals" | "settings";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  reserved: "bg-blue-50 text-blue-700 border-blue-200",
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  confirmed: "bg-indigo-100 text-indigo-700 border-indigo-200",
  delivered: "bg-purple-100 text-purple-700 border-purple-200",
  returned: "bg-slate-100 text-slate-700 border-slate-200",
  late: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
  damaged: "bg-orange-100 text-orange-700 border-orange-200",
};

function formatRentalDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export default function Profile() {
  const { user, token, updateProfile, logout } = useAuth();
  const { errorModal, showError } = useErrorModal();
  const { t, language } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [lastOrder, setLastOrder] = useState<(RentalSummary & {
    items: RentalSummary[];
    isBundle: boolean;
    totalPrice: number;
  }) | null>(null);
  const [orderItemsCount, setOrderItemsCount] = useState(0);
  const [totalRentals, setTotalRentals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    preferredAddress: "",
  });
  
  const activeTab = (searchParams.get("tab") as TabType) || "account";

  const STATUS_LABELS: Record<string, string> = {
    pending: t("status.pending"),
    reserved: t("status.reserved"),
    paid: t("status.paid"),
    confirmed: t("status.confirmed"),
    delivered: t("status.delivered"),
    returned: t("status.returned"),
    late: t("status.late"),
    cancelled: t("status.cancelled"),
    damaged: t("status.damaged"),
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  useEffect(() => {
    if (!user) return;
    const parts = user.name.split(" ");
    setProfileForm({
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      phone: user.phone ?? "",
      preferredAddress: user.preferredAddress ?? "",
    });
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await rentalsApi.my(token!, { page: 1, limit: 10, view: "active" });
      const rawRentals = response.data;
      setTotalRentals(response.pagination.total);

      if (rawRentals.length > 0) {
        const latest = rawRentals[0];
        const gid = latest.order_group_id;
        
        if (gid) {
          const bundle = rawRentals.filter((r) => r.order_group_id === gid);
          setLastOrder({
            ...latest,
            items: bundle,
            isBundle: bundle.length > 1,
            totalPrice: bundle.reduce((sum, r) => sum + r.total, 0)
          });
          setOrderItemsCount(bundle.length);
        } else {
          setLastOrder({
            ...latest,
            items: [latest],
            isBundle: false,
            totalPrice: latest.total
          });
          setOrderItemsCount(1);
        }
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    setSearchParams(params);
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const firstNameValue = String(formData.get("firstName") ?? profileForm.firstName);
    const lastNameValue = String(formData.get("lastName") ?? profileForm.lastName);
    const phoneValue = String(formData.get("phone") ?? profileForm.phone);
    const preferredAddressValue = String(formData.get("preferredAddress") ?? profileForm.preferredAddress);
    const fullName = `${firstNameValue} ${lastNameValue}`.trim();
    if (fullName.length < 2) {
      showError(t("profile.emptyName"), "validation");
      return;
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: fullName,
        phone: phoneValue,
        preferredAddress: preferredAddressValue,
      });
      showError(t("profile.saved"), "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el perfil.";
      showError(message, "generic");
    } finally {
      setSavingProfile(false);
    }
  };

  const nameParts = user?.name.split(" ") || ["", ""];
  const firstName = nameParts[0];
  const locale = language === "en" ? "en-US" : "es-PA";

  return (
    <div className="bg-background min-h-screen pt-24 pb-16 px-6">
      {errorModal}
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Editorial Header */}
        <header className={cn("space-y-4 transition-all duration-700", activeTab !== "account" && "opacity-40 scale-95 origin-left")}>
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-tight">
            {totalRentals > 0 ? (
              <>{t("profile.thanks")}, {firstName}.</>
            ) : (
              <>{t("profile.starts")}, {firstName}.</>
            )}
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl font-medium leading-relaxed max-w-2xl italic">
            "{t("profile.subtitle")}"
          </p>
        </header>

        {/* 3-Tab Clean Navigation */}
        <div role="tablist" aria-label={t("profile.navigation")} className="flex gap-2 p-1 bg-muted/40 rounded-full border border-border/40 w-fit overflow-x-auto no-scrollbar">
          {[
            { id: "account", label: t("profile.account"), icon: User },
            { id: "rentals", label: t("profile.rentals"), icon: ShoppingBag },
            { id: "settings", label: t("profile.settings"), icon: Settings }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              id={`profile-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`profile-panel-${tab.id}`}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-full text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-primary text-white shadow-elegant" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <tab.icon aria-hidden="true" className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* MI CUENTA */}
          {activeTab === "account" && (
            <div id="profile-panel-account" role="tabpanel" aria-labelledby="profile-tab-account" className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="md:col-span-2 border-none shadow-elegant-lg rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-10 pb-4">
                  <CardTitle className="text-3xl font-display font-bold">{t("profile.identity")}</CardTitle>
                </CardHeader>
                <CardContent className="p-10 pt-0 space-y-8">
                  <form className="space-y-8" onSubmit={handleProfileSubmit}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="profile-first-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("profile.firstName")}</Label>
                      <Input
                        id="profile-first-name"
                        name="firstName"
                        value={profileForm.firstName}
                        onChange={(event) => setProfileForm((current) => ({ ...current, firstName: event.target.value }))}
                        autoComplete="given-name"
                        className="rounded-2xl border-border/40 focus:ring-primary/20 h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-last-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("profile.lastName")}</Label>
                      <Input
                        id="profile-last-name"
                        name="lastName"
                        value={profileForm.lastName}
                        onChange={(event) => setProfileForm((current) => ({ ...current, lastName: event.target.value }))}
                        autoComplete="family-name"
                        className="rounded-2xl border-border/40 focus:ring-primary/20 h-12"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2 space-y-2">
                      <Label htmlFor="profile-email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("profile.email")}</Label>
                      <Input id="profile-email" defaultValue={user?.email} disabled className="rounded-2xl bg-muted/20 border-border/20 opacity-60 h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-phone" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("profile.phone")}</Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          id="profile-phone"
                          name="phone"
                          value={profileForm.phone}
                          onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                          placeholder="+507 0000-0000"
                          autoComplete="tel"
                          className="pl-11 rounded-2xl border-border/40 focus:ring-primary/20 h-12"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="profile-address" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("profile.address")}</Label>
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
                        <Input
                          id="profile-address"
                          name="preferredAddress"
                          value={profileForm.preferredAddress}
                          onChange={(event) => setProfileForm((current) => ({ ...current, preferredAddress: event.target.value }))}
                          placeholder="Ciudad de Panamá..."
                          autoComplete="street-address"
                          className="pl-11 rounded-2xl border-border/40 focus:ring-primary/20 h-12"
                        />
                      </div>
                    </div>
                  </div>
                  <Separator className="bg-border/20" />
                  <Button type="submit" disabled={savingProfile} className="rounded-full px-10 h-11 shadow-elegant font-bold w-full sm:w-auto">
                    {savingProfile ? t("profile.saving") : t("profile.save")}
                  </Button>
                  </form>
                </CardContent>
              </Card>
              
              <div className="space-y-8">
                <Card className="border-none shadow-elegant bg-muted/20 rounded-[2.5rem] p-10 text-center">
                  <div className="space-y-6">
                    <div className="h-16 w-16 rounded-3xl bg-primary/5 flex items-center justify-center text-primary mx-auto rotate-6">
                      <Sparkles className="h-8 w-8" />
                    </div>
                    <div className="space-y-2">
                      <Badge className="bg-primary/5 text-primary border border-primary/20 rounded-full px-4 py-0.5 text-[9px] font-black tracking-widest uppercase">
                        {t("profile.upcoming")}
                      </Badge>
                      <h3 className="text-2xl font-display font-black leading-tight text-foreground">{t("profile.clubTitle")}</h3>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed italic">
                      "{t("profile.clubDesc")}"
                    </p>
                  </div>
                </Card>
                <Card className="border-none shadow-elegant bg-primary/5 rounded-[2.5rem] p-10">
                  <div className="space-y-4">
                    <CreditCard className="h-8 w-8 text-primary/40 mx-auto" />
                    <h3 className="text-lg font-bold text-center">{t("profile.securePaymentsTitle")}</h3>
                    <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-black">{t("profile.securePaymentsDesc")}</p>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* MIS ALQUILERES */}
          {activeTab === "rentals" && (
            <div id="profile-panel-rentals" role="tabpanel" aria-labelledby="profile-tab-rentals" className="space-y-12">
              {loading ? (
                <div className="h-64 flex items-center justify-center" role="status" aria-live="polite">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <span className="sr-only">{t("profile.loadingRentals")}</span>
                </div>
              ) : lastOrder ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-2xl font-display font-bold italic flex items-center gap-3">
                        <Clock className="h-6 w-6 text-primary" />
                        {t("profile.recentOrderTitle")}
                      </h3>
                      <Link to="/profile/orders" className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 hover:opacity-70 transition-opacity">
                        {t("profile.viewFullHistory")} <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </div>

                    <Card className="border-none shadow-elegant-lg rounded-[2.5rem] overflow-hidden group">
                      <CardContent className="p-0">
                        <div className="flex flex-col sm:flex-row">
                          <div className="sm:w-64 h-72 sm:h-auto overflow-hidden relative">
                            <img 
                              src={lastOrder.product_id?.images?.[0] || "/placeholder.png"} 
                              alt={getLocalizedText(lastOrder.product_id?.name || t("profile.rentalPiece"), lastOrder.product_id?.name_en, language)}
                              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                            />
                            {lastOrder.isBundle && (
                              <Badge className="absolute top-4 left-4 bg-black/60 text-white border-none rounded-full px-4 font-black text-[9px] uppercase tracking-widest">
                                {t("profile.bundle")}: {orderItemsCount} {t("profile.pieces")}
                              </Badge>
                            )}
                          </div>
                          <div className="flex-1 p-10 space-y-6">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Ref: #{lastOrder._id.slice(-8).toUpperCase()}</p>
                                <h4 className="text-3xl font-display font-bold leading-tight">
                                  {lastOrder.isBundle
                                    ? t("profile.folkloreCollection")
                                    : getLocalizedText(lastOrder.product_id?.name || t("profile.rentalPiece"), lastOrder.product_id?.name_en, language)}
                                </h4>
                              </div>
                              <Badge className={cn("rounded-full px-5 py-1.5 text-[9px] font-black tracking-widest uppercase border", STATUS_COLORS[lastOrder.status] ?? "bg-muted text-muted-foreground border-border")}>
                                {STATUS_LABELS[lastOrder.status] ?? t("status.unknown")}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center gap-8 text-xs font-bold text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary/40" />
                                {formatRentalDate(lastOrder.start_date, locale)}
                              </div>
                              <ChevronRight className="h-3 w-3 opacity-20" />
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary/40" />
                                {formatRentalDate(lastOrder.end_date, locale)}
                              </div>
                            </div>
                            
                            <Separator className="bg-border/20" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                              <div className="space-y-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{t("profile.culturalInvestment")}</p>
                                <span className="text-3xl font-display font-black text-primary">{formatCurrency(lastOrder.totalPrice)}</span>
                              </div>
                              <Button asChild variant="outline" className="rounded-full px-8 h-10 shadow-sm font-bold border-primary/30 text-primary hover:bg-primary/5">
                                <Link to="/profile/orders">
                                  {t("profile.manageRental")} <ChevronRight className="h-4 w-4 ml-2" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-2xl font-display font-bold italic">{t("checkout.summaryTitle")}</h3>
                    <Card className="border-none shadow-elegant rounded-[2.5rem] p-10 space-y-10 bg-muted/20">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t("profile.activeRentals")}</p>
                        <p className="text-6xl font-display font-black">{totalRentals}</p>
                      </div>
                      <Separator className="bg-border/40" />
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                            <Package aria-hidden="true" className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{t("profile.latestPiece")}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {getLocalizedText(lastOrder.product_id?.name || t("profile.rentalPiece"), lastOrder.product_id?.name_en, language)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              ) : (
                <Card className="border-2 border-dashed border-border/40 rounded-[3rem] p-24 text-center space-y-8 bg-muted/5">
                  <div className="h-24 w-24 rounded-full bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground/20">
                    <ShoppingBag className="h-12 w-12" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-display font-bold italic">{t("profile.emptyArmarioTitle")}</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto text-sm">
                      {t("profile.emptyArmarioDesc")}
                    </p>
                  </div>
                  <Button asChild className="rounded-full px-12 h-11 shadow-elegant font-bold">
                    <Link to="/catalog">{t("cart.exploreBtn")}</Link>
                  </Button>
                </Card>
              )}
            </div>
          )}

          {/* AJUSTES */}
          {activeTab === "settings" && (
            <div id="profile-panel-settings" role="tabpanel" aria-labelledby="profile-tab-settings" className="max-w-2xl space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
              <div className="space-y-2">
                <h3 className="text-3xl font-display font-bold">{t("profile.settings")}</h3>
                <p className="text-sm text-muted-foreground">{t("profile.settingsDesc")}</p>
              </div>
              
              <Card className="border-none shadow-elegant rounded-[2.5rem] p-10 space-y-10">
                <div className="space-y-8">
                  <div className="flex items-center justify-between opacity-40">
                    <div className="space-y-1">
                      <p className="font-bold">{t("profile.whatsappNotifications")}</p>
                      <p className="text-xs text-muted-foreground">{t("profile.whatsappNotificationsDesc")}</p>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-muted" />
                  </div>
                  <Separator className="bg-border/20" />
                  <div className="flex items-center justify-between opacity-40">
                    <div className="space-y-1">
                      <p className="font-bold">{t("profile.biometricsSecurity")}</p>
                      <p className="text-xs text-muted-foreground">{t("profile.biometricsSecurityDesc")}</p>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-muted" />
                  </div>
                </div>
                
                <div className="pt-6 flex flex-col sm:flex-row gap-4">
                  <Badge variant="outline" className="border-primary/20 text-primary rounded-full px-6 py-2 text-[10px] font-black uppercase tracking-widest w-fit mx-auto sm:mx-0">
                    {t("profile.featuresInDevelopment")}
                  </Badge>
                  <Button variant="destructive" className="rounded-full px-10 font-bold opacity-80 hover:opacity-100 transition-opacity ml-auto" onClick={logout}>
                    {t("profile.logoutBtn")}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
