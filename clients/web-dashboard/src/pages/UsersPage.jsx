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

const ROLE_LABELS = {
  ADMINISTRATEUR: "Administrateur",
  DIRECTEUR: "Directeur",
  ENSEIGNANT: "Enseignant",
  PARENT: "Parent",
};

// UC5 - Gerer les comptes utilisateurs (activer/suspendre) - auth-service via le proxy
// admin-service (pattern Database per Service : admin-service ne possede pas les comptes).
// GET /api/auth/users : liste, PATCH /api/v1/admin/users/{id}/status : changement de statut.
export default function UsersPage() {
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
      toast.add({ title: `Statut du compte mis a jour : ${statusOf(USER_STATUS, status).label}`, type: "success" });
    } catch {
      setActionError("Impossible de mettre a jour le statut de ce compte.");
    } finally {
      setPendingId(null);
    }
  }

  function handleDestructiveStatusChange(user, status, verb) {
    if (window.confirm(`Confirmer : ${verb} le compte de ${user.fullName} (${user.email}) ?`)) {
      handleStatusChange(user.id, status);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Comptes utilisateurs</h2>
        <p className="text-sm text-muted-foreground">Activer, suspendre ou desactiver un compte.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tous les comptes</CardTitle>
          <CardDescription>{users.length} compte(s) enregistre(s).</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {error && (
            <Alert variant="error">Impossible de charger la liste des comptes (auth-service injoignable).</Alert>
          )}
          {actionError && (
            <Alert variant="error" className="mb-3">
              {actionError}
            </Alert>
          )}

          {!loading && !error && users.length === 0 && (
            <EmptyState icon={UserX} message="Aucun compte enregistre." />
          )}

          {!loading && !error && users.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                            Activer
                          </Button>
                        )}
                        {u.status !== "SUSPENDED" && (
                          <Button
                            size="sm"
                            variant="warning"
                            disabled={pendingId === u.id}
                            onClick={() => handleDestructiveStatusChange(u, "SUSPENDED", "suspendre")}
                          >
                            Suspendre
                          </Button>
                        )}
                        {u.status !== "INACTIVE" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={pendingId === u.id}
                            onClick={() => handleDestructiveStatusChange(u, "INACTIVE", "desactiver")}
                          >
                            Desactiver
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
