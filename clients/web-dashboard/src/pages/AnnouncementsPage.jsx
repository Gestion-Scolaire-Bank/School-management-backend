import { useState } from "react";
import apiClient from "../api/client";

// UC19 - Diffuser une annonce (whatsapp-service, section 3.6)
export default function AnnouncementsPage() {
  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await apiClient.post("/api/v1/whatsapp/broadcast", { classId, message });
      setStatus("Annonce envoyee.");
    } catch {
      setStatus("Echec - endpoint whatsapp-service pas encore implemente.");
    }
  }

  return (
    <div>
      <h2>Diffuser une annonce</h2>
      <form className="sm-card" onSubmit={handleSubmit}>
        <label>Classe (ID)</label>
        <input value={classId} onChange={(e) => setClassId(e.target.value)} required />
        <label>Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} required />
        <button type="submit">Diffuser</button>
        {status && <p>{status}</p>}
      </form>
    </div>
  );
}
