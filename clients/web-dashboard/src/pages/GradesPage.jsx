import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import apiClient from "../api/client";
import { getUser } from "../api/auth";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";

const EMPTY_GRADE = {
  student_id: "",
  class_id: "",
  period: "",
  subject_id: "",
  score: "",
  max_score: "20",
  weight: "1",
  evaluation_id: "",
};

function classLabel(c) {
  return `${c.name} (${c.level} - ${c.academicYear})`;
}

function studentLabel(s) {
  return `${s.firstName} ${s.lastName}`;
}

// UC17 - Saisir une note / UC18 (vue enseignant) - consulter la synthese de classe / UC20
// (vue admin) - generer les bulletins d'une classe (reportcard-service, section 3.5).
// POST /api/v1/reports/grades : role Enseignant, uniquement pour une classe/matiere qui lui
// est affectee (verifie cote serveur aupres d'admin-service - 403 sinon).
// GET /api/v1/reports/class/{id}/summary : Enseignant + Administrateur - lit les bulletins
// DEJA generes, pas les notes brutes : tant que personne n'a lance la generation ci-dessous,
// la synthese et le bulletin telechargeable par le parent (ChildPage.jsx) restent vides/404.
// POST /api/v1/reports/generate : role Administrateur uniquement.
export default function GradesPage() {
  const { t } = useI18n();
  const role = getUser()?.role;
  const isTeacher = role === "ENSEIGNANT";
  const isAdmin = role === "ADMINISTRATEUR";

  const [classes, setClasses] = useState([]);
  const [gradeClassSubjects, setGradeClassSubjects] = useState([]);
  const [gradeClassStudents, setGradeClassStudents] = useState([]);

  const [grade, setGrade] = useState(EMPTY_GRADE);
  const [gradeStatus, setGradeStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [summaryClassId, setSummaryClassId] = useState("");
  const [summaryPeriod, setSummaryPeriod] = useState("");
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const [generateClassId, setGenerateClassId] = useState("");
  const [generatePeriod, setGeneratePeriod] = useState("");
  const [generateStatus, setGenerateStatus] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => {});
  }, []);

  // Le programme (matieres) depend de la classe choisie - on ne propose que les matieres
  // reellement enseignees dans cette classe (cf. ClassSubject, admin-service).
  useEffect(() => {
    if (!grade.class_id) {
      setGradeClassSubjects([]);
      return;
    }
    // keep previous subjects visible while loading
    apiClient
      .get(`/api/v1/admin/classes/${grade.class_id}/subjects`)
      .then((res) => setGradeClassSubjects(res.data || []))
      .catch(() => {});
  }, [grade.class_id]);

  // La liste des eleves depend de la classe choisie - evite de devoir taper un UUID d'eleve a
  // la main pour saisir une note (cf. point de coherence - references reelles au lieu de
  // texte libre, meme pattern que le programme/matieres ci-dessus).
  useEffect(() => {
    if (!grade.class_id) {
      setGradeClassStudents([]);
      return;
    }
    // keep previous list visible while loading (no flicker/disappear on input blur)
    apiClient
      .get(`/api/v1/registrations/class/${grade.class_id}`)
      .then((res) => setGradeClassStudents(res.data || []))
      .catch(() => {});
  }, [grade.class_id]);

  const [classEvaluations, setClassEvaluations] = useState([]);
  useEffect(() => {
    if (!grade.class_id || !grade.subject_id) {
      setClassEvaluations([]);
      return;
    }
    apiClient
      .get("/api/v1/pedagogic/evaluations", { params: { class_id: grade.class_id, subject_id: grade.subject_id } })
      .then((res) => setClassEvaluations(res.data || []))
      .catch(() => {});
  }, [grade.class_id, grade.subject_id]);

  function updateGradeField(field) {
    return (e) => setGrade((g) => ({ ...g, [field]: e.target.value }));
  }

  async function handleGradeSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setGradeStatus(null);
    try {
      await apiClient.post("/api/v1/reports/grades", {
        ...grade,
        evaluation_id: (grade.evaluation_id && grade.evaluation_id !== "none") ? grade.evaluation_id : undefined,
        score: Number(grade.score),
        max_score: Number(grade.max_score),
        weight: Number(grade.weight),
      });
      setGradeStatus({ type: "success", text: t("grades.entry.success") });
      setGrade((g) => ({ ...EMPTY_GRADE, class_id: g.class_id, period: g.period }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      const text =
        err.response?.status === 403
          ? t("grades.entry.forbidden")
          : detail || t("grades.entry.error");
      setGradeStatus({ type: "error", text });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGenerateSubmit(e) {
    e.preventDefault();
    setGenerating(true);
    setGenerateStatus(null);
    try {
      const { data } = await apiClient.post("/api/v1/reports/generate", {
        class_id: generateClassId,
        period: generatePeriod,
      });
      setGenerateStatus({ type: "success", text: t("grades.generate.success", { count: data.length }) });
    } catch (err) {
      setGenerateStatus({
        type: "error",
        text: err.response?.data?.detail || t("grades.generate.error"),
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleSummarySubmit(e) {
    e.preventDefault();
    setLoadingSummary(true);
    setSummaryError(null);
    setSummary(null);
    try {
      const { data } = await apiClient.get(
        `/api/v1/reports/class/${encodeURIComponent(summaryClassId)}/summary`,
        { params: { period: summaryPeriod } }
      );
      setSummary(data);
    } catch {
      setSummaryError(t("grades.summary.error"));
    } finally {
      setLoadingSummary(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("grades.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("grades.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      {isTeacher && (
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("grades.entry.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGradeSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="class_id">{t("grades.field.class")}</Label>
              <Select
                value={grade.class_id}
                onValueChange={(value) => setGrade((g) => ({ ...g, class_id: value, subject_id: "", student_id: "" }))}
              >
                <SelectTrigger id="class_id" className="w-full">
                  <SelectValue placeholder={t("grades.field.class.placeholder")} />
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
              <Label htmlFor="student_id">{t("grades.field.student")}</Label>
              <Select
                value={grade.student_id}
                onValueChange={(value) => setGrade((g) => ({ ...g, student_id: value }))}
                disabled={!grade.class_id}
              >
                <SelectTrigger id="student_id" className="w-full">
                  <SelectValue placeholder={grade.class_id ? t("grades.field.student.placeholder") : t("grades.field.chooseClassFirst")} />
                </SelectTrigger>
                <SelectContent>
                  {grade.class_id && gradeClassStudents.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t("grades.empty.noStudents")}
                    </div>
                  )}
                  {gradeClassStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {studentLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period">{t("grades.field.period")}</Label>
              <Input
                id="period"
                placeholder={t("grades.field.period.placeholder")}
                value={grade.period}
                onChange={updateGradeField("period")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject_id">{t("grades.field.subject")}</Label>
              <Select
                value={grade.subject_id}
                onValueChange={(value) => setGrade((g) => ({ ...g, subject_id: value }))}
                disabled={!grade.class_id}
              >
                <SelectTrigger id="subject_id" className="w-full">
                  <SelectValue
                    placeholder={grade.class_id ? t("grades.field.subject.placeholder") : t("grades.field.chooseClassFirst")}
                   />
                </SelectTrigger>
                <SelectContent>
                  {gradeClassSubjects.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t("grades.empty.noSubjects")}
                    </div>
                  )}
                  {gradeClassSubjects.map((cs) => (
                    <SelectItem key={cs.subjectId} value={cs.subjectId}>
                      {cs.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evaluation_id">{t("grades.field.evaluation")}</Label>
              <Select
                value={grade.evaluation_id}
                onValueChange={(value) => setGrade((g) => ({ ...g, evaluation_id: value }))}
                disabled={!grade.subject_id}
              >
                <SelectTrigger id="evaluation_id" className="w-full">
                  <SelectValue
                    placeholder={grade.subject_id ? t("grades.field.evaluation.none") : t("grades.field.evaluation.chooseSubjectFirst")}
                   />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("grades.field.evaluation.free")}</SelectItem>
                  {classEvaluations.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.title} ({ev.evaluation_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="score">{t("grades.field.score")}</Label>
              <Input
                id="score"
                type="number"
                step="0.5"
                min="0"
                value={grade.score}
                onChange={updateGradeField("score")}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_score">{t("grades.field.maxScore")}</Label>
              <Input
                id="max_score"
                type="number"
                step="0.5"
                min="1"
                value={grade.max_score}
                onChange={updateGradeField("max_score")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">{t("grades.field.weight")}</Label>
              <Input
                id="weight"
                type="number"
                step="0.5"
                min="0.5"
                value={grade.weight}
                onChange={updateGradeField("weight")}
              />
            </div>
            {gradeStatus && (
              <Alert variant={gradeStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                {gradeStatus.text}
              </Alert>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting || !grade.subject_id || !grade.student_id}>
                {submitting ? t("grades.entry.submitting") : t("grades.entry.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      {isAdmin && (
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">{t("grades.generate.title")}</CardTitle>
          <CardDescription>
            {t("grades.generate.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerateSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="generateClassId">{t("grades.field.class")}</Label>
              <Select value={generateClassId} onValueChange={setGenerateClassId}>
                <SelectTrigger id="generateClassId" className="w-full">
                  <SelectValue placeholder={t("grades.field.class.placeholder")} />
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
              <Label htmlFor="generatePeriod">{t("grades.field.period")}</Label>
              <Input
                id="generatePeriod"
                placeholder={t("grades.field.period.placeholder")}
                value={generatePeriod}
                onChange={(e) => setGeneratePeriod(e.target.value)}
                required
              />
            </div>
            {generateStatus && (
              <Alert variant={generateStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                {generateStatus.text}
              </Alert>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={generating || !generateClassId}>
                {generating ? t("grades.generate.generating") : t("grades.generate.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      <Card className={isTeacher || isAdmin ? "xl:col-span-3" : "xl:col-span-5"}>
        <CardHeader>
          <CardTitle className="text-base">{t("grades.summary.title")}</CardTitle>
          <CardDescription>{t("grades.summary.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSummarySubmit} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 space-y-1.5">
              <Label htmlFor="summaryClassId">{t("grades.field.class")}</Label>
              <Select value={summaryClassId} onValueChange={setSummaryClassId}>
                <SelectTrigger id="summaryClassId" className="w-full">
                  <SelectValue placeholder={t("grades.field.class.placeholder")} />
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
              <Label htmlFor="summaryPeriod">{t("grades.field.period")}</Label>
              <Input
                id="summaryPeriod"
                value={summaryPeriod}
                onChange={(e) => setSummaryPeriod(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loadingSummary || !summaryClassId}>
              {loadingSummary ? t("grades.summary.loading") : t("grades.summary.show")}
            </Button>
          </form>

          {summaryError && <Alert variant="error">{summaryError}</Alert>}

          {summary && summary.student_count === 0 && (
            <EmptyState
              icon={GraduationCap}
              message={t("grades.summary.empty", {
                hint: isAdmin ? t("grades.summary.empty.hintAdmin") : t("grades.summary.empty.hintTeacher"),
              })}
            />
          )}

          {summary && summary.student_count > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {t("grades.summary.statsPrefix", { count: summary.student_count })}{" "}
                <span className="font-medium text-foreground">{summary.class_average.toFixed(2)}/20</span>
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("grades.table.student")}</TableHead>
                    <TableHead>{t("grades.table.average")}</TableHead>
                    <TableHead>{t("grades.table.rank")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.students.map((s) => (
                    <TableRow key={s.student_id}>
                      <TableCell className="font-medium">{s.student_name}</TableCell>
                      <TableCell>{s.average.toFixed(2)}/20</TableCell>
                      <TableCell>{s.rank}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
