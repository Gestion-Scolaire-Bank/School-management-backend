import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import apiClient from "../api/client";
import { getToken, getUser } from "../api/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";

const STATUS_TYPES = ["DISPONIBLE", "MALADE", "EN_DEPLACEMENT", "DISTANCIEL", "INDISPONIBLE"];

const STATUS_LABELS = {
  DISPONIBLE: "Disponible",
  MALADE: "Malade",
  EN_DEPLACEMENT: "En deplacement",
  DISTANCIEL: "A distance",
  INDISPONIBLE: "Indisponible",
};

const STATUS_BADGE_VARIANT = {
  DISPONIBLE: "success",
  MALADE: "destructive",
  EN_DEPLACEMENT: "warning",
  DISTANCIEL: "secondary",
  INDISPONIBLE: "destructive",
};

function formatDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
}

// Construit l'URL WebSocket du Gateway a partir de la baseURL HTTP d'axios (meme hote/port,
// schema ws/wss). Un client WebSocket de navigateur ne peut pas envoyer d'en-tete
// Authorization au handshake - le jeton est donc passe en parametre de requete, seule
// exception geree cote Gateway pour cette route precise (cf. JwtAuthenticationFilter).
function buildLiveStatusUrl() {
  const httpBase = apiClient.defaults.baseURL || window.location.origin;
  const wsBase = httpBase.replace(/^http/, "ws");
  return `${wsBase}/api/v1/status/live?token=${encodeURIComponent(getToken())}`;
}

// UC24 - Publier/consulter les statuts de disponibilite du personnel (userstatus-service,
// section 3.8). POST /api/v1/status : tout le personnel (pas les parents, dont la disponibilite
// n'a pas de sens ici). GET .../history et le flux temps reel /live : reserves a l'Admin cote
// Gateway (rbac-rules) - les sections correspondantes ne sont donc affichees que pour ce role.
export default function StatusPage() {
  const isAdmin = getUser()?.role === "ADMINISTRATEUR";

  const [statusType, setStatusType] = useState("DISPONIBLE");
  const [message, setMessage] = useState("");
  const [publishStatus, setPublishStatus] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const [users, setUsers] = useState([]);
  const [historyUserId, setHistoryUserId] = useState("");
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [liveEntries, setLiveEntries] = useState([]);
  const [liveConnected, setLiveConnected] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!isAdmin) return;
    apiClient
      .get("/api/auth/users")
      .then((res) => setUsers(res.data || []))
      .catch(() => setUsers([]));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const ws = new WebSocket(buildLiveStatusUrl());
    wsRef.current = ws;
    ws.onopen = () => setLiveConnected(true);
    ws.onclose = () => setLiveConnected(false);
    ws.onerror = () => setLiveConnected(false);
    ws.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data);
        setLiveEntries((entries) => [entry, ...entries].slice(0, 50));
      } catch {
        // Message non-JSON ignore.
      }
    };
    return () => ws.close();
  }, [isAdmin]);

  async function handlePublish(e) {
    e.preventDefault();
    setPublishing(true);
    setPublishStatus(null);
    try {
      await apiClient.post("/api/v1/status", { statusType, message: message || undefined });
      setPublishStatus({ type: "success", text: "Statut publie." });
      setMessage("");
    } catch {
      setPublishStatus({ type: "error", text: "Impossible de publier le statut." });
    } finally {
      setPublishing(false);
    }
  }

  async function loadHistory(userId) {
    setHistoryUserId(userId);
    setHistory(null);
    setHistoryError(null);
    if (!userId) return;
    setLoadingHistory(true);
    try {
      const { data } = await apiClient.get(`/api/v1/status/history/${encodeURIComponent(userId)}`);
      setHistory(data || []);
    } catch {
      setHistoryError("Impossible de charger l'historique de ce compte.");
    } finally {
      setLoadingHistory(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Statuts &amp; disponibilite</h2>
        <p className="text-sm text-muted-foreground">
          Indiquez votre disponibilite au reste de l'etablissement.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Mon statut</CardTitle>
          <CardDescription>Visible par l'administration en temps reel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePublish} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="statusType">Statut</Label>
              <Select value={statusType} onValueChange={setStatusType}>
                <SelectTrigger id="statusType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_TYPES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="statusMessage">Message (optionnel)</Label>
              <Textarea
                id="statusMessage"
                placeholder="ex. De retour demain"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            {publishStatus && (
              <Alert variant={publishStatus.type === "success" ? "success" : "error"}>{publishStatus.text}</Alert>
            )}
            <Button type="submit" disabled={publishing}>
              {publishing ? "Publication..." : "Publier mon statut"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isAdmin && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historique d'un compte</CardTitle>
              <CardDescription>Derniers statuts publies par une personne.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="historyUser">Compte</Label>
                <Select value={historyUserId} onValueChange={loadHistory}>
                  <SelectTrigger id="historyUser" className="w-full">
                    <SelectValue placeholder="Choisir un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.fullName} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {loadingHistory && <p className="text-sm text-muted-foreground">Chargement...</p>}
              {historyError && <Alert variant="error">{historyError}</Alert>}
              {history && history.length === 0 && (
                <EmptyState icon={Radio} message="Aucun statut publie par ce compte." />
              )}
              {history && history.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Statut</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((h, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge variant={STATUS_BADGE_VARIANT[h.statusType] ?? "secondary"}>
                            {STATUS_LABELS[h.statusType] ?? h.statusType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{h.message || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDateTime(h.updatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                Flux en direct
                <span
                  className={`size-2 rounded-full ${liveConnected ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                  title={liveConnected ? "Connecte" : "Deconnecte"}
                />
              </CardTitle>
              <CardDescription>Statuts publies par tout le personnel, en temps reel.</CardDescription>
            </CardHeader>
            <CardContent>
              {liveEntries.length === 0 ? (
                <EmptyState icon={Radio} message="Aucun statut recu depuis l'ouverture de cette page." />
              ) : (
                <ul className="space-y-2 text-sm">
                  {liveEntries.map((entry, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 border-b border-border pb-2">
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-xs text-muted-foreground">{entry.userId}</span>
                        {entry.message ? ` - ${entry.message}` : ""}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant={STATUS_BADGE_VARIANT[entry.statusType] ?? "secondary"}>
                          {STATUS_LABELS[entry.statusType] ?? entry.statusType}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(entry.updatedAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
