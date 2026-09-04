import { useEffect, useState } from "react";
import { BookOpen, NotebookText } from "lucide-react";
import apiClient from "../api/client";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/EmptyState";
import FileDropzone from "@/components/FileDropzone";

const RESOURCE_TYPES = ["DOCUMENT", "VIDEO", "LESSON_PLAN", "EVALUATION"];

const EMPTY_RESOURCE = {
  title: "",
  resource_type: "DOCUMENT",
  description: "",
  class_id: "",
  subject_id: "",
};

const EMPTY_COURSE = { title: "", class_id: "", subject_id: "", content: "" };

function classLabel(c) {
  return `${c.name} (${c.level} - ${c.academicYear})`;
}

// UC15/UC16 - Uploader une ressource pedagogique / creer un cours (pedagogic-service,
// section 3.5). Toutes les routes /api/v1/pedagogic/** sont reservees au role Enseignant.
//
// class_id/subject_id remplacent les anciens champs "Matiere"/"Classe" en texte libre : le
// programme (subjects) depend de la classe choisie (GET /api/v1/admin/classes/{id}/subjects,
// meme source que ClassesPage/GradesPage) et le serveur rejette (403) toute classe/matiere
// non affectee a l'enseignant connecte (cf. point de coherence - references reelles au lieu
// de texte libre, meme garde-fou que la saisie de notes dans reportcard-service).
export default function ResourcesPage() {
  const { t } = useI18n();
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const [classes, setClasses] = useState([]);

  const [resourceForm, setResourceForm] = useState(EMPTY_RESOURCE);
  const [resourceSubjects, setResourceSubjects] = useState([]);
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [course, setCourse] = useState(EMPTY_COURSE);
  const [courseSubjects, setCourseSubjects] = useState([]);
  const [courseStatus, setCourseStatus] = useState(null);
  const [creatingCourse, setCreatingCourse] = useState(false);

  function loadResources() {
    setLoadingResources(true);
    return apiClient
      .get("/api/v1/pedagogic/resources")
      .then((res) => setResources(res.data || []))
      .catch(() => setResources([]))
      .finally(() => setLoadingResources(false));
  }

  function loadCourses() {
    setLoadingCourses(true);
    return apiClient
      .get("/api/v1/pedagogic/courses")
      .then((res) => setCourses(res.data || []))
      .catch(() => setCourses([]))
      .finally(() => setLoadingCourses(false));
  }

  useEffect(() => {
    loadResources();
    loadCourses();
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!resourceForm.class_id) {
      setResourceSubjects([]);
      return;
    }
    apiClient
      .get(`/api/v1/admin/classes/${resourceForm.class_id}/subjects`)
      .then((res) => setResourceSubjects(res.data || []))
      .catch(() => setResourceSubjects([]));
  }, [resourceForm.class_id]);

  useEffect(() => {
    if (!course.class_id) {
      setCourseSubjects([]);
      return;
    }
    apiClient
      .get(`/api/v1/admin/classes/${course.class_id}/subjects`)
      .then((res) => setCourseSubjects(res.data || []))
      .catch(() => setCourseSubjects([]));
  }, [course.class_id]);

  function updateResourceField(field) {
    return (e) => setResourceForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setUploadStatus({ type: "error", text: t("res.upload.noFile") });
      return;
    }
    setUploading(true);
    setUploadStatus(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      Object.entries(resourceForm).forEach(([key, value]) => formData.append(key, value));

      await apiClient.post("/api/v1/pedagogic/resources", formData);
      setUploadStatus({ type: "success", text: t("res.upload.success") });
      setResourceForm(EMPTY_RESOURCE);
      setFile(null);
      e.target.reset?.();
      await loadResources();
    } catch (err) {
      const text =
        err.response?.status === 403
          ? t("res.upload.forbidden")
          : t("res.upload.error");
      setUploadStatus({ type: "error", text });
    } finally {
      setUploading(false);
    }
  }

  function updateCourseField(field) {
    return (e) => setCourse((c) => ({ ...c, [field]: e.target.value }));
  }

  async function handleCreateCourse(e) {
    e.preventDefault();
    setCreatingCourse(true);
    setCourseStatus(null);
    try {
      await apiClient.post("/api/v1/pedagogic/courses", course);
      setCourseStatus({ type: "success", text: t("res.course.success") });
      setCourse(EMPTY_COURSE);
      await loadCourses();
    } catch (err) {
      const text =
        err.response?.status === 403
          ? t("res.course.forbidden")
          : t("res.course.error");
      setCourseStatus({ type: "error", text });
    } finally {
      setCreatingCourse(false);
    }
  }

  function resourceClassLabel(classId) {
    const c = classes.find((cl) => cl.id === classId);
    return c ? classLabel(c) : null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">{t("res.title")}</h2>
        <p className="text-sm text-muted-foreground">
          {t("res.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("res.upload.title")}</CardTitle>
          <CardDescription>{t("res.upload.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              {/* validation "obligatoire" geree en JS (handleUpload) plutot qu'en HTML5 :
                  plus fiable pour un input file rempli programmatiquement (tests, extensions). */}
              <FileDropzone id="file" label={t("res.field.file")} file={file} onChange={setFile} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">{t("res.field.title")}</Label>
              <Input id="title" value={resourceForm.title} onChange={updateResourceField("title")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource_type">{t("res.field.type")}</Label>
              <Select
                value={resourceForm.resource_type}
                onValueChange={(value) => setResourceForm((f) => ({ ...f, resource_type: value }))}
              >
                <SelectTrigger id="resource_type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`res.type.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resourceClassId">{t("res.field.classOptional")}</Label>
              <Select
                value={resourceForm.class_id}
                onValueChange={(value) => setResourceForm((f) => ({ ...f, class_id: value, subject_id: "" }))}
              >
                <SelectTrigger id="resourceClassId" className="w-full">
                  <SelectValue placeholder={t("res.field.class.none")} />
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
              <Label htmlFor="resourceSubjectId">{t("res.field.subjectOptional")}</Label>
              <Select
                value={resourceForm.subject_id}
                onValueChange={(value) => setResourceForm((f) => ({ ...f, subject_id: value }))}
                disabled={!resourceForm.class_id}
              >
                <SelectTrigger id="resourceSubjectId" className="w-full">
                  <SelectValue placeholder={resourceForm.class_id ? t("res.field.subject.none") : t("res.field.chooseClassFirst")} />
                </SelectTrigger>
                <SelectContent>
                  {resourceSubjects.map((cs) => (
                    <SelectItem key={cs.subjectId} value={cs.subjectId}>
                      {cs.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">{t("res.field.description")}</Label>
              <Input id="description" value={resourceForm.description} onChange={updateResourceField("description")} />
            </div>
            {uploadStatus && (
              <Alert variant={uploadStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                {uploadStatus.text}
              </Alert>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={uploading}>
                {uploading ? t("res.upload.uploading") : t("res.upload.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("res.course.title")}</CardTitle>
          <CardDescription>{t("res.course.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateCourse} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="courseTitle">{t("res.field.title")}</Label>
              <Input id="courseTitle" value={course.title} onChange={updateCourseField("title")} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="courseClassId">{t("res.field.class")}</Label>
              <Select
                value={course.class_id}
                onValueChange={(value) => setCourse((c) => ({ ...c, class_id: value, subject_id: "" }))}
              >
                <SelectTrigger id="courseClassId" className="w-full">
                  <SelectValue placeholder={t("res.field.class.placeholder")} />
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="courseSubjectId">{t("res.field.subject")}</Label>
              <Select
                value={course.subject_id}
                onValueChange={(value) => setCourse((c) => ({ ...c, subject_id: value }))}
                disabled={!course.class_id}
              >
                <SelectTrigger id="courseSubjectId" className="w-full">
                  <SelectValue placeholder={course.class_id ? t("res.field.subject.placeholder") : t("res.field.chooseClassFirst")} />
                </SelectTrigger>
                <SelectContent>
                  {courseSubjects.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      {t("res.empty.noSubjects")}
                    </div>
                  )}
                  {courseSubjects.map((cs) => (
                    <SelectItem key={cs.subjectId} value={cs.subjectId}>
                      {cs.subjectName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="courseContent">{t("res.field.content")}</Label>
              <Textarea
                id="courseContent"
                className="min-h-32"
                value={course.content}
                onChange={updateCourseField("content")}
                required
              />
            </div>
            {courseStatus && (
              <Alert variant={courseStatus.type === "success" ? "success" : "error"} className="sm:col-span-2">
                {courseStatus.text}
              </Alert>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creatingCourse || !course.subject_id}>
                {creatingCourse ? t("res.course.creating") : t("res.course.submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("res.list.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingResources ? (
            <p className="text-sm text-muted-foreground">{t("res.loading")}</p>
          ) : resources.length === 0 ? (
            <EmptyState icon={BookOpen} message={t("res.list.empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("res.table.title")}</TableHead>
                  <TableHead>{t("res.table.type")}</TableHead>
                  <TableHead>{t("res.table.subject")}</TableHead>
                  <TableHead>{t("res.table.class")}</TableHead>
                  <TableHead>{t("res.table.file")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resources.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{RESOURCE_TYPES.includes(r.resource_type) ? t(`res.type.${r.resource_type}`) : r.resource_type}</Badge>
                    </TableCell>
                    <TableCell>{r.subject_name || "-"}</TableCell>
                    <TableCell>{resourceClassLabel(r.class_id) || "-"}</TableCell>
                    <TableCell>
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {r.file_name}
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("res.courses.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingCourses ? (
            <p className="text-sm text-muted-foreground">{t("res.loading")}</p>
          ) : courses.length === 0 ? (
            <EmptyState icon={NotebookText} message={t("res.courses.empty")} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("res.table.title")}</TableHead>
                  <TableHead>{t("res.table.subject")}</TableHead>
                  <TableHead>{t("res.table.class")}</TableHead>
                  <TableHead>{t("res.table.content")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.subject_name}</TableCell>
                    <TableCell>{resourceClassLabel(c.class_id) || "-"}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">{c.content}</TableCell>
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
