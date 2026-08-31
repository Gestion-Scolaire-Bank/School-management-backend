import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import apiClient from "../api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import FileDropzone from "@/components/FileDropzone";
import { REGISTRATION_STATUS, statusOf } from "@/lib/status";

const STAFF_ROLES = ["ENSEIGNANT", "ADMINISTRATEUR", "DIRECTEUR"];

const ROLE_LABELS = {
  ENSEIGNANT: "Enseignant",
  ADMINISTRATEUR: "Administrateur",
  DIRECTEUR: "Directeur",
};

const EMPTY_STUDENT = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "M",
  birthPlace: "",
  address: "",
  nationalNumber: "",
  guardianName: "",
  parentEmail: "",
  parentEmailConfirm: "",
  parentPhone: "",
  secondGuardianName: "",
  secondGuardianEmail: "",
  secondGuardianPhone: "",
  classId: "",
};

const EMPTY_STAFF = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  gender: "M",
  birthPlace: "",
  address: "",
  nationalNumber: "",
  role: "ENSEIGNANT",
  establishmentId: "",
};

function classLabel(c) {
  return `${c.name} (${c.level} - ${c.academicYear})`;
}

// UC6 - Inscrire un eleve / un membre du personnel, UC8 - Affecter une classe
// (registration-service, section 3.2). Toutes les routes /api/v1/registrations/** sont
// reservees au role Administrateur.
// classId/establishmentId sont desormais des references validees aupres d'admin-service
// (plus de champ texte libre "className") - cf. chantier de coherence des donnees de reference.
export default function RegistrationPage() {
  const [classes, setClasses] = useState([]);
  const [establishments, setEstablishments] = useState([]);

  const [student, setStudent] = useState(EMPTY_STUDENT);
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [birthCertificate, setBirthCertificate] = useState(null);
  const [studentStatus, setStudentStatus] = useState(null);
  const [studentResult, setStudentResult] = useState(null);
  const [submittingStudent, setSubmittingStudent] = useState(false);

  const [staff, setStaff] = useState(EMPTY_STAFF);
  const [cv, setCv] = useState(null);
  const [diploma, setDiploma] = useState(null);
  const [staffStatus, setStaffStatus] = useState(null);
  const [staffResult, setStaffResult] = useState(null);
  const [submittingStaff, setSubmittingStaff] = useState(false);

  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState(null);
  const [loadingLookup, setLoadingLookup] = useState(false);
  const [newClassId, setNewClassId] = useState("");
  const [assigningClass, setAssigningClass] = useState(false);
  const [reissuingCard, setReissuingCard] = useState(false);
  const [reissueStatus, setReissueStatus] = useState(null);

  const [rosterClassId, setRosterClassId] = useState("");
  const [roster, setRoster] = useState(null);
  const [rosterError, setRosterError] = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);

  useEffect(() => {
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
    apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => setEstablishments([]));
  }, []);

  function classNameById(id) {
    return classes.find((c) => c.id === id)?.name || id || "-";
  }

  function updateStudentField(field) {
    return (e) => setStudent((s) => ({ ...s, [field]: e.target.value }));
  }

  function updateStaffField(field) {
    return (e) => setStaff((s) => ({ ...s, [field]: e.target.value }));
  }

  async function handleStudentSubmit(e) {
    e.preventDefault();
    setStudentStatus(null);
    setStudentResult(null);
    // Le compte parent est cree automatiquement a partir de cette adresse, sans verification -
    // une faute de frappe enverrait l'acces au dossier de l'enfant a une tierce personne. La
    // double saisie attrape cette erreur avant meme l'envoi (cf. discussion sur la creation de
    // compte parent).
    if (student.parentEmail !== student.parentEmailConfirm) {
      setStudentStatus({ type: "error", text: "Les deux emails du parent ne correspondent pas." });
      return;
    }
    setSubmittingStudent(true);
    try {
      const formData = new FormData();
      // Le deuxieme tuteur est optionnel : n'envoyer ces champs que s'ils sont renseignes,
      // sinon le backend recevrait une chaine vide (non-null) et croirait qu'un deuxieme
      // tuteur est fourni sans email valide. parentEmailConfirm ne fait pas partie du contrat
      // backend, c'est une verification purement cote client.
      const { secondGuardianName, secondGuardianEmail, secondGuardianPhone, parentEmailConfirm, ...requiredFields } =
        student;
      Object.entries(requiredFields).forEach(([key, value]) => formData.append(key, value));
      if (secondGuardianName) formData.append("secondGuardianName", secondGuardianName);
      if (secondGuardianEmail) formData.append("secondGuardianEmail", secondGuardianEmail);
      if (secondGuardianPhone) formData.append("secondGuardianPhone", secondGuardianPhone);
      if (studentPhoto) formData.append("photo", studentPhoto);
      if (birthCertificate) formData.append("birthCertificate", birthCertificate);

      const { data } = await apiClient.post("/api/v1/registrations/student", formData);
      setStudentStatus({ type: "success", text: "Eleve inscrit avec succes." });
      setStudentResult(data);
      setStudent(EMPTY_STUDENT);
      setStudentPhoto(null);
      setBirthCertificate(null);
    } catch (err) {
      setStudentStatus({
        type: "error",
        text: err.response?.data?.message || "Impossible d'inscrire l'eleve - verifiez les champs.",
      });
    } finally {
      setSubmittingStudent(false);
    }
  }

  async function handleStaffSubmit(e) {
    e.preventDefault();
    setSubmittingStaff(true);
    setStaffStatus(null);
    setStaffResult(null);
    try {
      const formData = new FormData();
      Object.entries(staff).forEach(([key, value]) => formData.append(key, value));
      if (cv) formData.append("cv", cv);
      if (diploma) formData.append("diploma", diploma);

      const { data } = await apiClient.post("/api/v1/registrations/staff", formData);
      setStaffStatus({ type: "success", text: "Membre du personnel inscrit avec succes." });
      setStaffResult(data);
      setStaff(EMPTY_STAFF);
      setCv(null);
      setDiploma(null);
    } catch (err) {
      setStaffStatus({
        type: "error",
        text: err.response?.data?.message || "Impossible d'inscrire ce membre du personnel - verifiez les champs.",
      });
    } finally {
      setSubmittingStaff(false);
    }
  }

  async function handleLookup(e) {
    e.preventDefault();
    setLoadingLookup(true);
    setLookupError(null);
    setLookupResult(null);
    try {
      const { data } = await apiClient.get(`/api/v1/registrations/${encodeURIComponent(lookupId)}`);
      setLookupResult(data);
      setNewClassId(data.classId || "");
      setReissueStatus(null);
    } catch {
      setLookupError("Aucun dossier trouve pour cet identifiant.");
    } finally {
      setLoadingLookup(false);
    }
  }

  async function handleReissueCard() {
    setReissuingCard(true);
    setReissueStatus(null);
    try {
      const { data } = await apiClient.post(`/api/v1/school-id/${encodeURIComponent(lookupResult.id)}/reissue`);
      setReissueStatus({
        type: "success",
        text: `Nouvelle carte generee (numero ${data.card_number}, version ${data.version}).`,
      });
    } catch (err) {
      setReissueStatus({
        type: "error",
        text: err.response?.data?.detail || "Impossible de reemettre la carte - verifiez qu'une carte existe deja pour cet eleve.",
      });
    } finally {
      setReissuingCard(false);
    }
  }

  async function handleAssignClass(e) {
    e.preventDefault();
    setAssigningClass(true);
    try {
      const { data } = await apiClient.patch(`/api/v1/registrations/${encodeURIComponent(lookupResult.id)}/class`, {
        classId: newClassId,
      });
      setLookupResult(data);
    } catch (err) {
      setLookupError(err.response?.data?.message || "Impossible de mettre a jour la classe.");
    } finally {
      setAssigningClass(false);
    }
  }

  async function handleRosterSearch(e) {
    e.preventDefault();
    setLoadingRoster(true);
    setRosterError(null);
    setRoster(null);
    try {
      const { data } = await apiClient.get(`/api/v1/registrations/class/${encodeURIComponent(rosterClassId)}`);
      setRoster(data);
    } catch (err) {
      setRosterError(err.response?.data?.message || "Impossible de charger la liste des eleves.");
    } finally {
      setLoadingRoster(false);
    }
  }

  // La reaffectation ne peut se faire que vers une classe du meme etablissement que l'eleve
  // (verifie cote serveur) - on ne propose donc que ces classes-la dans le menu.
  const classesForReassign = lookupResult
    ? classes.filter((c) => c.establishmentId === lookupResult.establishmentId)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Inscriptions</h2>
        <p className="text-sm text-muted-foreground">
          Inscrire un eleve ou un membre du personnel, affecter une classe.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscrire un eleve</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">Prenom</Label>
                <Input id="firstName" value={student.firstName} onChange={updateStudentField("firstName")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Nom</Label>
                <Input id="lastName" value={student.lastName} onChange={updateStudentField("lastName")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">Date de naissance</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={student.dateOfBirth}
                  onChange={updateStudentField("dateOfBirth")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">Sexe</Label>
                <Select value={student.gender} onValueChange={(value) => setStudent((s) => ({ ...s, gender: value }))}>
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Feminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthPlace">Lieu de naissance</Label>
                <Input id="birthPlace" value={student.birthPlace} onChange={updateStudentField("birthPlace")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Adresse</Label>
                <Input id="address" value={student.address} onChange={updateStudentField("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nationalNumber">Numero National</Label>
                <Input id="nationalNumber" value={student.nationalNumber} onChange={updateStudentField("nationalNumber")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classId">Classe</Label>
                <Select value={student.classId} onValueChange={(value) => setStudent((s) => ({ ...s, classId: value }))}>
                  <SelectTrigger id="classId" className="w-full">
                    <SelectValue placeholder="Choisir une classe">
                      {(value) => {
                        const c = classes.find((cl) => cl.id === value);
                        return c ? classLabel(c) : "Choisir une classe";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 && (
                      <div className="px-2 py-1.5 text-sm text-muted-foreground">
                        Aucune classe - a creer dans "Classes &amp; matieres"
                      </div>
                    )}
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {classLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="guardianName">Nom du tuteur/parent</Label>
                <Input
                  id="guardianName"
                  value={student.guardianName}
                  onChange={updateStudentField("guardianName")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentEmail">Email du parent</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={student.parentEmail}
                  onChange={updateStudentField("parentEmail")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentEmailConfirm">Confirmer l'email du parent</Label>
                <Input
                  id="parentEmailConfirm"
                  type="email"
                  value={student.parentEmailConfirm}
                  onChange={updateStudentField("parentEmailConfirm")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentPhone">Telephone du parent</Label>
                <Input id="parentPhone" value={student.parentPhone} onChange={updateStudentField("parentPhone")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="secondGuardianName">Deuxieme tuteur/parent (optionnel)</Label>
                <Input
                  id="secondGuardianName"
                  placeholder="Nom (ex. l'autre parent)"
                  value={student.secondGuardianName}
                  onChange={updateStudentField("secondGuardianName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondGuardianEmail">Email du deuxieme tuteur</Label>
                <Input
                  id="secondGuardianEmail"
                  type="email"
                  value={student.secondGuardianEmail}
                  onChange={updateStudentField("secondGuardianEmail")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondGuardianPhone">Telephone du deuxieme tuteur</Label>
                <Input
                  id="secondGuardianPhone"
                  value={student.secondGuardianPhone}
                  onChange={updateStudentField("secondGuardianPhone")}
                />
              </div>
              <FileDropzone id="photo" label="Photo" file={studentPhoto} onChange={setStudentPhoto} />
              <FileDropzone
                id="birthCertificate"
                label="Acte de naissance"
                file={birthCertificate}
                onChange={setBirthCertificate}
              />
              {studentStatus && (
                <Alert variant={studentStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                  {studentStatus.text}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingStudent}>
                  {submittingStudent ? "Inscription..." : "Inscrire l'eleve"}
                </Button>
              </div>
            </form>
            {studentResult && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>
                  Dossier <span className="font-mono">{studentResult.id}</span>
                </p>
                <p className="text-muted-foreground">
                  Statut : <Badge variant={statusOf(REGISTRATION_STATUS, studentResult.status).variant}>
                    {statusOf(REGISTRATION_STATUS, studentResult.status).label}
                  </Badge>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscrire un membre du personnel</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStaffSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staffFirstName">Prenom</Label>
                <Input
                  id="staffFirstName"
                  value={staff.firstName}
                  onChange={updateStaffField("firstName")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffLastName">Nom</Label>
                <Input id="staffLastName" value={staff.lastName} onChange={updateStaffField("lastName")} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="staffEmail">Email</Label>
                <Input
                  id="staffEmail"
                  type="email"
                  value={staff.email}
                  onChange={updateStaffField("email")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffPhone">Telephone</Label>
                <Input id="staffPhone" value={staff.phone} onChange={updateStaffField("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffGender">Sexe</Label>
                <Select value={staff.gender} onValueChange={(value) => setStaff((s) => ({ ...s, gender: value }))}>
                  <SelectTrigger id="staffGender" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Feminin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffBirthPlace">Lieu de naissance</Label>
                <Input id="staffBirthPlace" value={staff.birthPlace} onChange={updateStaffField("birthPlace")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffAddress">Adresse</Label>
                <Input id="staffAddress" value={staff.address} onChange={updateStaffField("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffNationalNumber">Numero National</Label>
                <Input id="staffNationalNumber" value={staff.nationalNumber} onChange={updateStaffField("nationalNumber")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffRole">Role</Label>
                <Select value={staff.role} onValueChange={(value) => setStaff((s) => ({ ...s, role: value }))}>
                  <SelectTrigger id="staffRole" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role] ?? role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="staffEstablishmentId">Etablissement</Label>
                <Select
                  value={staff.establishmentId}
                  onValueChange={(value) => setStaff((s) => ({ ...s, establishmentId: value }))}
                >
                  <SelectTrigger id="staffEstablishmentId" className="w-full">
                    <SelectValue placeholder="Choisir un etablissement">
                      {(value) => establishments.find((e) => e.id === value)?.name || "Choisir un etablissement"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {establishments.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <FileDropzone id="cv" label="CV" file={cv} onChange={setCv} />
              <FileDropzone id="diploma" label="Diplome" file={diploma} onChange={setDiploma} />
              {staffStatus && (
                <Alert variant={staffStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                  {staffStatus.text}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingStaff}>
                  {submittingStaff ? "Inscription..." : "Inscrire le membre du personnel"}
                </Button>
              </div>
            </form>
            {staffResult && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>
                  Dossier <span className="font-mono">{staffResult.id}</span>
                </p>
                <p className="text-muted-foreground">
                  Statut : <Badge variant={statusOf(REGISTRATION_STATUS, staffResult.status).variant}>
                    {statusOf(REGISTRATION_STATUS, staffResult.status).label}
                  </Badge>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consulter un dossier / affecter une classe</CardTitle>
          <CardDescription>Rechercher un dossier d'inscription par identifiant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="lookupId">Identifiant du dossier</Label>
              <Input id="lookupId" value={lookupId} onChange={(e) => setLookupId(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loadingLookup}>
              {loadingLookup ? "Recherche..." : "Rechercher"}
            </Button>
          </form>

          {lookupError && <Alert variant="error">{lookupError}</Alert>}

          {lookupResult && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {lookupResult.firstName} {lookupResult.lastName}
                </p>
                <p className="text-muted-foreground">Type : {lookupResult.type}</p>
                {lookupResult.type === "STUDENT" && (
                  <p className="text-muted-foreground">
                    Tuteur(s) :{" "}
                    {lookupResult.guardians?.length > 0
                      ? lookupResult.guardians.map((g) => `${g.fullName} (${g.email})`).join(", ")
                      : "-"}
                  </p>
                )}
                <p className="text-muted-foreground">
                  Classe actuelle : {lookupResult.classId ? classNameById(lookupResult.classId) : "-"}
                </p>
                <p className="text-muted-foreground">
                  Statut : <Badge variant={statusOf(REGISTRATION_STATUS, lookupResult.status).variant}>
                    {statusOf(REGISTRATION_STATUS, lookupResult.status).label}
                  </Badge>
                </p>
              </div>
              {lookupResult.type === "STUDENT" && (
                <form onSubmit={handleAssignClass} className="flex items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="newClassId">Nouvelle classe</Label>
                    <Select value={newClassId} onValueChange={setNewClassId}>
                      <SelectTrigger id="newClassId" className="w-full">
                        <SelectValue placeholder="Choisir une classe">
                          {(value) => {
                            const c = classes.find((cl) => cl.id === value);
                            return c ? classLabel(c) : "Choisir une classe";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {classesForReassign.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {classLabel(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" disabled={assigningClass || !newClassId}>
                    {assigningClass ? "..." : "Affecter"}
                  </Button>
                </form>
              )}
              {lookupResult.type === "STUDENT" && (
                <div className="space-y-2 sm:col-span-2">
                  <Button type="button" variant="outline" disabled={reissuingCard} onClick={handleReissueCard}>
                    {reissuingCard ? "Reemission..." : "Reemettre la carte scolaire"}
                  </Button>
                  {reissueStatus && (
                    <Alert variant={reissueStatus.type === "success" ? "success" : "error"}>
                      {reissueStatus.text}
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Liste des eleves d'une classe</CardTitle>
          <CardDescription>Rechercher tous les eleves inscrits dans une classe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRosterSearch} className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="rosterClassId">Classe</Label>
              <Select value={rosterClassId} onValueChange={setRosterClassId}>
                <SelectTrigger id="rosterClassId" className="w-full">
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
            <Button type="submit" disabled={loadingRoster || !rosterClassId}>
              {loadingRoster ? "Recherche..." : "Afficher"}
            </Button>
          </form>

          {rosterError && <Alert variant="error">{rosterError}</Alert>}
          {roster && roster.length === 0 && <EmptyState icon={Users} message="Aucun eleve dans cette classe." />}
          {roster && roster.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Tuteur/parent</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((r) => {
                  const s = statusOf(REGISTRATION_STATUS, r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.firstName} {r.lastName}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.guardians?.length > 0 ? r.guardians.map((g) => g.fullName).join(", ") : "-"}
                      </TableCell>
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
  );
}
