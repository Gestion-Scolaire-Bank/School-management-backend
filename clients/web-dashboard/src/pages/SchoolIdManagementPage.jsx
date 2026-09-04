import { useEffect, useState } from "react";
import { CreditCard, Upload, UserCog, RefreshCw, Eye, Check, AlertTriangle, Layers, Building2 } from "lucide-react";
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
import { REGISTRATION_STATUS, statusOf } from "@/lib/status";
import { useI18n } from "@/lib/i18n";

export default function SchoolIdManagementPage() {
  const { t } = useI18n();
  const [classes, setClasses] = useState([]);
  const [establishments, setEstablishments] = useState([]);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [error, setError] = useState(null);

  // Global card design config overrides
  const [schoolName, setSchoolName] = useState("Groupe Scolaire Bilingue");
  const [accentColor, setAccentColor] = useState("#0f4c81");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [logoUrl, setLogoUrl] = useState("");

  // Edit Modal State
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    guardianName: "",
    parentEmail: "",
    parentPhone: "",
  });
  const [savingInfo, setSavingInfo] = useState(false);

  // Card Preview Modal State
  const [previewStudentId, setPreviewStudentId] = useState(null);
  const [previewStudentName, setPreviewStudentName] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);

  // Status logs
  const [actionStatus, setActionStatus] = useState(null);

  useEffect(() => {
    // stale-while-revalidate: keep stale list on error, never wipe selected value
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => {});
    apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => {});
  }, []);

  const filteredClasses = selectedEstablishmentId
    ? classes.filter((c) => c.establishmentId === selectedEstablishmentId)
    : classes;

  const fetchRoster = async (classId) => {
    if (!classId) return;
    setLoadingStudents(true);
    setError(null);
    try {
      const { data } = await apiClient.get(`/api/v1/registrations/class/${classId}`);
      setStudents(data || []);
    } catch (err) {
      setError(t("sid.roster.error"));
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleClassChange = (value) => {
    setSelectedClassId(value);
    fetchRoster(value);
  };

  const handlePhotoUpload = async (studentId, file) => {
    if (!file) return;
    setActionStatus({ type: "info", text: t("sid.photo.uploading") });
    try {
      const formData = new FormData();
      formData.append("photo", file);
      await apiClient.patch(`/api/v1/registrations/${studentId}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setActionStatus({ type: "success", text: t("sid.photo.success") });
      fetchRoster(selectedClassId);
    } catch (err) {
      setActionStatus({
        type: "error",
        text: err.response?.data?.message || t("sid.photo.error"),
      });
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditForm({
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      dateOfBirth: student.dateOfBirth || "",
      guardianName: student.guardians?.[0]?.fullName || "",
      parentEmail: student.guardians?.[0]?.email || "",
      parentPhone: student.guardians?.[0]?.phone || "",
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    try {
      await apiClient.patch(`/api/v1/registrations/${editingStudent.id}/info`, editForm);
      setActionStatus({ type: "success", text: t("sid.edit.success") });
      setEditingStudent(null);
      fetchRoster(selectedClassId);
    } catch (err) {
      setActionStatus({
        type: "error",
        text: err.response?.data?.message || t("sid.edit.error"),
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const generateCard = async (student) => {
    setActionStatus({ type: "info", text: t("sid.generate.generating", { name: student.firstName }) });
    try {
      const payload = {
        student_id: student.id,
        full_name: `${student.firstName} ${student.lastName}`,
        class_name: classes.find((c) => c.id === selectedClassId)?.name || t("sid.classFallback"),
        date_of_birth: student.dateOfBirth,
        photo_url: student.documents?.photo || null,
        school_name: schoolName,
        accent_color: accentColor,
        background_color: backgroundColor,
        logo_url: logoUrl || null,
      };

      await apiClient.post("/api/v1/school-id/generate", payload);
      setActionStatus({ type: "success", text: t("sid.generate.success", { name: student.firstName }) });
    } catch (err) {
      setActionStatus({
        type: "error",
        text: err.response?.data?.detail || t("sid.generate.error"),
      });
    }
  };

  const bulkGenerate = async () => {
    if (!students || students.length === 0) return;
    const eligible = students.filter((s) => s.documents?.photo);
    if (eligible.length === 0) {
      setActionStatus({
        type: "error",
        text: t("sid.bulk.noPhoto"),
      });
      return;
    }

    setActionStatus({
      type: "info",
      text: t("sid.bulk.generating", { count: eligible.length }),
    });

    let successCount = 0;
    for (const student of eligible) {
      try {
        const payload = {
          student_id: student.id,
          full_name: `${student.firstName} ${student.lastName}`,
          class_name: classes.find((c) => c.id === selectedClassId)?.name || t("sid.classFallback"),
          date_of_birth: student.dateOfBirth,
          photo_url: student.documents?.photo || null,
          school_name: schoolName,
          accent_color: accentColor,
          background_color: backgroundColor,
          logo_url: logoUrl || null,
        };
        await apiClient.post("/api/v1/school-id/generate", payload);
        successCount++;
      } catch (err) {
        // Continue generation for other students
      }
    }

    setActionStatus({
      type: "success",
      text: t("sid.bulk.done", { success: successCount, total: eligible.length }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t("sid.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("sid.subtitle")}
          </p>
        </div>
      </div>

      {actionStatus && (
        <Alert
          variant={
            actionStatus.type === "success"
              ? "success"
              : actionStatus.type === "info"
              ? "info"
              : "error"
          }
          className="animate-fade-in"
        >
          {actionStatus.text}
        </Alert>
      )}

      {/* Class Selection & Styling Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              {t("sid.filter.title")}
            </CardTitle>
            <CardDescription>{t("sid.filter.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="establishmentId">{t("sid.field.establishment")}</Label>
              <select
                id="establishmentId"
                value={selectedEstablishmentId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedEstablishmentId(val);
                  setSelectedClassId("");
                  setStudents(null);
                }}
                className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
              >
                <option value="">{t("sid.field.establishment.placeholder")}</option>
                {establishments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="classId">{t("sid.field.class")}</Label>
              <select
                id="classId"
                value={selectedClassId}
                onChange={(e) => handleClassChange(e.target.value)}
                disabled={!selectedEstablishmentId}
                className="flex h-8 w-full rounded-lg border border-input bg-popover px-2.5 text-sm text-popover-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 [&>option]:bg-popover [&>option]:text-popover-foreground"
              >
                <option value="">{t("sid.field.class.placeholder")}</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
              {selectedEstablishmentId && filteredClasses.length === 0 && (
                <p className="text-xs text-muted-foreground">{t("sid.roster.empty.none")}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Card Branding Config */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              {t("sid.style.title")}
            </CardTitle>
            <CardDescription>{t("sid.style.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="schoolNameInput">{t("sid.style.field.schoolName")}</Label>
              <Input
                id="schoolNameInput"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="SchoolManage"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoUrlInput">{t("sid.style.field.logoUrl")}</Label>
              <Input
                id="logoUrlInput"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder={t("sid.style.field.logoUrl.placeholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accentColorInput">{t("sid.style.field.accent")}</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColorInput"
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-12 h-10 p-0 border-none cursor-pointer"
                />
                <Input
                  type="text"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bgColorInput">{t("sid.style.field.background")}</Label>
              <div className="flex gap-2">
                <Input
                  id="bgColorInput"
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-12 h-10 p-0 border-none cursor-pointer"
                />
                <Input
                  type="text"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Roster list */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-base">{t("sid.roster.title")}</CardTitle>
            <CardDescription>{t("sid.roster.subtitle")}</CardDescription>
          </div>
          {students && students.length > 0 && (
            <Button onClick={bulkGenerate} className="flex items-center gap-2 self-start sm:self-center">
              <RefreshCw className="size-4 animate-spin-hover" />
              {t("sid.bulk.submit")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingStudents && <div className="text-center py-6 text-sm text-muted-foreground">{t("sid.roster.loading")}</div>}
          
          {error && <Alert variant="error">{error}</Alert>}
          
          {!students && !loadingStudents && (
            <EmptyState icon={Layers} message={t("sid.roster.empty.select")} />
          )}

          {students && students.length === 0 && (
            <EmptyState icon={Layers} message={t("sid.roster.empty.none")} />
          )}

          {students && students.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t("sid.table.photo")}</TableHead>
                  <TableHead>{t("sid.table.fullName")}</TableHead>
                  <TableHead>{t("sid.table.recordId")}</TableHead>
                  <TableHead>{t("sid.table.dob")}</TableHead>
                  <TableHead>{t("sid.table.status")}</TableHead>
                  <TableHead className="text-right">{t("sid.table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => {
                  const s = statusOf(REGISTRATION_STATUS, student.status);
                  return (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="relative group size-12 rounded-lg border border-border overflow-hidden bg-muted flex items-center justify-center">
                          {student.documents?.photo ? (
                            <img
                              src={student.documents.photo}
                              alt={t("sid.photo.previewAlt")}
                              className="size-full object-cover"
                            />
                          ) : (
                            <CreditCard className="size-5 text-muted-foreground/50" />
                          )}
                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-[10px] font-medium">
                            <Upload className="size-3.5 mb-0.5" />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoUpload(student.id, e.target.files?.[0])}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-sm">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {student.id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {student.dateOfBirth || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.variant}>{s.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("sid.action.edit")}
                          onClick={() => openEditModal(student)}
                        >
                          <UserCog className="size-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!student.documents?.photo}
                          onClick={() => generateCard(student)}
                          title={t("sid.action.generateTitle")}
                        >
                          {t("sid.action.generate")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("sid.action.view")}
                          onClick={() => {
                            setPreviewStudentId(student.id);
                            setPreviewStudentName(`${student.firstName} ${student.lastName}`);
                            setPreviewVersion((v) => v + 1);
                          }}
                        >
                          <Eye className="size-4 text-muted-foreground hover:text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Info Modal */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="w-full max-w-lg bg-card shadow-2xl">
            <CardHeader>
              <CardTitle className="text-base">{t("sid.edit.title")}</CardTitle>
              <CardDescription>{t("sid.edit.subtitle", { name: editingStudent.firstName })}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editFirstName">{t("sid.edit.field.firstName")}</Label>
                    <Input
                      id="editFirstName"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editLastName">{t("sid.edit.field.lastName")}</Label>
                    <Input
                      id="editLastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editDob">{t("sid.edit.field.dob")}</Label>
                  <Input
                    id="editDob"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editGuardian">{t("sid.edit.field.guardian")}</Label>
                  <Input
                    id="editGuardian"
                    value={editForm.guardianName}
                    onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editEmail">{t("sid.edit.field.parentEmail")}</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editForm.parentEmail}
                      onChange={(e) => setEditForm({ ...editForm, parentEmail: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editPhone">{t("sid.edit.field.parentPhone")}</Label>
                    <Input
                      id="editPhone"
                      value={editForm.parentPhone}
                      onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} disabled={savingInfo}>
                    {t("sid.edit.cancel")}
                  </Button>
                  <Button type="submit" disabled={savingInfo}>
                    {savingInfo ? t("sid.edit.saving") : t("sid.edit.save")}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Card Preview Modal */}
      {previewStudentId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
          <Card className="w-full max-w-2xl bg-card shadow-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base">{t("sid.preview.title")}</CardTitle>
                <CardDescription>{t("sid.preview.subtitle", { name: previewStudentName })}</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewStudentId(null)}>
                {t("sid.preview.close")}
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center bg-muted/20 p-8">
              <div className="border border-border shadow-xl rounded-lg overflow-hidden bg-white shrink-0 mb-4">
                <img
                  src={`${apiClient.defaults.baseURL || "http://localhost:8888"}/api/v1/school-id/${previewStudentId}?v=${previewVersion}`}
                  alt={t("sid.preview.imageAlt")}
                  className="w-full max-w-[500px] h-auto aspect-[1.6] block"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='300' viewBox='0 0 500 300'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%236b7280'>" + t("sid.preview.emptyCard") + "</text></svg>";
                  }}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    const downloadUrl = `${apiClient.defaults.baseURL || "http://localhost:8888"}/api/v1/school-id/${previewStudentId}`;
                    const a = document.createElement("a");
                    a.href = downloadUrl;
                    a.download = `carte_scolaire_${previewStudentId}.png`;
                    a.click();
                  }}
                >
                  {t("sid.preview.download")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
