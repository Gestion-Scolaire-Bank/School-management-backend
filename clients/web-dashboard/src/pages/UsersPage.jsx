import { useEffect, useState } from "react";
import { UserX } from "lucide-react";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/EmptyState";
import { USER_STATUS, statusOf } from "@/lib/status";
import { useI18n } from "@/lib/i18n";

// UC5 - Gerer les comptes utilisateurs (activer/suspendre) - auth-service via le proxy
// admin-service (pattern Database per Service : admin-service ne possede pas les comptes).
// GET /api/auth/users : liste, PATCH /api/v1/admin/users/{id}/status : changement de statut.
export default function UsersPage() {
  const { t } = useI18n();

  const ROLE_LABELS = {
    ADMINISTRATEUR: t("users.role.ADMINISTRATEUR"),
    DIRECTEUR: t("users.role.DIRECTEUR"),
    ENSEIGNANT: t("users.role.ENSEIGNANT"),
    PARENT: t("users.role.PARENT"),
  };

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [actionError, setActionError] = useState(null);

  function loadUsers() {
    setLoading(true);
    return apiClient
      .get("/api/auth/users")
      .then((res) => setUsers(res.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleStatusChange(userId, status) {
    setPendingId(userId);
    setActionError(null);
    try {
      await apiClient.patch(`/api/v1/admin/users/${userId}/status`, { status });
      await loadUsers();
      toast.add({ title: t("users.status.updated", { status: statusOf(USER_STATUS, status).label }), type: "success" });
    } catch {
      setActionError(t("users.error.action"));
    } finally {
      setPendingId(null);
    }
  }

  function handleDestructiveStatusChange(user, status) {
    const confirmKey = status === "SUSPENDED" ? "users.confirm.suspend" : "users.confirm.deactivate";
    if (window.confirm(t(confirmKey, { name: user.fullName, email: user.email }))) {
      handleStatusChange(user.id, status);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("users.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("users.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("users.list.title")}</CardTitle>
          <CardDescription>{t("users.list.count", { count: users.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">{t("users.loading")}</p>}
          {error && (
            <Alert variant="error">{t("users.error.load")}</Alert>
          )}
          {actionError && (
            <Alert variant="error" className="mb-3">
              {actionError}
            </Alert>
          )}

          {!loading && !error && users.length === 0 && (
            <EmptyState icon={UserX} message={t("users.empty")} />
          )}

          {!loading && !error && users.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.table.name")}</TableHead>
                  <TableHead>{t("users.table.email")}</TableHead>
                  <TableHead>{t("users.table.role")}</TableHead>
                  <TableHead>{t("users.table.status")}</TableHead>
                  <TableHead className="text-right">{t("users.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const s = statusOf(USER_STATUS, u.status);
                  return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                    <TableCell>
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {u.status !== "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingId === u.id}
                            onClick={() => handleStatusChange(u.id, "ACTIVE")}
                          >
                            {t("users.action.activate")}
                          </Button>
                        )}
                        {u.status !== "SUSPENDED" && (
                          <Button
                            size="sm"
                            variant="warning"
                            disabled={pendingId === u.id}
                            onClick={() => handleDestructiveStatusChange(u, "SUSPENDED")}
                          >
                            {t("users.action.suspend")}
                          </Button>
                        )}
                        {u.status !== "INACTIVE" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={pendingId === u.id}
                            onClick={() => handleDestructiveStatusChange(u, "INACTIVE")}
                          >
                            {t("users.action.deactivate")}
                          </Button>
                        )}
                      </div>
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
