import { useEffect, useState } from "react";
import apiClient from "../api/client";
import { getUser } from "../api/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { Users } from "lucide-react";

function classLabel(c) {
  return `${c.name} (${c.level} - ${c.academicYear})`;
}

// Un eleve peut avoir plusieurs tuteurs (cf. point de coherence "un seul tuteur par eleve") :
// parentEmails est un tableau. L'ancien champ singulier parentEmail (groupes crees avant ce
// changement) reste lu pour ne pas perdre l'affichage des membres deja enregistres.
function guardianEmails(member) {
  return member.parentEmails || (member.parentEmail ? [member.parentEmail] : []);
}

// UC19 - Diffuser une annonce / consulter un groupe de classe (whatsapp-service, section 3.6).
// GET /api/v1/whatsapp/groups/{classId} : reserve au role Enseignant (pas Administrateur) -
// la section n'est donc affichee que pour ce role.
//
// La classe est choisie dans un menu deroulant de classes reelles (admin-service) plutot que
// saisie a la main - whatsapp-service valide desormais aussi tout classId recu en ecriture
// cote serveur, mais le formulaire evite deja la faute de frappe.
export default function AnnouncementsPage() {
  const isTeacher = getUser()?.role === "ENSEIGNANT";

  const [classes, setClasses] = useState([]);

  const [groupClassId, setGroupClassId] = useState("");
  const [group, setGroup] = useState(null);
  const [groupError, setGroupError] = useState(null);
  const [loadingGroup, setLoadingGroup] = useState(false);

  const [classId, setClassId] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
  }, []);

  async function handleLookupGroup(e) {
    e.preventDefault();
    setLoadingGroup(true);
    setGroupError(null);
    setGroup(null);
    try {
      const { data } = await apiClient.get(`/api/v1/whatsapp/groups/${encodeURIComponent(groupClassId)}`);
      setGroup(data);
    } catch {
      const c = classes.find((cl) => cl.id === groupClassId);
      setGroupError(`Aucun groupe WhatsApp pour la classe ${c ? classLabel(c) : groupClassId}.`);
    } finally {
      setLoadingGroup(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await apiClient.post("/api/v1/whatsapp/broadcast", { classId, message });
      setStatus({ type: "success", text: "Annonce envoyee." });
      setMessage("");
    } catch {
      setStatus({ type: "error", text: "Echec de l'envoi - verifiez qu'un groupe existe pour cette classe." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Annonces</h2>
        <p className="text-sm text-muted-foreground">Groupes WhatsApp de classe et diffusion d'annonces.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {isTeacher && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Groupe WhatsApp d'une classe</CardTitle>
              <CardDescription>
                Le groupe est cree automatiquement a l'inscription du premier eleve de la classe.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleLookupGroup} className="flex flex-wrap items-end gap-3">
                <div className="min-w-56 flex-1 space-y-1.5">
                  <Label htmlFor="groupClassId">Classe</Label>
                  <Select value={groupClassId} onValueChange={setGroupClassId}>
                    <SelectTrigger id="groupClassId" className="w-full">
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
                <Button type="submit" disabled={loadingGroup || !groupClassId}>
                  {loadingGroup ? "Recherche..." : "Rechercher"}
                </Button>
              </form>

              {groupError && <Alert variant="error">{groupError}</Alert>}

              {group && (
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{group.name}</span>{" "}
                    <Badge variant="secondary">{group.members?.length ?? 0} membre(s)</Badge>
                  </p>
                  {group.members?.length > 0 ? (
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {group.members.map((m) => (
                        <li key={m.studentId}>
                          Eleve <span className="font-mono">{m.studentId}</span>
                          {guardianEmails(m).length > 0 ? ` - ${guardianEmails(m).join(", ")}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState icon={Users} message="Aucun membre dans ce groupe pour le moment." className="py-4" />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouvelle annonce</CardTitle>
            <CardDescription>Le message sera diffuse au groupe WhatsApp de la classe.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              {status && <Alert variant={status.type === "success" ? "success" : "error"}>{status.text}</Alert>}
              <Button type="submit" disabled={submitting || !classId}>
                {submitting ? "Envoi..." : "Diffuser"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
