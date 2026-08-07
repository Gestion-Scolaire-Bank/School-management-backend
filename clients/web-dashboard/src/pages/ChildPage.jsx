import { useEffect, useState } from "react";
import { GraduationCap, ClipboardCheck } from "lucide-react";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { PRESENCE_STATUS, statusOf } from "@/lib/status";

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

// UC13 (vue Parent) - Suivre la scolarite d'un enfant : carte scolaire (schoolid-service),
// bulletin (reportcard-service), presence (presence-service). section 3.4/3.5/3.9.
// La liste des enfants vient de GET /api/v1/registrations/children (registration-service) -
// resolue cote serveur a partir de l'email du parent connecte (X-User-Email, propage par le
// Gateway depuis le JWT) : plus besoin de connaitre l'identifiant UUID de son enfant, on
// choisit par nom (cf. chantier de coherence - point n.6).
export default function ChildPage() {
  const [children, setChildren] = useState(null);
  const [childrenError, setChildrenError] = useState(null);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [classes, setClasses] = useState([]);

  const [activeStudentId, setActiveStudentId] = useState(null);

  const [cardUrl, setCardUrl] = useState(null);
  const [cardError, setCardError] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);

  const [reportPeriod, setReportPeriod] = useState("");
  const [reportUrl, setReportUrl] = useState(null);
  const [reportError, setReportError] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const [presence, setPresence] = useState(null);
  const [presenceError, setPresenceError] = useState(null);
  const [loadingPresence, setLoadingPresence] = useState(false);

  useEffect(() => {
    apiClient
      .get("/api/v1/registrations/children")
      .then((res) => setChildren(res.data || []))
      .catch(() => setChildrenError("Impossible de charger la liste de vos enfants."))
      .finally(() => setLoadingChildren(false));
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
  }, []);

  // Les URLs d'objet crees pour la carte/le bulletin doivent etre liberees pour eviter les
  // fuites memoire (chaque nouvelle selection en cree une nouvelle).
  useEffect(() => {
    return () => {
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      if (reportUrl) URL.revokeObjectURL(reportUrl);
    };
  }, [cardUrl, reportUrl]);

  function className(classId) {
    return classes.find((c) => c.id === classId)?.name || null;
  }

  function selectChild(child) {
    setActiveStudentId(child.id);
    loadCard(child.id);
    loadPresence(child.id);
    setReportPeriod("");
    setReportUrl(null);
    setReportError(null);
  }

  async function loadCard(id) {
    setLoadingCard(true);
    setCardError(null);
    try {
      const { data } = await apiClient.get(`/api/v1/school-id/${encodeURIComponent(id)}`, {
        responseType: "blob",
      });
      setCardUrl(URL.createObjectURL(data));
    } catch {
      setCardError("Aucune carte scolaire trouvee pour cet enfant.");
      setCardUrl(null);
    } finally {
      setLoadingCard(false);
    }
  }

  async function loadReportCard(e) {
    e.preventDefault();
    if (!activeStudentId) return;
    setLoadingReport(true);
    setReportError(null);
    try {
      const { data } = await apiClient.get(`/api/v1/reports/student/${encodeURIComponent(activeStudentId)}`, {
        params: reportPeriod ? { period: reportPeriod } : undefined,
        responseType: "blob",
      });
      setReportUrl(URL.createObjectURL(data));
    } catch {
      setReportError("Aucun bulletin disponible pour cet enfant/periode.");
      setReportUrl(null);
    } finally {
      setLoadingReport(false);
    }
  }

  async function loadPresence(id) {
    setLoadingPresence(true);
    setPresenceError(null);
    try {
      const { data } = await apiClient.get(`/api/v1/presence/student/${encodeURIComponent(id)}`);
      setPresence(data);
    } catch {
      setPresenceError("Impossible de charger la presence.");
      setPresence(null);
    } finally {
      setLoadingPresence(false);
    }
  }

  const activeChild = children?.find((c) => c.id === activeStudentId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Suivi de l'enfant</h2>
        <p className="text-sm text-muted-foreground">
          Carte scolaire, bulletins et presence.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mes enfants</CardTitle>
          <CardDescription>Selectionnez un enfant pour voir son suivi.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChildren && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {childrenError && <Alert variant="error">{childrenError}</Alert>}
          {children && children.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              message={
                "Aucun enfant n'est associe a l'adresse email de votre compte. Si votre enfant est bien inscrit, " +
                "contactez l'administration de l'etablissement pour verifier l'adresse email renseignee lors de " +
                "l'inscription."
              }
            />
          )}
          {children && children.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => selectChild(child)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                    activeStudentId === child.id ? "border-primary bg-accent" : "border-border"
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <GraduationCap className="size-4.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{className(child.classId) || "Classe non affectee"}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activeChild && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Carte scolaire - {activeChild.firstName} {activeChild.lastName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCard && <p className="text-sm text-muted-foreground">Chargement...</p>}
              {cardError && <Alert variant="error">{cardError}</Alert>}
              {cardUrl && (
                <img
                  src={cardUrl}
                  alt={`Carte scolaire de ${activeChild.firstName} ${activeChild.lastName}`}
                  className="max-w-full rounded-lg border border-border"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bulletin</CardTitle>
              <CardDescription>Laissez la periode vide pour le bulletin le plus recent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={loadReportCard} className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reportPeriod">Periode</Label>
                  <Input
                    id="reportPeriod"
                    placeholder="ex. Trimestre1"
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loadingReport}>
                  {loadingReport ? "Chargement..." : "Voir le bulletin"}
                </Button>
              </form>
              {reportError && <Alert variant="error">{reportError}</Alert>}
              {reportUrl && (
                <a
                  href={reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Ouvrir le bulletin PDF
                </a>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Presence</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPresence && <p className="text-sm text-muted-foreground">Chargement...</p>}
              {presenceError && <Alert variant="error">{presenceError}</Alert>}
              {presence && presence.length === 0 && (
                <EmptyState icon={ClipboardCheck} message="Aucun enregistrement de presence." />
              )}
              {presence && presence.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Classe</TableHead>
                      <TableHead>Entree</TableHead>
                      <TableHead>Sortie</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {presence.map((r) => {
                      const s = statusOf(PRESENCE_STATUS, r.status);
                      return (
                        <TableRow key={r.id}>
                          <TableCell>{r.class_id || "-"}</TableCell>
                          <TableCell>{formatDateTime(r.check_in_at)}</TableCell>
                          <TableCell>{formatDateTime(r.check_out_at)}</TableCell>
                          <TableCell>
                            <Badge variant={s.variant}>{s.label}</Badge>
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
      )}
    </div>
  );
}
