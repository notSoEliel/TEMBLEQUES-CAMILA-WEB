import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { rentalsApi, type PaginationMetadata } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  ShoppingBag, 
  ChevronRight, 
  Package,
  Calendar,
  ChevronLeft,
  Info,
  X,
  AlertCircle
} from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { useErrorModal } from "@/components/ErrorModal";
import { useSearchParams, Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useI18n } from "@/i18n";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  reserved: "bg-blue-50 text-blue-600 border-blue-100",
  paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
  confirmed: "bg-indigo-50 text-indigo-600 border-indigo-100",
  delivered: "bg-purple-50 text-purple-600 border-purple-100",
  returned: "bg-slate-50 text-slate-600 border-slate-100",
  late: "bg-red-50 text-red-600 border-red-100",
  cancelled: "bg-gray-50 text-gray-400 border-gray-100",
};

interface OrderGroup {
  id: string;
  rentals: any[];
  total: number;
  date: Date;
  status: string;
}

export default function Orders() {
  const { token } = useAuth();
  const { errorModal } = useErrorModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useI18n();
  
  const [groupedOrders, setGroupedOrders] = useState<OrderGroup[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderGroup | null>(null);
  
  const view = searchParams.get("view") || "active";
  const page = Number(searchParams.get("page")) || 1;

  const STATUS_LABELS: Record<string, string> = {
    pending: t("status.pending"),
    reserved: t("status.reserved"),
    paid: t("status.paid"),
    confirmed: t("status.confirmed"),
    delivered: t("status.delivered"),
    returned: t("status.returned"),
    late: t("status.late"),
    cancelled: t("status.cancelled"),
  };

  useEffect(() => {
    if (token) {
      loadOrders();
    }
  }, [token, view, page]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await rentalsApi.my(token!, { page, limit: 8, view });
      const rawRentals = response.data;
      setPagination(response.pagination);

      // Grouping logic
      const groups: Record<string, any[]> = {};
      rawRentals.forEach((r: any) => {
        const gid = r.order_group_id || r._id;
        if (!groups[gid]) groups[gid] = [];
        groups[gid].push(r);
      });

      const processedGroups: OrderGroup[] = Object.entries(groups).map(([id, items]) => ({
        id,
        rentals: items,
        total: items.reduce((sum, item) => sum + item.total, 0),
        date: new Date(items[0].createdAt),
        status: items[0].status
      })).sort((a, b) => b.date.getTime() - a.date.getTime());

      setGroupedOrders(processedGroups);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(newPage));
    setSearchParams(params);
    window.scrollTo(0, 0);
  };

  const handleViewChange = (newView: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", newView);
    params.set("page", "1");
    setSearchParams(params);
  };

  const locale = language === "en" ? "en-US" : "es-PA";

  return (
    <div className="bg-background min-h-screen pt-24 pb-16 px-6">
      {errorModal}
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Link to="/profile" className="text-primary font-bold text-sm flex items-center gap-2 hover:opacity-70 transition-opacity w-fit">
              <ChevronLeft className="h-4 w-4" />
              {t("review.backBtn")}
            </Link>
            <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight leading-relaxed py-2">
              {t("orders.historyTitlePrefix")} <span className="text-primary">{t("orders.historyTitleAccent")}</span>
            </h1>
          </div>
          
          <div className="flex gap-2 p-1 bg-muted/40 rounded-full border border-border/40 w-fit">
            <button 
              onClick={() => handleViewChange("active")}
              className={cn("px-6 py-2 rounded-full text-xs font-bold transition-all", view === "active" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t("orders.tabActive")}
            </button>
            <button 
              onClick={() => handleViewChange("cancelled")}
              className={cn("px-6 py-2 rounded-full text-xs font-bold transition-all", view === "cancelled" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {t("orders.tabCancelled")}
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : groupedOrders.length === 0 ? (
            <Card className="border-2 border-dashed border-border/60 rounded-[3rem] p-20 text-center space-y-6 bg-muted/5">
              <div className="h-20 w-20 rounded-full bg-muted/40 flex items-center justify-center mx-auto text-muted-foreground/30">
                <ShoppingBag className="h-10 w-10" />
              </div>
              <p className="text-xl font-display font-bold italic text-muted-foreground">{t("orders.noOrders")}</p>
              <Button className="rounded-full px-10 shadow-elegant font-bold" onClick={() => window.location.href='/catalog'}>
                {t("cart.exploreBtn")}
              </Button>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {groupedOrders.map((order) => (
                  <Card key={order.id} className="border-none shadow-elegant rounded-[2rem] overflow-hidden hover:shadow-elegant-lg transition-all duration-500 group">
                    <CardContent className="p-0">
                       <div className="flex flex-col sm:flex-row items-center gap-6 p-6 sm:p-8">
                        <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden border border-border/20 shadow-sm relative">
                          <img src={order.rentals[0].product_id?.images?.[0] || "/placeholder.png"} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          {order.rentals.length > 1 && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-[10px] font-black text-white">
                              +{order.rentals.length - 1}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-2 text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">ID: #{order.id.slice(-8).toUpperCase()}</p>
                            <Badge className={cn("rounded-full px-3 py-0.5 text-[9px] font-black tracking-widest uppercase border mx-auto sm:mx-0", STATUS_COLORS[order.status])}>
                              {STATUS_LABELS[order.status]}
                            </Badge>
                          </div>
                          <h4 className="text-xl font-display font-bold">
                            {order.rentals.length > 1 ? t("orders.comboPremium") : order.rentals[0].product_id?.name}
                          </h4>
                          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-medium text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              {order.date.toLocaleDateString(locale)}
                            </div>
                            <div className="flex items-center gap-1.5 font-bold text-primary">
                              {formatCurrency(order.total)}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            className="rounded-full px-6 font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            onClick={() => setSelectedOrder(order)}
                          >
                            {t("orders.detailsBtn")} <Info className="h-4 w-4 ml-2 opacity-40" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination - Always visible as requested */}
              <div className="flex items-center justify-center gap-4 pt-8">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-10 w-10 p-0 border-border/40"
                  disabled={page === 1 || !pagination}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  {t("orders.page")} {page} {t("orders.of")} {pagination?.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full h-10 w-10 p-0 border-border/40"
                  disabled={!pagination || page === pagination.totalPages || pagination.totalPages === 0}
                  onClick={() => handlePageChange(page + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RENTAL DETAIL DIALOG (REFINDED) */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden bg-background">
          {selectedOrder && (
            <div className="flex flex-col max-h-[85vh]">
              {/* Refined Header - No more strong magenta */}
              <div className="p-8 border-b border-border/10 bg-muted/20">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="border-primary/30 text-primary rounded-full px-4 py-0.5 text-[10px] font-black tracking-widest uppercase">
                    {t("orders.detailTitle")}
                  </Badge>
                </div>
                <DialogTitle className="text-4xl font-display font-black tracking-tighter text-foreground">
                  #{selectedOrder.id.slice(-8).toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium mt-1">
                  {t("orders.orderPlacedOn")} {selectedOrder.date.toLocaleDateString(locale)}
                </DialogDescription>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                <div className="space-y-4">
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("orders.includedItems")}</h5>
                  <div className="grid gap-4">
                    {selectedOrder.rentals.map((item) => (
                      <div key={item._id} className="flex flex-col gap-3 p-5 rounded-[1.5rem] bg-muted/20 border border-border/10 group hover:bg-muted/30 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-xl overflow-hidden bg-white shadow-sm shrink-0">
                            <img src={item.product_id?.images?.[0] || "/placeholder.png"} alt="" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                          </div>
                          <div className="flex-1 space-y-0.5">
                            <p className="font-bold text-foreground">{item.product_id?.name}</p>
                            <p className="text-xs text-muted-foreground">{t("cart.size")} {item.selected_size} • {formatCurrency(item.total)}</p>
                          </div>
                          <Badge className={cn("rounded-full px-3 py-0.5 text-[8px] font-black tracking-widest uppercase border", STATUS_COLORS[item.status])}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                        </div>

                        {item.status_history && item.status_history.length > 0 && (
                          <div className="mt-1 p-3 bg-white/60 rounded-xl border border-border/10 text-xs space-y-1.5">
                            <p className="font-bold text-[8px] uppercase tracking-wider text-muted-foreground">{t("orders.rentalProgress")}</p>
                            <div className="relative border-l border-primary/20 pl-3 ml-1 space-y-2">
                              {item.status_history.map((h: any, hIdx: number) => (
                                <div key={hIdx} className="relative">
                                  <div className="absolute -left-[15.5px] top-1.5 w-1 h-1 rounded-full bg-primary" />
                                  <div className="flex justify-between items-start gap-4">
                                    <div>
                                      <span className="font-semibold text-foreground uppercase text-[9px]">
                                        {STATUS_LABELS[h.status] || h.status}
                                      </span>
                                      {h.notes && <p className="text-[9px] text-muted-foreground mt-0.5">{h.notes}</p>}
                                    </div>
                                    <span className="text-[8px] text-muted-foreground font-mono">
                                      {new Date(h.timestamp).toLocaleDateString(locale)}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("orders.periodInfo")}</h5>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-primary shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold">{t("orders.datesReservation")}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {new Date(selectedOrder.rentals[0].start_date + "T12:00:00").toLocaleDateString(locale)} al {new Date(selectedOrder.rentals[0].end_date + "T12:00:00").toLocaleDateString(locale)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-primary shrink-0" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold">{t("orders.returnPolicy")}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{t("orders.returnPolicyDesc")}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t("confirmation.paymentSummaryTitle")}</h5>
                    <Card className="border-none shadow-elegant bg-primary/5 p-6 rounded-3xl">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("review.subtotalRental")}</span>
                          <span className="font-bold text-foreground">{formatCurrency(selectedOrder.total)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{t("orders.cleaningInsurance")}</span>
                          <span className="font-bold text-foreground">{t("orders.included")}</span>
                        </div>
                        <Separator className="bg-primary/10 my-3" />
                        <div className="flex justify-between items-end">
                          <span className="font-display font-bold italic text-lg">{t("orders.total")}</span>
                          <span className="font-display font-black text-2xl text-primary">{formatCurrency(selectedOrder.total)}</span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-border/10 flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/5">
                <Button variant="ghost" className="rounded-full px-8 font-bold text-muted-foreground" onClick={() => setSelectedOrder(null)}>
                  {t("orders.closeBtn")}
                </Button>
                <div className="flex gap-3 w-full sm:w-auto">
                  {selectedOrder.status === "pending" && (
                    <Button className="flex-1 sm:flex-none rounded-full px-10 shadow-elegant font-bold">
                      {t("orders.payRentalBtn")}
                    </Button>
                  )}
                  <Button variant="outline" className="flex-1 sm:flex-none rounded-full px-8 font-bold border-border/40">
                    {t("orders.supportBtn")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
