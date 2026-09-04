import { useEffect, useState } from "react";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RotateCw, Bell } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "@/components/ui/toast";
import { NOTIFICATION_STATUS, statusOf } from "@/lib/status";
import { useI18n } from "@/lib/i18n";

const STATUS_OPTIONS = ["Tous", "SENT", "FAILED"];
const CHANNEL_OPTIONS = ["Tous", "EMAIL", "SMS", "PUSH"];

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// UC21 (vue Admin) - Journal des notifications / relancer un echec (notification-service,
// section 3.6). GET /api/v1/notifications/logs et PATCH /api/v1/notifications/{id}/retry :
// role Administrateur.
export default function NotificationsPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [channelFilter, setChannelFilter] = useState("Tous");
  const [retryingId, setRetryingId] = useState(null);
  const [retryError, setRetryError] = useState(null);

  function loadNotifications() {
    setLoading(true);
    setError(false);
    const params = { limit: 100 };
    if (statusFilter !== "Tous") params.status = statusFilter;
    if (channelFilter !== "Tous") params.channel = channelFilter;
    return apiClient
      .get("/api/v1/notifications/logs", { params })
      .then((res) => setNotifications(res.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, channelFilter]);

  async function handleRetry(id) {
    setRetryingId(id);
    setRetryError(null);
    try {
      await apiClient.patch(`/api/v1/notifications/${id}/retry`);
      await loadNotifications();
      toast.add({ title: t("notif.retry.success"), type: "success" });
    } catch (err) {
      setRetryError(err.response?.data?.message || t("notif.retry.error"));
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("notif.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("notif.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("notif.log.title")}</CardTitle>
          <CardDescription>{t("notif.log.count", { count: notifications.length })}</CardDescription>
          <div className="flex flex-wrap gap-3 pt-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === "Tous" ? t("notif.filter.allStatuses") : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === "Tous" ? t("notif.filter.allChannels") : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">{t("notif.loading")}</p>}
          {error && <Alert variant="error">{t("notif.error.load")}</Alert>}
          {retryError && (
            <Alert variant="error" className="mb-3">
              {retryError}
            </Alert>
          )}

          {!loading && !error && notifications.length === 0 && (
            <EmptyState icon={Bell} message={t("notif.empty")} />
          )}

          {!loading && !error && notifications.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("notif.table.recipient")}</TableHead>
                  <TableHead>{t("notif.table.channel")}</TableHead>
                  <TableHead>{t("notif.table.type")}</TableHead>
                  <TableHead>{t("notif.table.status")}</TableHead>
                  <TableHead>{t("notif.table.attempts")}</TableHead>
                  <TableHead>{t("notif.table.sentAt")}</TableHead>
                  <TableHead className="text-right">{t("notif.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => {
                  const s = statusOf(NOTIFICATION_STATUS, n.status);
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="max-w-48 truncate font-medium">
                        {n.recipient_address || t("notif.unknownAddress")}
                      </TableCell>
                      <TableCell>{n.channel}</TableCell>
                      <TableCell className="text-muted-foreground">{n.type}</TableCell>
                      <TableCell>
                        <Badge variant={s.variant}>{s.label}</Badge>
                        {n.error_message && (
                          <p className="mt-1 max-w-56 truncate text-xs text-destructive">{n.error_message}</p>
                        )}
                      </TableCell>
                      <TableCell>{n.attempts}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(n.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {n.status === "FAILED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={retryingId === n.id}
                            onClick={() => handleRetry(n.id)}
                          >
                            <RotateCw className="size-3.5" />
                            {retryingId === n.id ? t("notif.retrying") : t("notif.retry")}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
