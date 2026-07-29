import { useEffect, useState } from "react";
import apiClient from "../api/client";

// UC12 - Consulter l'historique de paiement / rapport de recettes (payment-service, section 3.3)
export default function PaymentsPage() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    apiClient
      .get("/api/v1/payments/reports/revenue")
      .then((res) => setReport(res.data))
      .catch(() => setReport(null));
  }, []);

  return (
    <div>
      <h2>Paiements &amp; recettes</h2>
      <div className="sm-card">
        <p>
          {report
            ? JSON.stringify(report)
            : "Rapport de recettes non disponible - endpoint payment-service pas encore implemente."}
        </p>
      </div>
    </div>
  );
}
