import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, type AdminIncident, type AdminIncidentSeverity, type AdminIncidentStatus, type AdminIncidentType, type PaginationMetadata } from "@/services/api";
import { useErrorModal } from "@/components/ErrorModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TYPE_LABELS: Record<AdminIncidentType, string> = { damage: "Daño", late_return: "Devolución atrasada", payment_issue: "Problema de pago", customer_complaint: "Queja de cliente", maintenance: "Mantenimiento", other: "Otro" };
const STATUS_LABELS: Record<AdminIncidentStatus, string> = { open: "Abierta", in_review: "En revisión", resolved: "Resuelta", closed: "Cerrada" };
const SEVERITY_LABELS: Record<AdminIncidentSeverity, string> = { low: "Baja", medium: "Media", high: "Alta", critical: "Crítica" };

const defaultForm: { type: AdminIncidentType; severity: AdminIncidentSeverity; description: string; rentalId: string } = { type: "other", severity: "medium", description: "", rentalId: "" };

export default function AdminIncidents() {
  const { token } = useAuth();
  const { errorModal, showError } = useErrorModal();
  const [searchParams, setSearchParams] = useSearchParams();
  const [incidents, setIncidents] = useState<AdminIncident[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadIncidents = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await adminApi.incidents(token, {
        search: searchParams.get("search") || undefined,
        status: (searchParams.get("status") as AdminIncidentStatus | null) || undefined,
        severity: (searchParams.get("severity") as AdminIncidentSeverity | null) || undefined,
        page: Number(searchParams.get("page")) || 1,
        limit: Number(searchParams.get("limit")) || 10,
      });
      setIncidents(response.data);
      setPagination(response.pagination);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron cargar las incidencias.", "generic");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadIncidents(); }, [token, searchParams]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    const normalized = search.trim();
    if (normalized) next.set("search", normalized); else next.delete("search");
    next.set("page", "1");
    setSearchParams(next);
  };

  const createIncident = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      await adminApi.createIncident({ type: form.type, severity: form.severity, description: form.description, rentalId: form.rentalId.trim() || undefined }, token);
      setForm(defaultForm);
      await loadIncidents();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo registrar la incidencia.", "validation");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (incident: AdminIncident, status: AdminIncidentStatus) => {
    if (!token || incident.status === status) return;
    try {
      await adminApi.updateIncident(incident._id, { status }, token);
      await loadIncidents();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo actualizar la incidencia.", "generic");
    }
  };

  return (
    <div className="space-y-6">
      {errorModal}
      <div><h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Incidencias</h1><p className="mt-1 text-muted-foreground">Registra y da seguimiento a casos operativos sin ejecutar automáticamente cambios financieros.</p></div>

      <Card>
        <CardHeader><CardTitle>Registrar incidencia</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={createIncident} className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AdminIncidentType })} className="flex h-10 w-full rounded-xl border border-border/60 bg-background px-3"><option value="damage">Daño</option><option value="late_return">Devolución atrasada</option><option value="payment_issue">Problema de pago</option><option value="customer_complaint">Queja de cliente</option><option value="maintenance">Mantenimiento</option><option value="other">Otro</option></select></label>
            <label className="space-y-1 text-sm font-medium">Severidad<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as AdminIncidentSeverity })} className="flex h-10 w-full rounded-xl border border-border/60 bg-background px-3"><option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label>
            <label className="space-y-1 text-sm font-medium md:col-span-2">ID de reserva (opcional)<Input value={form.rentalId} onChange={(event) => setForm({ ...form, rentalId: event.target.value })} placeholder="ObjectId de la reserva relacionada" /></label>
            <label className="space-y-1 text-sm font-medium md:col-span-2">Descripción<Textarea required minLength={10} maxLength={3000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Describe el hecho, impacto y contexto operativo." /></label>
            <Button type="submit" disabled={saving} className="md:col-span-2">{saving ? "Guardando..." : "Registrar incidencia"}</Button>
          </form>
        </CardContent>
      </Card>

      <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row" role="search"><label htmlFor="incident-search" className="sr-only">Buscar incidencias</label><Input id="incident-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar en las descripciones" /><Button type="submit"><Search className="mr-2 h-4 w-4" />Buscar</Button></form>

      {loading ? <div className="min-h-40 animate-pulse rounded-[var(--radius)] border bg-muted/30" /> : incidents.length === 0 ? <Card><CardContent className="p-8 text-center"><AlertTriangle className="mx-auto mb-3 h-10 w-10 text-muted-foreground" /><p className="font-semibold">No hay incidencias con estos filtros.</p></CardContent></Card> : <div className="space-y-4">{incidents.map((incident) => <Card key={incident._id}><CardContent className="space-y-4 p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><div className="flex flex-wrap gap-2"><Badge variant={incident.severity === "critical" || incident.severity === "high" ? "destructive" : "outline"}>{SEVERITY_LABELS[incident.severity]}</Badge><Badge variant="secondary">{TYPE_LABELS[incident.type]}</Badge><Badge>{STATUS_LABELS[incident.status]}</Badge></div><p className="mt-3 font-semibold">{incident.description}</p><p className="mt-1 text-sm text-muted-foreground">{incident.user_id?.name || "Sin cliente asociado"}{incident.product_id ? ` · ${incident.product_id.name}` : ""}{incident.rental_id ? ` · Reserva ${incident.rental_id._id}` : ""}</p></div><div className="flex items-start gap-2"><select aria-label={`Estado de incidencia ${incident._id}`} value={incident.status} onChange={(event) => void updateStatus(incident, event.target.value as AdminIncidentStatus)} className="h-9 rounded-xl border border-border/60 bg-background px-2 text-sm">{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div><div className="border-t pt-3 text-xs text-muted-foreground"><p className="mb-2 font-semibold">Última actividad</p>{incident.timeline.at(-1)?.note || "Sin nota adicional"} · {new Date(incident.timeline.at(-1)?.timestamp || incident.updatedAt).toLocaleString("es-PA")}</div>{incident.status === "resolved" || incident.status === "closed" ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Incidencia finalizada" /> : null}</CardContent></Card>)}</div>}

      {pagination && pagination.totalPages > 1 && <div className="flex items-center justify-between border-t pt-4 text-sm"><span>Total: {pagination.total}</span><div className="flex gap-2"><Button variant="outline" disabled={pagination.page <= 1} onClick={() => { const next = new URLSearchParams(searchParams); next.set("page", String(pagination.page - 1)); setSearchParams(next); }}>Anterior</Button><span className="px-2 py-2">Página {pagination.page} de {pagination.totalPages}</span><Button variant="outline" disabled={pagination.page >= pagination.totalPages} onClick={() => { const next = new URLSearchParams(searchParams); next.set("page", String(pagination.page + 1)); setSearchParams(next); }}>Siguiente</Button></div></div>}
    </div>
  );
}
