import { useEffect, useState } from "react";
import apiClient from "../api/client";
import { getUser } from "../api/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import { Layers, BookOpen, UserCog } from "lucide-react";

const EMPTY_CLASS = { name: "", level: "", academicYear: "2025-2026", establishmentId: "" };
const EMPTY_SUBJECT = { name: "", code: "" };
const EMPTY_ASSIGNMENT = { teacherId: "", classId: "", subjectId: "", academicYear: "2025-2026" };

function classLabel(c, establishments) {
  const est = establishments.find((e) => e.id === c.establishmentId);
  return `${c.name} (${c.level}) - ${est?.name || "?"}`;
}

// Gestion des donnees de reference (admin-service) : classes, matieres, programme d'une
// classe, affectation des enseignants - remplace les champs texte libre "className"/"subject"
// jusqu'ici ressaisis independamment dans chaque service (cf. chantier de coherence des
// donnees). GET accessible a Administrateur/Directeur/Enseignant, POST reserve a
// Administrateur/Directeur (cf. sm-gateway-service - application.yml, regles RBAC).
export default function ClassesPage() {
  const role = getUser()?.role;
  const canManage = role === "ADMINISTRATEUR" || role === "DIRECTEUR";

  const [establishments, setEstablishments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [classForm, setClassForm] = useState(EMPTY_CLASS);
  const [classStatus, setClassStatus] = useState(null);
  const [submittingClass, setSubmittingClass] = useState(false);

  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT);
  const [subjectStatus, setSubjectStatus] = useState(null);
  const [submittingSubject, setSubmittingSubject] = useState(false);

  const [programmeClassId, setProgrammeClassId] = useState("");
  const [programme, setProgramme] = useState(null);
  const [loadingProgramme, setLoadingProgramme] = useState(false);
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignCoefficient, setAssignCoefficient] = useState("1");
  const [assignStatus, setAssignStatus] = useState(null);
  const [assigningSubject, setAssigningSubject] = useState(false);

  const [assignment, setAssignment] = useState(EMPTY_ASSIGNMENT);
  const [assignmentStatus, setAssignmentStatus] = useState(null);
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [assignmentsList, setAssignmentsList] = useState(null);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  function loadReferenceData() {
    apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => setEstablishments([]));
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
    apiClient
      .get("/api/v1/admin/subjects")
      .then((res) => setSubjects(res.data || []))
      .catch(() => setSubjects([]));
  }

  useEffect(() => {
    loadReferenceData();
  }, []);

  async function handleClassSubmit(e) {
    e.preventDefault();
    setSubmittingClass(true);
    setClassStatus(null);
    try {
      await apiClient.post("/api/v1/admin/classes", classForm);
      setClassStatus({ type: "success", text: "Classe creee." });
      setClassForm((f) => ({ ...EMPTY_CLASS, establishmentId: f.establishmentId, academicYear: f.academicYear }));
      loadReferenceData();
    } catch (err) {
      setClassStatus({
        type: "error",
        text: err.response?.data?.message || "Impossible de creer la classe - verifiez les champs.",
      });
    } finally {
      setSubmittingClass(false);
    }
  }

  async function handleSubjectSubmit(e) {
    e.preventDefault();
    setSubmittingSubject(true);
    setSubjectStatus(null);
    try {
      await apiClient.post("/api/v1/admin/subjects", subjectForm);
      setSubjectStatus({ type: "success", text: "Matiere creee." });
      setSubjectForm(EMPTY_SUBJECT);
      loadReferenceData();
    } catch (err) {
      setSubjectStatus({
        type: "error",
        text: err.response?.data?.message || "Impossible de creer la matiere - ce code existe peut-etre deja.",
      });
    } finally {
      setSubmittingSubject(false);
    }
  }

  function loadProgramme(classId) {
    setProgrammeClassId(classId);
    setProgramme(null);
    if (!classId) return;
    setLoadingProgramme(true);
    apiClient
      .get(`/api/v1/admin/classes/${classId}/subjects`)
      .then((res) => setProgramme(res.data || []))
      .catch(() => setProgramme([]))
      .finally(() => setLoadingProgramme(false));
  }

  async function handleAssignSubject(e) {
    e.preventDefault();
    setAssigningSubject(true);
    setAssignStatus(null);
    try {
      await apiClient.post(`/api/v1/admin/classes/${programmeClassId}/subjects`, {
        subjectId: assignSubjectId,
        defaultCoefficient: Number(assignCoefficient),
      });
      setAssignStatus({ type: "success", text: "Matiere associee a la classe." });
      setAssignSubjectId("");
      loadProgramme(programmeClassId);
    } catch (err) {
      setAssignStatus({
        type: "error",
        text: err.response?.data?.message || "Impossible d'associer cette matiere - elle est peut-etre deja dans le programme.",
      });
    } finally {
      setAssigningSubject(false);
    }
  }

  async function handleAssignmentSubmit(e) {
    e.preventDefault();
    setSubmittingAssignment(true);
    setAssignmentStatus(null);
    try {
      await apiClient.post("/api/v1/admin/teacher-assignments", {
        ...assignment,
        establishmentId: classes.find((c) => c.id === assignment.classId)?.establishmentId,
      });
      setAssignmentStatus({ type: "success", text: "Enseignant affecte." });
      setAssignment((a) => ({ ...EMPTY_ASSIGNMENT, academicYear: a.academicYear }));
    } catch (err) {
      setAssignmentStatus({
        type: "error",
        text: err.response?.data?.message || "Impossible d'affecter cet enseignant - verifiez qu'il n'est pas deja affecte.",
      });
    } finally {
      setSubmittingAssignment(false);
    }
  }

  function loadAssignmentsByClass(classId) {
    setAssignmentClassId(classId);
    setAssignmentsList(null);
    if (!classId) return;
    setLoadingAssignments(true);
    apiClient
      .get("/api/v1/admin/teacher-assignments", { params: { classId } })
      .then((res) => setAssignmentsList(res.data || []))
      .catch(() => setAssignmentsList([]))
      .finally(() => setLoadingAssignments(false));
  }

  function subjectName(subjectId) {
    return subjects.find((s) => s.id === subjectId)?.name || subjectId;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Classes &amp; matieres</h2>
        <p className="text-sm text-muted-foreground">
          Classes, programme par classe et affectation des enseignants - source commune utilisee par
          les inscriptions, les notes et les tarifs.
        </p>
      </div>

      {canManage && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creer une classe</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleClassSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="classEstablishment">Etablissement</Label>
                <Select
                  value={classForm.establishmentId}
                  onValueChange={(value) => setClassForm((f) => ({ ...f, establishmentId: value }))}
                >
                  <SelectTrigger id="classEstablishment" className="w-full">
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
              <div className="space-y-1.5">
                <Label htmlFor="className">Nom</Label>
                <Input
                  id="className"
                  placeholder="ex. 6eme A"
                  value={classForm.name}
                  onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classLevel">Niveau</Label>
                <Input
                  id="classLevel"
                  placeholder="ex. 6eme"
                  value={classForm.level}
                  onChange={(e) => setClassForm((f) => ({ ...f, level: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="classYear">Annee scolaire</Label>
                <Input
                  id="classYear"
                  value={classForm.academicYear}
                  onChange={(e) => setClassForm((f) => ({ ...f, academicYear: e.target.value }))}
                  required
                />
              </div>
              {classStatus && (
                <Alert variant={classStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                  {classStatus.text}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingClass || !classForm.establishmentId}>
                  {submittingClass ? "Creation..." : "Creer la classe"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Creer une matiere</CardTitle>
            <CardDescription>Catalogue partage entre tous les etablissements.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubjectSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subjectName">Nom</Label>
                <Input
                  id="subjectName"
                  placeholder="ex. Mathematiques"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subjectCode">Code</Label>
                <Input
                  id="subjectCode"
                  placeholder="ex. MATH"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))}
                  required
                />
              </div>
              {subjectStatus && (
                <Alert variant={subjectStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                  {subjectStatus.text}
                </Alert>
              )}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingSubject}>
                  {submittingSubject ? "Creation..." : "Creer la matiere"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programme d'une classe</CardTitle>
            <CardDescription>Matieres enseignees et coefficient par defaut.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="programmeClass">Classe</Label>
              <Select value={programmeClassId} onValueChange={loadProgramme}>
                <SelectTrigger id="programmeClass" className="w-full">
                  <SelectValue placeholder="Choisir une classe">
                    {(value) => {
                      const c = classes.find((cl) => cl.id === value);
                      return c ? classLabel(c, establishments) : "Choisir une classe";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {classLabel(c, establishments)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canManage && programmeClassId && (
              <form onSubmit={handleAssignSubject} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="min-w-48 flex-1 space-y-1.5">
                  <Label htmlFor="assignSubjectId">Ajouter une matiere</Label>
                  <Select value={assignSubjectId} onValueChange={setAssignSubjectId}>
                    <SelectTrigger id="assignSubjectId" className="w-full">
                      <SelectValue placeholder="Choisir une matiere">
                        {(value) => {
                          const s = subjects.find((sub) => sub.id === value);
                          return s ? `${s.name} (${s.code})` : "Choisir une matiere";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1.5">
                  <Label htmlFor="assignCoefficient">Coefficient</Label>
                  <Input
                    id="assignCoefficient"
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={assignCoefficient}
                    onChange={(e) => setAssignCoefficient(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={assigningSubject || !assignSubjectId}>
                  {assigningSubject ? "..." : "Ajouter"}
                </Button>
              </form>
            )}
            {assignStatus && <Alert variant={assignStatus.type === "success" ? "success" : "error"}>{assignStatus.text}</Alert>}

            {loadingProgramme && <p className="text-sm text-muted-foreground">Chargement...</p>}
            {programme && programme.length === 0 && (
              <EmptyState icon={BookOpen} message="Aucune matiere dans le programme de cette classe." />
            )}
            {programme && programme.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matiere</TableHead>
                    <TableHead>Coefficient</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programme.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {p.subjectName} ({p.subjectCode})
                      </TableCell>
                      <TableCell>{p.defaultCoefficient}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Affectation des enseignants</CardTitle>
            <CardDescription>Qui a le droit de noter/publier des ressources pour quelle classe/matiere.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManage && (
              <form onSubmit={handleAssignmentSubmit} className="grid grid-cols-1 gap-3 border-b border-border pb-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="assignTeacherId">Identifiant de l'enseignant</Label>
                  <Input
                    id="assignTeacherId"
                    value={assignment.teacherId}
                    onChange={(e) => setAssignment((a) => ({ ...a, teacherId: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assignClassId">Classe</Label>
                  <Select
                    value={assignment.classId}
                    onValueChange={(value) => setAssignment((a) => ({ ...a, classId: value, subjectId: "" }))}
                  >
                    <SelectTrigger id="assignClassId" className="w-full">
                      <SelectValue placeholder="Choisir une classe">
                        {(value) => {
                          const c = classes.find((cl) => cl.id === value);
                          return c ? classLabel(c, establishments) : "Choisir une classe";
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {classLabel(c, establishments)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assignSubject">Matiere</Label>
                  <Select
                    value={assignment.subjectId}
                    onValueChange={(value) => setAssignment((a) => ({ ...a, subjectId: value }))}
                  >
                    <SelectTrigger id="assignSubject" className="w-full">
                      <SelectValue placeholder="Choisir une matiere">
                        {(value) => subjects.find((s) => s.id === value)?.name || "Choisir une matiere"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="assignYear">Annee scolaire</Label>
                  <Input
                    id="assignYear"
                    value={assignment.academicYear}
                    onChange={(e) => setAssignment((a) => ({ ...a, academicYear: e.target.value }))}
                    required
                  />
                </div>
                {assignmentStatus && (
                  <Alert variant={assignmentStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                    {assignmentStatus.text}
                  </Alert>
                )}
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={submittingAssignment || !assignment.classId || !assignment.subjectId}>
                    {submittingAssignment ? "Affectation..." : "Affecter"}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="assignmentClassFilter">Voir les affectations d'une classe</Label>
              <Select value={assignmentClassId} onValueChange={loadAssignmentsByClass}>
                <SelectTrigger id="assignmentClassFilter" className="w-full">
                  <SelectValue placeholder="Choisir une classe">
                    {(value) => {
                      const c = classes.find((cl) => cl.id === value);
                      return c ? classLabel(c, establishments) : "Choisir une classe";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {classLabel(c, establishments)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingAssignments && <p className="text-sm text-muted-foreground">Chargement...</p>}
            {assignmentsList && assignmentsList.length === 0 && (
              <EmptyState icon={UserCog} message="Aucun enseignant affecte a cette classe." />
            )}
            {assignmentsList && assignmentsList.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enseignant</TableHead>
                    <TableHead>Matiere</TableHead>
                    <TableHead>Annee</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentsList.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.teacherId}</TableCell>
                      <TableCell>{subjectName(a.subjectId)}</TableCell>
                      <TableCell>{a.academicYear}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Classes enregistrees</CardTitle>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <EmptyState icon={Layers} message="Aucune classe enregistree." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Annee</TableHead>
                  <TableHead>Etablissement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.level}</TableCell>
                    <TableCell>{c.academicYear}</TableCell>
                    <TableCell>{establishments.find((e) => e.id === c.establishmentId)?.name || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
