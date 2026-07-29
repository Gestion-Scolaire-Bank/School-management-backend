import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import apiClient from "../api/client";

// UC22 - Consulter le tableau de bord analytique (analytics-service, section 3.7)
export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/api/v1/analytics/dashboard")
      .then((res) => setKpis(res.data))
      .catch(() => setKpis(null))
      .finally(() => setLoading(false));
  }, []);

  const placeholderData = [
    { name: "Effectifs", value: 0 },
    { name: "Taux presence", value: 0 },
    { name: "Recettes", value: 0 },
  ];

  return (
    <div>
      <h2>Tableau de bord</h2>
      <p>
        {loading
          ? "Chargement des indicateurs..."
          : kpis
          ? "Donnees chargees depuis analytics-service."
          : "analytics-service non disponible ou endpoint pas encore implemente - donnees d'exemple affichees."}
      </p>
      <div className="sm-card">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={kpis?.metrics || placeholderData}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
