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

export default function SchoolIdManagementPage() {
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
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]));
    apiClient
      .get("/api/v1/admin/establishments")
      .then((res) => setEstablishments(res.data || []))
      .catch(() => setEstablishments([]));
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
      setError("Impossible de charger les élèves de cette classe.");
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
    setActionStatus({ type: "info", text: "Téléversement de la photo..." });
    try {
      const formData = new FormData();
      formData.append("photo", file);
      await apiClient.patch(`/api/v1/registrations/${studentId}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setActionStatus({ type: "success", text: "Photo mise à jour avec succès." });
      fetchRoster(selectedClassId);
    } catch (err) {
      setActionStatus({
        type: "error",
        text: err.response?.data?.message || "Échec de la mise à jour de la photo.",
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
      setActionStatus({ type: "success", text: "Informations de l'élève mises à jour." });
      setEditingStudent(null);
      fetchRoster(selectedClassId);
    } catch (err) {
      setActionStatus({
        type: "error",
        text: err.response?.data?.message || "Échec de la mise à jour des informations.",
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const generateCard = async (student) => {
    setActionStatus({ type: "info", text: `Génération de la carte pour ${student.firstName}...` });
    try {
      const payload = {
        student_id: student.id,
        full_name: `${student.firstName} ${student.lastName}`,
        class_name: classes.find((c) => c.id === selectedClassId)?.name || "Classe",
        date_of_birth: student.dateOfBirth,
        photo_url: student.documents?.photo || null,
        school_name: schoolName,
        accent_color: accentColor,
        background_color: backgroundColor,
        logo_url: logoUrl || null,
      };

      await apiClient.post("/api/v1/school-id/generate", payload);
      setActionStatus({ type: "success", text: `Carte d'identité générée pour ${student.firstName}.` });
    } catch (err) {
      setActionStatus({
        type: "error",
        text: err.response?.data?.detail || "Erreur lors de la génération de la carte.",
      });
    }
  };

  const bulkGenerate = async () => {
    if (!students || students.length === 0) return;
    const eligible = students.filter((s) => s.documents?.photo);
    if (eligible.length === 0) {
      setActionStatus({
        type: "error",
        text: "Aucun élève dans cette classe n'a de photo disponible pour générer sa carte.",
      });
      return;
    }

    setActionStatus({
      type: "info",
      text: `Génération en lot de ${eligible.length} carte(s)...`,
    });

    let successCount = 0;
    for (const student of eligible) {
      try {
        const payload = {
          student_id: student.id,
          full_name: `${student.firstName} ${student.lastName}`,
          class_name: classes.find((c) => c.id === selectedClassId)?.name || "Classe",
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
      text: `Génération terminée : ${successCount}/${eligible.length} cartes créées avec succès.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Gestion des Cartes Scolaires</h2>
          <p className="text-sm text-muted-foreground">
            Mettez à jour les photos d'élèves et générez des cartes d'identité scolaires personnalisées par classe.
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
              Sélection de la Classe
            </CardTitle>
            <CardDescription>Sélectionnez un établissement et une classe pour afficher les élèves.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="establishmentId">Établissement</Label>
              <Select
                value={selectedEstablishmentId}
                onValueChange={(val) => {
                  setSelectedEstablishmentId(val);
                  setSelectedClassId("");
                  setStudents(null);
                }}
              >
                <SelectTrigger id="establishmentId">
                  <SelectValue placeholder="Choisir un établissement" />
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
              <Label htmlFor="classId">Classe</Label>
              <Select value={selectedClassId} onValueChange={handleClassChange} disabled={!selectedEstablishmentId}>
                <SelectTrigger id="classId">
                  <SelectValue placeholder="Choisir une classe" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Card Branding Config */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="size-4 text-primary" />
              Style de la Carte
            </CardTitle>
            <CardDescription>Saisissez les paramètres de charte graphique à appliquer lors de la génération.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="schoolNameInput">Nom de l'école sur la carte</Label>
              <Input
                id="schoolNameInput"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="SchoolManage"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoUrlInput">URL du Logo de l'école (facultatif)</Label>
              <Input
                id="logoUrlInput"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Ex: http://minio-url/logo.png"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accentColorInput">Couleur Principale (Accent)</Label>
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
              <Label htmlFor="bgColorInput">Couleur de Fond</Label>
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
            <CardTitle className="text-base">Liste des Élèves</CardTitle>
            <CardDescription>Tableau des inscriptions validées et statut de génération.</CardDescription>
          </div>
          {students && students.length > 0 && (
            <Button onClick={bulkGenerate} className="flex items-center gap-2 self-start sm:self-center">
              <RefreshCw className="size-4 animate-spin-hover" />
              Générer pour toute la classe
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingStudents && <div className="text-center py-6 text-sm text-muted-foreground">Chargement des élèves...</div>}
          
          {error && <Alert variant="error">{error}</Alert>}
          
          {!students && !loadingStudents && (
            <EmptyState icon={Layers} message="Veuillez sélectionner un établissement et une classe pour afficher les élèves." />
          )}

          {students && students.length === 0 && (
            <EmptyState icon={Layers} message="Aucun élève inscrit dans cette classe." />
          )}

          {students && students.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Photo</TableHead>
                  <TableHead>Nom Complet</TableHead>
                  <TableHead>Identifiant Dossier</TableHead>
                  <TableHead>Date de Naissance</TableHead>
                  <TableHead>Statut Dossier</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                              alt="Aperçu"
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
                          title="Modifier les infos"
                          onClick={() => openEditModal(student)}
                        >
                          <UserCog className="size-4 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!student.documents?.photo}
                          onClick={() => generateCard(student)}
                          title="Générer la carte scolaire"
                        >
                          Générer
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Voir la carte"
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
              <CardTitle className="text-base">Modifier les informations de l'élève</CardTitle>
              <CardDescription>Saisissez les détails à mettre à jour pour {editingStudent.firstName}.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editFirstName">Prénom</Label>
                    <Input
                      id="editFirstName"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editLastName">Nom</Label>
                    <Input
                      id="editLastName"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editDob">Date de naissance</Label>
                  <Input
                    id="editDob"
                    type="date"
                    value={editForm.dateOfBirth}
                    onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editGuardian">Nom du tuteur</Label>
                  <Input
                    id="editGuardian"
                    value={editForm.guardianName}
                    onChange={(e) => setEditForm({ ...editForm, guardianName: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="editEmail">Email parent</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editForm.parentEmail}
                      onChange={(e) => setEditForm({ ...editForm, parentEmail: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="editPhone">Téléphone parent</Label>
                    <Input
                      id="editPhone"
                      value={editForm.parentPhone}
                      onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingStudent(null)} disabled={savingInfo}>
                    Annuler
                  </Button>
                  <Button type="submit" disabled={savingInfo}>
                    {savingInfo ? "Enregistrement..." : "Enregistrer"}
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
                <CardTitle className="text-base">Carte d'Identité Scolaire</CardTitle>
                <CardDescription>Visualisation du rendu généré pour {previewStudentName}.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPreviewStudentId(null)}>
                Fermer
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center bg-muted/20 p-8">
              <div className="border border-border shadow-xl rounded-lg overflow-hidden bg-white shrink-0 mb-4">
                <img
                  src={`${apiClient.defaults.baseURL || "http://localhost:8888"}/api/v1/school-id/${previewStudentId}?v=${previewVersion}`}
                  alt="Carte Scolaire"
                  className="w-full max-w-[500px] h-auto aspect-[1.6] block"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='300' viewBox='0 0 500 300'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%236b7280'>Aucune carte active générée</text></svg>";
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
                  Télécharger (PNG)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
