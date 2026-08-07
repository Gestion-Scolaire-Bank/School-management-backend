import { useEffect, useState } from "react";
import { Wallet, Receipt, Users, GraduationCap, FileStack, Building2, Download } from "lucide-react";
import apiClient from "../api/client";
import { getUser } from "../api/auth";
import StatCard from "@/components/StatCard";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// UC22 - Consulter le tableau de bord analytique (analytics-service, section 3.7)
// Forme reelle de la reponse GET /api/v1/analytics/dashboard : objet plat
// { total_revenue, payment_count, presence_count, average_grade, reportcard_batches }
// (verifie en conditions reelles) - pas un tableau "metrics".
export default function DashboardPage() {
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
      setExportError("Impossible de generer l'export.");
    } finally {
      setExporting(null);
    }
  }

  const stats = kpis
    ? [
        {
          label: "Recettes totales",
          value: `${kpis.total_revenue.toLocaleString("fr-FR")} XAF`,
          icon: Wallet,
          color: "emerald",
        },
        { label: "Paiements enregistres", value: kpis.payment_count, icon: Receipt, color: "blue" },
        { label: "Presences enregistrees", value: kpis.presence_count, icon: Users, color: "purple" },
        {
          label: "Moyenne generale",
          value: kpis.average_grade != null ? `${kpis.average_grade.toFixed(2)}/20` : "-",
          icon: GraduationCap,
          color: "amber",
        },
        { label: "Lots de bulletins generes", value: kpis.reportcard_batches, icon: FileStack, color: "rose" },
      ]
    : [];

  const globalCards = globalStats
    ? [
        { label: "Etablissements actifs", value: globalStats.establishment_count, icon: Building2, color: "blue" },
        {
          label: "Recettes totales (tous etablissements)",
          value: `${globalStats.total_revenue.toLocaleString("fr-FR")} XAF`,
          icon: Wallet,
          color: "emerald",
        },
        { label: "Paiements enregistres", value: globalStats.payment_count, icon: Receipt, color: "purple" },
        { label: "Lots de bulletins generes", value: globalStats.reportcard_batches, icon: FileStack, color: "rose" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Tableau de bord</h2>
        <p className="text-sm text-muted-foreground">
          Indicateurs cles agreges depuis analytics-service.
        </p>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement des indicateurs...</p>}
      {error && (
        <Alert variant="error">Impossible de charger le tableau de bord (analytics-service indisponible).</Alert>
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
            <CardTitle className="text-base">Vue globale (tous etablissements)</CardTitle>
            <CardDescription>
              Agregation multi-etablissements, et export des evenements bruts en CSV ou PDF.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingGlobal && <p className="text-sm text-muted-foreground">Chargement...</p>}
            {globalError && <Alert variant="error">Impossible de charger la vue globale.</Alert>}
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
                {exporting === "csv" ? "Export..." : "Exporter en CSV"}
              </Button>
              <Button variant="outline" disabled={exporting !== null} onClick={() => handleExport("pdf")}>
                <Download />
                {exporting === "pdf" ? "Export..." : "Exporter en PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
