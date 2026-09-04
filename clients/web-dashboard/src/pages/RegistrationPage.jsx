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
import { useI18n } from "@/lib/i18n";
import FileDropzone from "@/components/FileDropzone";
import { REGISTRATION_STATUS, statusOf } from "@/lib/status";
import FormCard from '@/components/FormCard';
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
  const { t } = useI18n();
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
    // stale-while-revalidate: never wipe selected value on error
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => {});
    apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => {});
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
      setStudentStatus({ type: "error", text: t("reg.student.error.emailMismatch") });
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
      setStudentStatus({ type: "success", text: t("reg.student.success") });
      setStudentResult(data);
      setStudent(EMPTY_STUDENT);
      setStudentPhoto(null);
      setBirthCertificate(null);
    } catch (err) {
      setStudentStatus({
        type: "error",
        text: err.response?.data?.message || t("reg.student.error"),
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
      setStaffStatus({ type: "success", text: t("reg.staff.success") });
      setStaffResult(data);
      setStaff(EMPTY_STAFF);
      setCv(null);
      setDiploma(null);
    } catch (err) {
      setStaffStatus({
        type: "error",
        text: err.response?.data?.message || t("reg.staff.error"),
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
      setLookupError(t("reg.lookup.notFound"));
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
        text: err.response?.data?.detail || t("reg.lookup.reissue.error") || "Impossible de reemettre la carte - verifiez qu'une carte existe deja pour cet eleve.",
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
      setLookupError(err.response?.data?.message || t("reg.roster.error") || "Impossible de mettre a jour la classe.");
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
      setRosterError(err.response?.data?.message || t("reg.roster.error") || "Impossible de charger la liste des eleves.");
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
        <h2 className="text-2xl font-semibold">{t("reg.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("reg.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("reg.student.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStudentSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">{t("reg.student.field.firstName")}</Label>
                <Input id="firstName" value={student.firstName} onChange={updateStudentField("firstName")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">{t("reg.student.field.lastName")}</Label>
                <Input id="lastName" value={student.lastName} onChange={updateStudentField("lastName")} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateOfBirth">{t("reg.student.field.dob")}</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={student.dateOfBirth}
                  onChange={updateStudentField("dateOfBirth")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gender">{t("reg.student.field.gender")}</Label>
                <Select value={student.gender} onValueChange={(value) => setStudent((s) => ({ ...s, gender: value }))}>
                  <SelectTrigger id="gender" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">{t("reg.student.field.gender.m")}</SelectItem>
                    <SelectItem value="F">{t("reg.student.field.gender.f")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="birthPlace">{t("reg.student.field.birthPlace")}</Label>
                <Input id="birthPlace" value={student.birthPlace} onChange={updateStudentField("birthPlace")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">{t("reg.student.field.address")}</Label>
                <Input id="address" value={student.address} onChange={updateStudentField("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nationalNumber">{t("reg.student.field.nationalNumber")}</Label>
                <Input id="nationalNumber" value={student.nationalNumber} onChange={updateStudentField("nationalNumber")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classId">{t("reg.student.field.class")}</Label>
                <select
                  id="classId"
                  value={student.classId}
                  onChange={(e) => setStudent((s) => ({ ...s, classId: e.target.value }))}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                >
                  <option value="">{t("reg.student.field.class.placeholder")}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {classLabel(c)}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("reg.student.field.class.empty")}</p>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="guardianName">{t("reg.student.field.guardian")}</Label>
                <Input
                  id="guardianName"
                  value={student.guardianName}
                  onChange={updateStudentField("guardianName")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentEmail">{t("reg.student.field.parentEmail")}</Label>
                <Input
                  id="parentEmail"
                  type="email"
                  value={student.parentEmail}
                  onChange={updateStudentField("parentEmail")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentEmailConfirm">{t("reg.student.field.parentEmailConfirm")}</Label>
                <Input
                  id="parentEmailConfirm"
                  type="email"
                  value={student.parentEmailConfirm}
                  onChange={updateStudentField("parentEmailConfirm")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parentPhone">{t("reg.student.field.parentPhone")}</Label>
                <Input id="parentPhone" value={student.parentPhone} onChange={updateStudentField("parentPhone")} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="secondGuardianName">{t("reg.student.field.secondGuardian")}</Label>
                <Input
                  id="secondGuardianName"
                  placeholder={t("reg.student.field.secondGuardian.placeholder")}
                  value={student.secondGuardianName}
                  onChange={updateStudentField("secondGuardianName")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondGuardianEmail">{t("reg.student.field.secondGuardianEmail")}</Label>
                <Input
                  id="secondGuardianEmail"
                  type="email"
                  value={student.secondGuardianEmail}
                  onChange={updateStudentField("secondGuardianEmail")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="secondGuardianPhone">{t("reg.student.field.secondGuardianPhone")}</Label>
                <Input
                  id="secondGuardianPhone"
                  value={student.secondGuardianPhone}
                  onChange={updateStudentField("secondGuardianPhone")}
                />
              </div>
              <FileDropzone id="photo" label={t("reg.student.field.photo")} file={studentPhoto} onChange={setStudentPhoto} />
              <FileDropzone
                id="birthCertificate"
                label={t("reg.student.field.birthCertificate")}
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
                  {submittingStudent ? t("reg.student.submitting") : t("reg.student.submit")}
                </Button>
              </div>
            </form>
            {studentResult && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>
                  {t("reg.lookup.field.id")} <span className="font-mono">{studentResult.id}</span>
                </p>
                <p className="text-muted-foreground">
                  {t("reg.lookup.type")} : <Badge variant={statusOf(REGISTRATION_STATUS, studentResult.status).variant}>
                    {statusOf(REGISTRATION_STATUS, studentResult.status).label}
                  </Badge>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("reg.staff.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleStaffSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="staffFirstName">{t("reg.staff.field.firstName")}</Label>
                <Input
                  id="staffFirstName"
                  value={staff.firstName}
                  onChange={updateStaffField("firstName")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffLastName">{t("reg.staff.field.lastName")}</Label>
                <Input id="staffLastName" value={staff.lastName} onChange={updateStaffField("lastName")} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="staffEmail">{t("reg.staff.field.email")}</Label>
                <Input
                  id="staffEmail"
                  type="email"
                  value={staff.email}
                  onChange={updateStaffField("email")}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffPhone">{t("reg.staff.field.phone")}</Label>
                <Input id="staffPhone" value={staff.phone} onChange={updateStaffField("phone")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffGender">{t("reg.staff.field.gender")}</Label>
                <Select value={staff.gender} onValueChange={(value) => setStaff((s) => ({ ...s, gender: value }))}>
                  <SelectTrigger id="staffGender" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">{t("reg.student.field.gender.m")}</SelectItem>
                    <SelectItem value="F">{t("reg.student.field.gender.f")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffBirthPlace">{t("reg.staff.field.birthPlace")}</Label>
                <Input id="staffBirthPlace" value={staff.birthPlace} onChange={updateStaffField("birthPlace")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffAddress">{t("reg.staff.field.address")}</Label>
                <Input id="staffAddress" value={staff.address} onChange={updateStaffField("address")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffNationalNumber">{t("reg.staff.field.nationalNumber")}</Label>
                <Input id="staffNationalNumber" value={staff.nationalNumber} onChange={updateStaffField("nationalNumber")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffRole">{t("reg.staff.field.role")}</Label>
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
                <Label htmlFor="staffEstablishmentId">{t("reg.field.school")}</Label>
                <select
                  id="staffEstablishmentId"
                  value={staff.establishmentId}
                  onChange={(e) => setStaff((s) => ({ ...s, establishmentId: e.target.value }))}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                  required
                >
                  <option value="">{t("reg.field.school.placeholder") || "Select a school"}</option>
                  {establishments.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                {establishments.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{t("classes.field.establishment.empty")}</p>}
              </div>
              <FileDropzone id="cv" label={t("reg.staff.field.cv")} file={cv} onChange={setCv} />
              <FileDropzone id="diploma" label={t("reg.staff.field.diploma")} file={diploma} onChange={setDiploma} />
              {staffStatus && (
                <Alert variant={staffStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                  {staffStatus.text}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingStaff}>
                  {submittingStaff ? t("reg.staff.submitting") : t("reg.staff.submit")}
                </Button>
              </div>
            </form>
            {staffResult && (
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <p>
                  {t("reg.lookup.field.id")} <span className="font-mono">{staffResult.id}</span>
                </p>
                <p className="text-muted-foreground">
                  {t("reg.lookup.type")} : <Badge variant={statusOf(REGISTRATION_STATUS, staffResult.status).variant}>
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
          <CardTitle className="text-base">{t("reg.lookup.title")}</CardTitle>
          <CardDescription>{t("reg.lookup.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleLookup} className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="lookupId">{t("reg.lookup.field.id")}</Label>
              <Input id="lookupId" value={lookupId} onChange={(e) => setLookupId(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loadingLookup}>
              {loadingLookup ? t("common.searching") : t("reg.lookup.search")}
            </Button>
          </form>

          {lookupError && <Alert variant="error">{lookupError}</Alert>}

          {lookupResult && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {lookupResult.firstName} {lookupResult.lastName}
                </p>
                <p className="text-muted-foreground">{t("reg.lookup.type")} : {lookupResult.type}</p>
                {lookupResult.type === "STUDENT" && (
                  <p className="text-muted-foreground">
                    {t("reg.lookup.guardians")} :{" "}
                    {lookupResult.guardians?.length > 0
                      ? lookupResult.guardians.map((g) => `${g.fullName} (${g.email})`).join(", ")
                      : "-"}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {t("reg.lookup.currentClass")} : {lookupResult.classId ? classNameById(lookupResult.classId) : "-"}
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
                    <Label htmlFor="newClassId">{t("reg.lookup.newClass")}</Label>
                    <select
                      id="newClassId"
                      value={newClassId}
                      onChange={(e) => setNewClassId(e.target.value)}
                      className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                    >
                      <option value="">{t("reg.student.field.class.placeholder")}</option>
                      {classesForReassign.map((c) => (
                        <option key={c.id} value={c.id}>
                          {classLabel(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" disabled={assigningClass || !newClassId}>
                    {assigningClass ? t("common.loading") : t("reg.lookup.assign")}
                  </Button>
                </form>
              )}
              {lookupResult.type === "STUDENT" && (
                <div className="space-y-2 sm:col-span-2">
                  <Button type="button" variant="outline" disabled={reissuingCard} onClick={handleReissueCard}>
                    {reissuingCard ? t("reg.lookup.reissuing") : t("reg.lookup.reissue")}
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
          <CardTitle className="text-base">{t("reg.roster.title")}</CardTitle>
          <CardDescription>{t("reg.roster.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleRosterSearch} className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1 space-y-1.5">
              <Label htmlFor="rosterClassId">{t("reg.roster.field.class")}</Label>
              <select
                id="rosterClassId"
                value={rosterClassId}
                onChange={(e) => setRosterClassId(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
              >
                <option value="">{t("reg.roster.field.class.placeholder")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {classLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loadingRoster || !rosterClassId}>
              {loadingRoster ? t("common.searching") : t("reg.roster.show")}
            </Button>
          </form>

          {rosterError && <Alert variant="error">{rosterError}</Alert>}
          {roster && roster.length === 0 && <EmptyState icon={Users} message={t("reg.roster.empty")} />}
          {roster && roster.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("reg.roster.table.name")}</TableHead>
                  <TableHead>{t("reg.roster.table.guardian")}</TableHead>
                  <TableHead>{t("reg.roster.table.status")}</TableHead>
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
