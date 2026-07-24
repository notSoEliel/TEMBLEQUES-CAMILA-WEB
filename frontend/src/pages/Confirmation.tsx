import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { rentalsApi, type RentalSummary } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { formatCurrency, formatLocalizedDate, getLocalizedText } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function Confirmation() {
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const { t, language } = useI18n();
  const [rental, setRental] = useState<RentalSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const rentalId  = searchParams.get("rental");
  const sessionId = searchParams.get("session_id");

  const statusLabels: Record<string, string> = {
    paid:      t("status.paid"),
    pending:   t("status.pending"),
    reserved:  t("status.reserved"),
    confirmed: t("status.confirmed"),
    cancelled: t("status.cancelled"),
    delivered: t("status.delivered"),
    returned:  t("status.returned"),
    damaged:   t("status.damaged"),
    late:      t("status.late"),
  };

  useEffect(() => {
    if (!token) return;
    
    const fetchSession = async () => {
      try {
        if (sessionId) {
          await import("@/services/api").then(m => m.stripeApi.verifySession(sessionId, token));
        }
        
        if (rentalId) {
          const data = await rentalsApi.get(rentalId, token);
          setRental(data.rental);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [rentalId, sessionId, token]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">{t("confirm.verifying")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {/* Hero */}
      <div className="mb-8">
        <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary mb-6">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-3xl font-bold mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          {t("confirm.successTitle")}
        </h1>
        <p className="text-muted-foreground">
          {t("confirm.successSubtitle")}
        </p>
        {sessionId && (
          <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
            {t("confirm.sessionLabel")} {sessionId.slice(0, 24)}…
          </p>
        )}
      </div>

      {/* Rental details */}
      {rental ? (
        <Card className="text-left mb-8 border border-border/60 shadow-elegant">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-bold text-lg leading-none">{t("confirm.detailsTitle")}</h3>
            <Separator className="bg-black/10" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">{t("confirm.productLabel")}</p>
                <p className="font-bold text-primary">
                  {getLocalizedText(rental.product_id?.name || t("profile.rentalPiece"), rental.product_id?.name_en, language)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">{t("confirm.statusLabel")}</p>
                <p className="font-bold">{statusLabels[rental.status] ?? t("status.unknown")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">{t("confirm.startDateLabel")}</p>
                <p className="font-bold">{formatLocalizedDate(rental.start_date, language)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">{t("confirm.endDateLabel")}</p>
                <p className="font-bold">{formatLocalizedDate(rental.end_date, language)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">{t("confirm.totalLabel")}</p>
                <p className="font-black text-primary text-xl">{formatCurrency(rental.total)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5 uppercase tracking-tighter font-bold">{t("confirm.idLabel")}</p>
                <p className="font-mono text-[10px] text-muted-foreground break-all">{rental._id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : sessionId ? (
        <Card className="mb-8 border border-border/60 shadow-elegant bg-primary/5">
          <CardContent className="p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-primary/20 p-2 rounded-full">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <p className="font-bold text-lg">{t("confirm.multiTitle")}</p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {t("confirm.multiSubtitle")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-8 border border-border/60 shadow-elegant">
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              {t("confirm.processingDetails")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* What's next */}
      <Card className="text-left mb-8">
        <CardContent className="p-6">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">{t("confirm.nextTitle")}</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">01</span>{t("confirm.nextStep1")}</li>
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">02</span>{t("confirm.nextStep2")}</li>
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">03</span>{t("confirm.nextStep3")}</li>
            <li className="flex gap-3"><span className="text-primary font-bold shrink-0">04</span>{t("confirm.nextStep4")}</li>
          </ol>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild>
          <Link to="/profile">
            <Calendar className="h-4 w-4 mr-2" />
            {t("confirm.viewReservationsBtn")}
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/catalog">
            {t("confirm.continueBtn")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
