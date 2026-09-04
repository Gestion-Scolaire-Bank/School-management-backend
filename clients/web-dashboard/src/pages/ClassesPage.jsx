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
import { useI18n } from "@/lib/i18n";

const EMPTY_CLASS = { name: "", level: "", acronym: "", registrationFees: "", schoolFees: "", academicYear: "2025-2026", establishmentId: "" };
const EMPTY_SUBJECT = { name: "", code: "" };
const EMPTY_ASSIGNMENT = { teacherId: "", classId: "", subjectId: "", academicYear: "2025-2026" };

function classLabel(c, establishments) {
  const est = establishments.find((e) => e.id === c.establishmentId);
  return `${c.name} (${c.level}) - ${est?.name || "?"}`;
}

export default function ClassesPage() {
  const { t } = useI18n();
  const role = getUser()?.role;
  const canManage = role === "ADMINISTRATEUR" || role === "DIRECTEUR";

  const [establishments, setEstablishments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);

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
    // stale-while-revalidate: keep previous lists on error, never wipe to []
    apiClient.get("/api/v1/admin/establishments").then((res) => setEstablishments(res.data || [])).catch(() => {});
    apiClient.get("/api/v1/admin/classes").then((res) => setClasses(res.data || [])).catch(() => {});
    apiClient.get("/api/v1/admin/subjects").then((res) => setSubjects(res.data || [])).catch(() => {});
    apiClient.get("/api/auth/users").then((res) => {
      const list = (res.data || []).filter((u) => u.role === "ENSEIGNANT");
      setTeachers(list);
    }).catch(() => {});
  }

  useEffect(() => { loadReferenceData(); }, []);

  async function handleClassSubmit(e) {
    e.preventDefault();
    if (!classForm.establishmentId) { setClassStatus({ type: "error", text: t("classes.field.establishment.empty") }); return; }
    setSubmittingClass(true);
    setClassStatus(null);
    try {
      const payload = {
        establishmentId: classForm.establishmentId,
        name: classForm.name.trim(),
        level: classForm.level.trim(),
        academicYear: classForm.academicYear.trim(),
        acronym: classForm.acronym.trim() || null,
        registrationFees: classForm.registrationFees ? Number(classForm.registrationFees) : null,
        schoolFees: classForm.schoolFees ? Number(classForm.schoolFees) : null,
      };
      await apiClient.post("/api/v1/admin/classes", payload);
      setClassStatus({ type: "success", text: t("classes.success") });
      setClassForm((f) => ({ ...EMPTY_CLASS, establishmentId: f.establishmentId, academicYear: f.academicYear }));
      loadReferenceData();
    } catch (err) {
      setClassStatus({ type: "error", text: err.response?.data?.message || t("classes.error") });
    } finally { setSubmittingClass(false); }
  }

  async function handleSubjectSubmit(e) {
    e.preventDefault();
    setSubmittingSubject(true);
    setSubjectStatus(null);
    try {
      await apiClient.post("/api/v1/admin/subjects", subjectForm);
      setSubjectStatus({ type: "success", text: "Subject created." });
      setSubjectForm(EMPTY_SUBJECT);
      loadReferenceData();
    } catch (err) {
      setSubjectStatus({ type: "error", text: err.response?.data?.message || "Unable to create subject — code may already exist." });
    } finally { setSubmittingSubject(false); }
  }

  function loadProgramme(classId) {
    setProgrammeClassId(classId);
    if (!classId) { setProgramme(null); return; }
    // keep previous programme visible while loading (no flicker on select change/blur)
    setLoadingProgramme(true);
    apiClient.get(`/api/v1/admin/classes/${classId}/subjects`).then((res) => setProgramme(res.data || [])).catch(() => {}).finally(() => setLoadingProgramme(false));
  }

  async function handleAssignSubject(e) {
    e.preventDefault();
    setAssigningSubject(true);
    setAssignStatus(null);
    try {
      await apiClient.post(`/api/v1/admin/classes/${programmeClassId}/subjects`, { subjectId: assignSubjectId, defaultCoefficient: Number(assignCoefficient) });
      setAssignStatus({ type: "success", text: t("classes.program.success") });
      setAssignSubjectId("");
      loadProgramme(programmeClassId);
    } catch (err) {
      setAssignStatus({ type: "error", text: err.response?.data?.message || t("classes.program.error") });
    } finally { setAssigningSubject(false); }
  }

  async function handleAssignmentSubmit(e) {
    e.preventDefault();
    setSubmittingAssignment(true);
    setAssignmentStatus(null);
    try {
      await apiClient.post("/api/v1/admin/teacher-assignments", { ...assignment, establishmentId: classes.find((c) => c.id === assignment.classId)?.establishmentId });
      setAssignmentStatus({ type: "success", text: t("classes.assignment.success") });
      setAssignment((a) => ({ ...EMPTY_ASSIGNMENT, academicYear: a.academicYear }));
    } catch (err) {
      setAssignmentStatus({ type: "error", text: err.response?.data?.message || t("classes.assignment.error") });
    } finally { setSubmittingAssignment(false); }
  }

  function loadAssignmentsByClass(classId) {
    setAssignmentClassId(classId);
    if (!classId) { setAssignmentsList(null); return; }
    // keep previous list visible while loading (no flicker on select change/blur)
    setLoadingAssignments(true);
    apiClient.get("/api/v1/admin/teacher-assignments", { params: { classId } }).then((res) => setAssignmentsList(res.data || [])).catch(() => {}).finally(() => setLoadingAssignments(false));
  }

  function subjectName(subjectId) { return subjects.find((s) => s.id === subjectId)?.name || subjectId; }

  const isClassValid = classForm.establishmentId && classForm.name.trim() && classForm.level.trim() && classForm.academicYear.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("classes.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("classes.subtitle")}</p>
      </div>

      {canManage && (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("classes.createTitle")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleClassSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="classEstablishment">{t("classes.field.establishment")}</Label>
                {/* Native select for reliability — fixes Base UI portal + type=submit dismissal bug */}
                <select
                  id="classEstablishment"
                  value={classForm.establishmentId}
                  onChange={(e) => setClassForm((f) => ({ ...f, establishmentId: e.target.value }))}
                  className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                  required
                >
                  <option value="">{t("classes.field.establishment.placeholder")}</option>
                  {establishments.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                {establishments.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400">{t("classes.field.establishment.empty")}</p>}
                {classForm.establishmentId && <p className="text-xs text-muted-foreground">Selected: {establishments.find(e=>e.id===classForm.establishmentId)?.name || classForm.establishmentId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="className">{t("classes.field.name")}</Label>
                <Input id="className" placeholder={t("classes.field.name.placeholder")} value={classForm.name} onChange={(e) => setClassForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classLevel">{t("classes.field.level")}</Label>
                <Input id="classLevel" placeholder={t("classes.field.level.placeholder")} value={classForm.level} onChange={(e) => setClassForm((f) => ({ ...f, level: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="classAcronym">{t("classes.field.acronym")}</Label>
                <Input id="classAcronym" placeholder={t("classes.field.acronym.placeholder")} value={classForm.acronym} onChange={(e) => setClassForm((f) => ({ ...f, acronym: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="registrationFees">{t("classes.field.registrationFees")}</Label>
                <Input id="registrationFees" type="number" placeholder="e.g. 15000" value={classForm.registrationFees} onChange={(e) => setClassForm((f) => ({ ...f, registrationFees: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="schoolFees">{t("classes.field.schoolFees")}</Label>
                <Input id="schoolFees" type="number" placeholder="e.g. 50000" value={classForm.schoolFees} onChange={(e) => setClassForm((f) => ({ ...f, schoolFees: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="classYear">{t("classes.field.academicYear")}</Label>
                <Input id="classYear" value={classForm.academicYear} onChange={(e) => setClassForm((f) => ({ ...f, academicYear: e.target.value }))} required />
              </div>
              {classStatus && <Alert variant={classStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">{classStatus.text}</Alert>}
              {!isClassValid && <p className="text-xs text-muted-foreground sm:col-span-2">{t("classes.hint.selectSchool")} — {t("common.required")}: {t("classes.field.establishment")}, {t("classes.field.name")}, {t("classes.field.level")}, {t("classes.field.academicYear")}</p>}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={submittingClass || !isClassValid}>{submittingClass ? t("classes.creating") : t("classes.create")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("classes.subject.createTitle")}</CardTitle>
            <CardDescription>{t("classes.subject.catalog")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubjectSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="subjectName">{t("classes.subject.field.name")}</Label>
                <Input id="subjectName" placeholder={t("classes.subject.field.name.placeholder")} value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subjectCode">{t("classes.subject.field.code")}</Label>
                <Input id="subjectCode" placeholder={t("classes.subject.field.code.placeholder")} value={subjectForm.code} onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))} required />
              </div>
              {subjectStatus && <Alert variant={subjectStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">{subjectStatus.text}</Alert>}
              <div className="sm:col-span-2"><Button type="submit" disabled={submittingSubject}>{submittingSubject ? t("classes.creating") : t("classes.subject.create")}</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("classes.program.title")}</CardTitle>
            <CardDescription>{t("classes.program.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="programmeClass">{t("classes.program.field.class")}</Label>
              <Select value={programmeClassId} onValueChange={loadProgramme}>
                <SelectTrigger id="programmeClass" className="w-full"><SelectValue placeholder={t("classes.program.field.class.placeholder")} /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{classLabel(c, establishments)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {canManage && programmeClassId && (
              <form onSubmit={handleAssignSubject} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                <div className="min-w-48 flex-1 space-y-1.5">
                  <Label htmlFor="assignSubjectId">{t("classes.program.addSubject")}</Label>
                  <Select value={assignSubjectId} onValueChange={setAssignSubjectId}>
                    <SelectTrigger id="assignSubjectId" className="w-full"><SelectValue placeholder={t("classes.subject.field.name")} /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="w-28 space-y-1.5">
                  <Label htmlFor="assignCoefficient">{t("classes.program.coefficient")}</Label>
                  <Input id="assignCoefficient" type="number" step="0.5" min="0.5" value={assignCoefficient} onChange={(e) => setAssignCoefficient(e.target.value)} />
                </div>
                <Button type="submit" disabled={assigningSubject || !assignSubjectId}>{assigningSubject ? t("classes.program.adding") : t("classes.program.add")}</Button>
              </form>
            )}
            {assignStatus && <Alert variant={assignStatus.type === "success" ? "success" : "error"}>{assignStatus.text}</Alert>}
            {loadingProgramme && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
            {programme && programme.length === 0 && <EmptyState icon={BookOpen} message={t("classes.program.empty")} />}
            {programme && programme.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>{t("classes.subject.field.name")}</TableHead><TableHead>{t("classes.program.coefficient")}</TableHead></TableRow></TableHeader>
                <TableBody>{programme.map((p) => <TableRow key={p.id}><TableCell className="font-medium">{p.subjectName} ({p.subjectCode})</TableCell><TableCell>{p.defaultCoefficient}</TableCell></TableRow>)}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("classes.assignment.title")}</CardTitle>
            <CardDescription>{t("classes.assignment.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canManage && (
              <form onSubmit={handleAssignmentSubmit} className="grid grid-cols-1 gap-3 border-b border-border pb-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="assignTeacherId">{t("classes.assignment.field.teacher")}</Label>
                  <select
                    id="assignTeacherId"
                    value={assignment.teacherId}
                    onChange={(e) => setAssignment((a) => ({ ...a, teacherId: e.target.value }))}
                    className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
                    required
                  >
                    <option value="">{t("classes.assignment.field.teacher.placeholder")}</option>
                    {teachers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email} ({u.email})
                      </option>
                    ))}
                  </select>
                  {teachers.length === 0 && <p className="text-xs text-muted-foreground">{t("classes.assignment.field.teacher.empty")}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assignClassId">{t("classes.assignment.field.class")}</Label>
                  <Select value={assignment.classId} onValueChange={(value) => setAssignment((a) => ({ ...a, classId: value, subjectId: "" }))}>
                    <SelectTrigger id="assignClassId" className="w-full"><SelectValue placeholder={t("classes.assignment.field.class.placeholder")} /></SelectTrigger>
                    <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{classLabel(c, establishments)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assignSubject">{t("classes.assignment.field.subject")}</Label>
                  <Select value={assignment.subjectId} onValueChange={(value) => setAssignment((a) => ({ ...a, subjectId: value }))}>
                    <SelectTrigger id="assignSubject" className="w-full"><SelectValue placeholder={t("classes.assignment.field.subject.placeholder")} /></SelectTrigger>
                    <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="assignYear">{t("classes.assignment.field.year")}</Label>
                  <Input id="assignYear" value={assignment.academicYear} onChange={(e) => setAssignment((a) => ({ ...a, academicYear: e.target.value }))} required />
                </div>
                {assignmentStatus && <Alert variant={assignmentStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">{assignmentStatus.text}</Alert>}
                <div className="sm:col-span-2"><Button type="submit" disabled={submittingAssignment || !assignment.classId || !assignment.subjectId}>{submittingAssignment ? t("classes.assignment.assigning") : t("classes.assignment.assign")}</Button></div>
              </form>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="assignmentClassFilter">{t("classes.assignment.filter")}</Label>
              <Select value={assignmentClassId} onValueChange={loadAssignmentsByClass}>
                <SelectTrigger id="assignmentClassFilter" className="w-full"><SelectValue placeholder={t("classes.assignment.filter.placeholder")} /></SelectTrigger>
                <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{classLabel(c, establishments)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {loadingAssignments && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
            {assignmentsList && assignmentsList.length === 0 && <EmptyState icon={UserCog} message={t("classes.assignment.empty")} />}
            {assignmentsList && assignmentsList.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>Teacher</TableHead><TableHead>Subject</TableHead><TableHead>Year</TableHead></TableRow></TableHeader>
                <TableBody>{assignmentsList.map((a) => {
                  const tchr = teachers.find((t) => t.id === a.teacherId);
                  const label = tchr ? (tchr.fullName || `${tchr.firstName||""} ${tchr.lastName||""}`.trim() || tchr.email) : a.teacherId.slice(0,8);
                  return <TableRow key={a.id}><TableCell className="text-xs">{label}</TableCell><TableCell>{subjectName(a.subjectId)}</TableCell><TableCell>{a.academicYear}</TableCell></TableRow>;
                })}</TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{t("classes.list.title")}</CardTitle></CardHeader>
        <CardContent>
          {classes.length === 0 ? <EmptyState icon={Layers} message={t("classes.list.empty")} /> : (
            <Table>
              <TableHeader><TableRow><TableHead>{t("classes.table.name")}</TableHead><TableHead>{t("classes.table.level")}</TableHead><TableHead>{t("classes.table.acronym")}</TableHead><TableHead>{t("classes.table.registration")}</TableHead><TableHead>{t("classes.table.tuition")}</TableHead><TableHead>{t("classes.table.year")}</TableHead><TableHead>{t("classes.table.school")}</TableHead></TableRow></TableHeader>
              <TableBody>{classes.map((c) => <TableRow key={c.id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.level}</TableCell><TableCell>{c.acronym || "-"}</TableCell><TableCell>{c.registrationFees || "-"}</TableCell><TableCell>{c.schoolFees || "-"}</TableCell><TableCell>{c.academicYear}</TableCell><TableCell>{establishments.find((e) => e.id === c.establishmentId)?.name || "-"}</TableCell></TableRow>)}</TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
