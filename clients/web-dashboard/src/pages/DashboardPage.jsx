import { useEffect, useState } from "react";
import { Wallet, Receipt, Users, GraduationCap, FileStack, Building2, Download } from "lucide-react";
import apiClient from "../api/client";
import { getUser } from "../api/auth";
import StatCard from "@/components/StatCard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";

// UC22 - Consulter le tableau de bord analytique (analytics-service, section 3.7)
// Forme reelle de la reponse GET /api/v1/analytics/dashboard : objet plat
// { total_revenue, payment_count, presence_count, average_grade, reportcard_batches }
// (verifie en conditions reelles) - pas un tableau "metrics".
export default function DashboardPage() {
  const { t } = useI18n();
  const isAdmin = getUser()?.role === "ADMINISTRATEUR";

  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [globalStats, setGlobalStats] = useState(null);
  const [globalError, setGlobalError] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    apiClient
      .get("/api/v1/analytics/dashboard")
      .then((res) => setKpis(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    if (isAdmin) {
      setLoadingGlobal(true);
      apiClient
        .get("/api/v1/analytics/global")
        .then((res) => setGlobalStats(res.data))
        .catch(() => setGlobalError(true))
        .finally(() => setLoadingGlobal(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleExport(format) {
    setExporting(format);
    setExportError(null);
    try {
      const { data } = await apiClient.get("/api/v1/analytics/export", {
        params: { format },
        responseType: "blob",
      });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `analytics-export.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError(t("dash.export.error"));
    } finally {
      setExporting(null);
    }
  }

  const stats = kpis
    ? [
        {
          label: t("dash.kpi.revenue"),
          value: `${kpis.total_revenue.toLocaleString("fr-FR")} XAF`,
          icon: Wallet,
          color: "emerald",
        },
        { label: t("dash.kpi.payments"), value: kpis.payment_count, icon: Receipt, color: "blue" },
        { label: t("dash.kpi.presence"), value: kpis.presence_count, icon: Users, color: "purple" },
        {
          label: t("dash.kpi.average"),
          value: kpis.average_grade != null ? `${kpis.average_grade.toFixed(2)}/20` : "-",
          icon: GraduationCap,
          color: "amber",
        },
        { label: t("dash.kpi.batches"), value: kpis.reportcard_batches, icon: FileStack, color: "rose" },
      ]
    : [];

  const globalCards = globalStats
    ? [
        { label: t("dash.global.schools"), value: globalStats.establishment_count, icon: Building2, color: "blue" },
        {
          label: t("dash.global.revenue"),
          value: `${globalStats.total_revenue.toLocaleString("fr-FR")} XAF`,
          icon: Wallet,
          color: "emerald",
        },
        { label: t("dash.kpi.payments"), value: globalStats.payment_count, icon: Receipt, color: "purple" },
        { label: t("dash.kpi.batches"), value: globalStats.reportcard_batches, icon: FileStack, color: "rose" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("dash.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("dash.subtitle")}
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">{t("dash.loading")}</p>}
      {error && (
        <Alert variant="error">{t("dash.error.load")}</Alert>
      )}

      {kpis && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dash.global.title")}</CardTitle>
            <CardDescription>
              {t("dash.global.subtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingGlobal && <p className="text-sm text-muted-foreground">{t("dash.global.loading")}</p>}
            {globalError && <Alert variant="error">{t("dash.global.error")}</Alert>}
            {globalStats && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {globalCards.map((stat) => (
                  <StatCard key={stat.label} {...stat} />
                ))}
              </div>
            )}

            {exportError && <Alert variant="error">{exportError}</Alert>}
            <div className="flex gap-3">
              <Button variant="outline" disabled={exporting !== null} onClick={() => handleExport("csv")}>
                <Download />
                {exporting === "csv" ? t("dash.exporting") : t("dash.export.csv")}
              </Button>
              <Button variant="outline" disabled={exporting !== null} onClick={() => handleExport("pdf")}>
                <Download />
                {exporting === "pdf" ? t("dash.exporting") : t("dash.export.pdf")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
