import React, { useEffect, useState } from "react";
import { Mail, Archive, Eye, Inbox, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { adminApi, type PaginationMetadata } from "@/services/api";
import type { ContactStatus, IContactMessage } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useErrorModal } from "@/components/ErrorModal";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<ContactStatus, string> = {
  unread: "Sin leer",
  read: "Leído",
  archived: "Archivado",
};

const STATUS_COLORS: Record<ContactStatus, string> = {
  unread: "bg-primary/10 text-primary border-primary/20",
  read: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-muted text-muted-foreground border-border/60",
};

export default function AdminContacts() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { errorModal, showError } = useErrorModal();
  const [contacts, setContacts] = useState<IContactMessage[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const currentPage = Number(searchParams.get("page")) || 1;
  const currentLimit = Number(searchParams.get("limit")) || 10;
  const currentStatus = (searchParams.get("status") as ContactStatus | null) || undefined;

  useEffect(() => {
    if (!searchParams.get("page") || !searchParams.get("limit")) {
      const next = new URLSearchParams(searchParams);
      if (!next.get("page")) next.set("page", "1");
      if (!next.get("limit")) next.set("limit", "10");
      setSearchParams(next, { replace: true });
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadContacts();
    }
  }, [token, searchParams]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const response = await adminApi.contacts(token!, {
        page: currentPage,
        limit: currentLimit,
        status: currentStatus,
      });
      setContacts(response.data);
      setPagination(response.pagination);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los mensajes.";
      showError(message, "generic");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: ContactStatus) => {
    try {
      await adminApi.updateContactStatus(id, status, token!);
      await loadContacts();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el mensaje.";
      showError(message, "generic");
    }
  };

  const handleStatusFilter = (status?: ContactStatus) => {
    const next = new URLSearchParams(searchParams);
    if (status) next.set("status", status);
    else next.delete("status");
    next.set("page", "1");
    setSearchParams(next);
  };

  const handlePageChange = (page: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      {errorModal}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Mensajes de Contacto
          </h1>
          <p className="text-muted-foreground mt-1">Consultas recibidas desde el formulario público.</p>
        </div>
        <Button variant="outline" onClick={loadContacts} className="rounded-full w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={!currentStatus ? "default" : "outline"} onClick={() => handleStatusFilter()}>
          Todos
        </Button>
        {(["unread", "read", "archived"] as ContactStatus[]).map((status) => (
          <Button
            key={status}
            size="sm"
            variant={currentStatus === status ? "default" : "outline"}
            onClick={() => handleStatusFilter(status)}
          >
            {STATUS_LABELS[status]}
          </Button>
        ))}
      </div>

      <Separator />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-5">
                <div className="h-24 bg-muted rounded-[1.5rem]" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <Card className="border border-border/60 shadow-elegant">
          <CardContent className="p-10 text-center space-y-4">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="font-bold">No hay mensajes en esta vista.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {contacts.map((contact) => (
            <Card key={contact._id} className="border border-border/60 shadow-elegant overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-xl font-display leading-tight">{contact.name}</CardTitle>
                    <a href={`mailto:${contact.email}`} className="text-sm text-primary font-bold break-all">
                      {contact.email}
                    </a>
                    <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                      Recibido: {new Date(contact.createdAt).toLocaleDateString("es-PA")}
                    </p>
                  </div>
                  <Badge className={cn("rounded-full border px-4 py-1 text-[10px] font-black uppercase", STATUS_COLORS[contact.status])}>
                    {STATUS_LABELS[contact.status]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0 space-y-5">
                <p className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {contact.message}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(contact._id, "read")}
                    disabled={contact.status === "read"}
                    className="rounded-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Marcar leído
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatus(contact._id, "archived")}
                    disabled={contact.status === "archived"}
                    className="rounded-full"
                  >
                    <Archive className="h-4 w-4 mr-2" />
                    Archivar
                  </Button>
                  <Button asChild size="sm" className="rounded-full">
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      Responder
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 py-6 border-t border-border/40">
          <span className="text-sm text-muted-foreground">
            Total: <span className="font-bold text-foreground">{pagination.total}</span>
          </span>
          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => { event.preventDefault(); if (currentPage > 1) handlePageChange(currentPage - 1); }}
                  className={cn("rounded-xl border border-border/40", currentPage <= 1 && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
              {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
                .filter((page) => page === 1 || page === pagination.totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, pages) => (
                  <React.Fragment key={page}>
                    {index > 0 && page - pages[index - 1] > 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive={page === currentPage}
                        onClick={(event) => { event.preventDefault(); handlePageChange(page); }}
                        className="rounded-xl border border-border/40 font-bold"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </React.Fragment>
                ))}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => { event.preventDefault(); if (currentPage < pagination.totalPages) handlePageChange(currentPage + 1); }}
                  className={cn("rounded-xl border border-border/40", currentPage >= pagination.totalPages && "pointer-events-none opacity-50")}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
