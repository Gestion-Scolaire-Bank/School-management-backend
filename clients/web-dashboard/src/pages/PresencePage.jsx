import { useEffect, useState } from "react";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardCheck } from "lucide-react";
import { PRESENCE_STATUS, statusOf } from "@/lib/status";

function formatTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function classLabel(c) {
  return `${c.name} (${c.level} - ${c.academicYear})`;
}

// UC13/UC14 - Pointer sa presence / consulter la presence d'une classe (presence-service,
// section 3.4). POST check-in/check-out : tout role authentifie. GET /class/{id} :
// Enseignant + Administrateur.
//
// La classe consultee vient d'un menu deroulant de classes reelles (admin-service) plutot que
// d'un identifiant tape a la main - presence-service valide desormais aussi tout classId recu
// en ecriture (check-in) cote serveur, mais le formulaire evite deja la faute de frappe.
export default function PresencePage() {
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [checkinBusy, setCheckinBusy] = useState(false);

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [records, setRecords] = useState(null);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState(null);

  useEffect(() => {
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
  }, []);

  async function handleCheckIn() {
    setCheckinBusy(true);
    setCheckinStatus(null);
    try {
      await apiClient.post("/api/v1/presence/check-in", { personType: "STAFF" });
      setCheckinStatus({ type: "success", text: "Entree enregistree." });
    } catch (err) {
      const msg = err.response?.data?.message || "Impossible d'enregistrer l'entree.";
      setCheckinStatus({ type: "error", text: msg });
    } finally {
      setCheckinBusy(false);
    }
  }

  async function handleCheckOut() {
    setCheckinBusy(true);
    setCheckinStatus(null);
    try {
      await apiClient.post("/api/v1/presence/check-out");
      setCheckinStatus({ type: "success", text: "Sortie enregistree." });
    } catch (err) {
      const msg = err.response?.data?.message || "Impossible d'enregistrer la sortie.";
      setCheckinStatus({ type: "error", text: msg });
    } finally {
      setCheckinBusy(false);
    }
  }

  async function handleLoadRecords(e) {
    e.preventDefault();
    setLoadingRecords(true);
    setRecordsError(null);
    setRecords(null);
    try {
      const { data } = await apiClient.get(`/api/v1/presence/class/${encodeURIComponent(classId)}`);
      setRecords(data);
    } catch {
      setRecordsError("Impossible de charger la presence de cette classe.");
    } finally {
      setLoadingRecords(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Presence</h2>
        <p className="text-sm text-muted-foreground">Pointage et suivi de presence.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Mon pointage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button onClick={handleCheckIn} disabled={checkinBusy}>
              Entree
            </Button>
            <Button variant="outline" onClick={handleCheckOut} disabled={checkinBusy}>
              Sortie
            </Button>
          </div>
          {checkinStatus && (
            <Alert variant={checkinStatus.type === "success" ? "success" : "error"}>{checkinStatus.text}</Alert>
          )}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Presence d'une classe</CardTitle>
          <CardDescription>Consulter les entrees/sorties enregistrees pour une classe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLoadRecords} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 space-y-1.5">
              <Label htmlFor="classId">Classe</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger id="classId" className="w-full">
                  <SelectValue placeholder="Choisir une classe">
                    {(value) => {
                      const c = classes.find((cl) => cl.id === value);
                      return c ? classLabel(c) : "Choisir une classe";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {classLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loadingRecords || !classId}>
              {loadingRecords ? "Chargement..." : "Afficher"}
            </Button>
          </form>

          {recordsError && <Alert variant="error">{recordsError}</Alert>}

          {records && records.length === 0 && (
            <EmptyState icon={ClipboardCheck} message="Aucun enregistrement pour cette classe." />
          )}

          {records && records.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Personne</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entree</TableHead>
                  <TableHead>Sortie</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const s = statusOf(PRESENCE_STATUS, r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.person_id}</TableCell>
                      <TableCell>{r.person_type}</TableCell>
                      <TableCell>{formatTime(r.check_in_at)}</TableCell>
                      <TableCell>{formatTime(r.check_out_at)}</TableCell>
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
    </div>
  );
}
