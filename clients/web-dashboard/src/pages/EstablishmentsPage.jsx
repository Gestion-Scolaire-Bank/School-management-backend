import { useEffect, useState } from "react";
import apiClient from "../api/client";

// UC23 - Gerer la configuration multi-etablissement (admin-service, section 3.7)
export default function EstablishmentsPage() {
  const [establishments, setEstablishments] = useState([]);

  useEffect(() => {
    apiClient
      .get("/api/v1/admin/config")
      .then((res) => setEstablishments(res.data?.establishments || []))
      .catch(() => setEstablishments([]));
  }, []);

  return (
    <div>
      <h2>Etablissements</h2>
      <div className="sm-card">
        {establishments.length === 0 ? (
          <p>Aucun etablissement charge - endpoint admin-service pas encore implemente.</p>
        ) : (
          <ul>
            {establishments.map((e) => (
              <li key={e.id}>{e.name}</li>
            ))}
          </ul>
        )}
        {/* TODO : formulaire POST /api/v1/admin/establishments (Admin Systeme) */}
      </div>
    </div>
  );
}
