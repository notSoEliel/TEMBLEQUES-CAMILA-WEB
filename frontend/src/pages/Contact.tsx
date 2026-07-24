import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Mail, Phone, ExternalLink, Send } from "lucide-react";
import { MapContainer, TileLayer, Marker, ZoomControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ApiError, contactApi } from "@/services/api";
import { useErrorModal } from "@/components/ErrorModal";
import { useI18n } from "@/i18n";

// Fix Leaflet icon issue
const customIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background-color: var(--primary); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.2);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function Contact() {
  const position: [number, number] = [8.9525, -79.5342]; // Centered in Casco Viejo
  const { errorModal, showError } = useErrorModal();
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleOpenMaps = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`, "_blank");
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setSubmitted(false);
    try {
      const response = await contactApi.submit(form);
      setForm({ name: "", email: "", message: "" });
      setSubmitted(true);
      showError(response.message, "success");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo enviar el mensaje.";
      setSubmitError(message);
      const variant = error instanceof ApiError && error.kind === "network" || error instanceof ApiError && error.kind === "timeout"
        ? "network"
        : error instanceof ApiError && error.kind === "validation" ? "validation" : "generic";
      showError(message, variant);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen py-24 px-6">
      {errorModal}
      <div className="max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-display font-black tracking-tight leading-tight py-2">
            {t("contact.titlePrefix")} <span className="text-primary italic">{t("contact.titleAccent")}</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-medium leading-relaxed">
            {t("contact.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Left Column: Form & Info */}
          <div className="space-y-12 order-2 lg:order-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold">{t("contact.call")}</h4>
                  <a href="tel:+50788888888" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors">+507 8888-8888</a>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold">{t("contact.write")}</h4>
                  <a href="mailto:contacto@temblequescamila.pa" className="text-sm text-muted-foreground font-medium hover:text-primary transition-colors break-all">contacto@temblequescamila.pa</a>
                </div>
              </div>
            </div>

            <form className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700" onSubmit={handleSubmit} noValidate={false}>
              {submitError && (
                <div id="contact-form-error" role="alert" aria-live="assertive" className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive">
                  {submitError}
                </div>
              )}
              {submitted && (
                <p role="status" aria-live="polite" className="rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4 text-sm text-foreground">
                  {t("contact.successDescription")}
                </p>
              )}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest pl-4">{t("contact.name")}</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder={t("contact.namePlaceholder")}
                      autoComplete="name"
                      required
                      minLength={2}
                      aria-invalid={Boolean(submitError)}
                      aria-describedby={submitError ? "contact-form-error" : undefined}
                      className="h-14 px-6 border-border/40 focus:border-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest pl-4">{t("contact.email")}</Label>
                    <Input
                      id="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      type="email"
                      placeholder={t("contact.emailPlaceholder")}
                      autoComplete="email"
                      required
                      aria-invalid={Boolean(submitError)}
                      aria-describedby={submitError ? "contact-form-error" : undefined}
                      className="h-14 px-6 border-border/40 focus:border-primary/20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs font-black uppercase tracking-widest pl-4">{t("contact.message")}</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                    placeholder={t("contact.messagePlaceholder")}
                    required
                    minLength={10}
                    aria-invalid={Boolean(submitError)}
                    aria-describedby={submitError ? "contact-form-error" : undefined}
                    className="min-h-[160px] px-6 py-4 border-border/40 focus:border-primary/20"
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting} aria-busy={submitting} className="w-full h-14 rounded-full font-bold text-lg shadow-elegant group">
                {submitting ? t("contact.submitting") : t("contact.submit")}
                <Send className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </form>
          </div>

          {/* Right Column: Map */}
          <div className="space-y-6 order-1 lg:order-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="text-xl font-display font-bold">{t("contact.location")}</h3>
            </div>
            
            <div className="relative aspect-square md:aspect-video lg:aspect-square w-full rounded-[2rem] overflow-hidden shadow-elegant border border-border/10 bg-muted/20">
              {/* Overlay with instructions for interactive use could go here, but user wants it visual static */}
              <div className="absolute inset-0 z-0">
                <MapContainer 
                  center={position} 
                  zoom={15} 
                  className="h-full w-full" 
                  scrollWheelZoom={false} 
                  dragging={false}
                  zoomControl={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                  />
                  <Marker position={position} icon={customIcon} />
                </MapContainer>
              </div>

              {/* Floating "How to get there" Button */}
              <div className="absolute bottom-6 right-6 z-[400]">
                <Button 
                  onClick={handleOpenMaps}
                  className="rounded-full px-6 h-11 shadow-elegant-lg font-bold bg-background text-foreground hover:bg-muted border-border/20"
                >
                  {t("contact.directions")}
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
            
            <div className="bg-muted/30 p-6 rounded-[2rem] border border-border/20">
              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {t("contact.locationNote")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
