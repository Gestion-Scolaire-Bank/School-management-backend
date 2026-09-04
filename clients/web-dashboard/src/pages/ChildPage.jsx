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
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
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
      .catch(() => setChildrenError(t("child.list.error")))
      .finally(() => setLoadingChildren(false));
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setCardError(t("child.card.error"));
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
      setReportError(t("child.report.error"));
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
      setPresenceError(t("child.presence.error"));
      setPresence(null);
    } finally {
      setLoadingPresence(false);
    }
  }

  const activeChild = children?.find((c) => c.id === activeStudentId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("child.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("child.subtitle")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("child.list.title")}</CardTitle>
          <CardDescription>{t("child.list.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingChildren && <p className="text-sm text-muted-foreground">{t("child.loading")}</p>}
          {childrenError && <Alert variant="error">{childrenError}</Alert>}
          {children && children.length === 0 && (
            <EmptyState
              icon={GraduationCap}
              message={t("child.list.empty")}
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
                    <p className="text-xs text-muted-foreground">{className(child.classId) || t("child.noClass")}</p>
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
                {t("child.card.title", { name: `${activeChild.firstName} ${activeChild.lastName}` })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCard && <p className="text-sm text-muted-foreground">{t("child.loading")}</p>}
              {cardError && <Alert variant="error">{cardError}</Alert>}
              {cardUrl && (
                <img
                  src={cardUrl}
                  alt={t("child.card.alt", { name: `${activeChild.firstName} ${activeChild.lastName}` })}
                  className="max-w-full rounded-lg border border-border"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("child.report.title")}</CardTitle>
              <CardDescription>{t("child.report.subtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={loadReportCard} className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="reportPeriod">{t("child.report.period")}</Label>
                  <Input
                    id="reportPeriod"
                    placeholder={t("child.report.period.placeholder")}
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={loadingReport}>
                  {loadingReport ? t("child.loading") : t("child.report.submit")}
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
                  {t("child.report.open")}
                </a>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">{t("child.presence.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPresence && <p className="text-sm text-muted-foreground">{t("child.loading")}</p>}
              {presenceError && <Alert variant="error">{presenceError}</Alert>}
              {presence && presence.length === 0 && (
                <EmptyState icon={ClipboardCheck} message={t("child.presence.empty")} />
              )}
              {presence && presence.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("child.table.class")}</TableHead>
                      <TableHead>{t("child.table.checkIn")}</TableHead>
                      <TableHead>{t("child.table.checkOut")}</TableHead>
                      <TableHead>{t("child.table.status")}</TableHead>
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
