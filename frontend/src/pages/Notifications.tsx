import { useEffect, useState } from "react";
import { Bell, Check, Inbox, Loader2, RefreshCw } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { notificationsApi, type PaginationMetadata, type UserNotification } from "@/services/api";
import { useErrorModal } from "@/components/ErrorModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export default function Notifications() {
  const { token } = useAuth();
  const { errorModal, showError } = useErrorModal();
  const { t, language } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const page = Number(searchParams.get("page")) || 1;
  const locale = language === "en" ? "en-US" : "es-PA";

  const loadNotifications = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await notificationsApi.list(token, { page, limit: 10 });
      setNotifications(response.data);
      setPagination(response.pagination);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      showError(error instanceof Error ? error.message : t("notifications.loadError"), "generic");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, [token, page]);

  const markRead = async (notification: UserNotification) => {
    if (!token || notification.read_at) return;
    setMarkingId(notification._id);
    try {
      const response = await notificationsApi.markRead(notification._id, token);
      setNotifications((current) => current.map((item) => item._id === notification._id ? response.notification : item));
      setUnreadCount((current) => Math.max(0, current - 1));
    } catch (error) {
      showError(error instanceof Error ? error.message : t("notifications.markReadError"), "generic");
    } finally {
      setMarkingId(null);
    }
  };

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(nextPage));
    setSearchParams(next);
  };

  return (
    <div className="min-h-screen bg-background px-6 pb-16 pt-24">
      {errorModal}
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Bell className="h-7 w-7 text-primary" aria-hidden="true" />
              <h1 className="font-display text-4xl font-black tracking-tight">{t("notifications.title")}</h1>
              {unreadCount > 0 && <Badge aria-label={`${unreadCount} ${t("notifications.unread")}`}>{unreadCount}</Badge>}
            </div>
            <p className="max-w-2xl text-muted-foreground">{t("notifications.subtitle")}</p>
          </div>
          <Button variant="outline" onClick={() => void loadNotifications()} disabled={loading} className="gap-2 self-start sm:self-auto">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
            {t("common.retry")}
          </Button>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("notifications.inAppTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex min-h-40 items-center justify-center" role="status" aria-live="polite">
                <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
                <span className="sr-only">{t("notifications.loading")}</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Inbox className="h-10 w-10" aria-hidden="true" />
                <p className="font-semibold">{t("notifications.empty")}</p>
                <p className="text-sm">{t("notifications.emptyDescription")}</p>
              </div>
            ) : (
              <div className="space-y-3" aria-live="polite">
                {notifications.map((notification) => (
                  <article
                    key={notification._id}
                    className={cn("rounded-[var(--radius)] border p-4 transition-colors duration-300", !notification.read_at && "border-primary/30 bg-primary/5")}
                    aria-label={notification.title}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-semibold">{notification.title}</h2>
                          {!notification.read_at && <Badge variant="secondary">{t("notifications.new")}</Badge>}
                        </div>
                        <p className="text-sm leading-relaxed text-muted-foreground">{notification.message}</p>
                        <time className="block text-xs text-muted-foreground" dateTime={notification.createdAt}>
                          {new Date(notification.createdAt).toLocaleString(locale)}
                        </time>
                      </div>
                      {!notification.read_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void markRead(notification)}
                          disabled={markingId === notification._id}
                          className="shrink-0 gap-2"
                        >
                          {markingId === notification._id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                          <span className="hidden sm:inline">{t("notifications.markRead")}</span>
                          <span className="sr-only sm:hidden">{t("notifications.markRead")}</span>
                        </Button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {pagination && pagination.totalPages > 1 && (
          <nav className="flex items-center justify-between border-t border-border/60 pt-4" aria-label={t("pagination.label")}>
            <span className="text-sm text-muted-foreground">{pagination.total} {t("notifications.total")}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => changePage(pagination.page - 1)}>{t("pagination.previousLabel")}</Button>
              <span className="px-2 text-sm">{pagination.page} / {pagination.totalPages}</span>
              <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => changePage(pagination.page + 1)}>{t("pagination.nextLabel")}</Button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
