import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Button,
  ScrollView,
  Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import apiClient from "../api/client";

export default function SchoolIdManagementScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  
  // Screen views: "ROSTER", "DETAIL", "CAMERA"
  const [screenMode, setScreenMode] = useState<"ROSTER" | "DETAIL" | "CAMERA">("ROSTER");
  
  // Styling settings
  const [schoolName, setSchoolName] = useState("Groupe Scolaire Bilingue");
  const [accentColor, setAccentColor] = useState("#0f4c81");

  // Edit details form
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editDob, setEditDob] = useState("");

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const cameraRef = useRef<any>(null);

  useEffect(() => {
    setLoading(true);
    apiClient
      .get("/api/v1/admin/classes")
      .then((res) => setClasses(res.data || []))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  const fetchRoster = async (classId: string) => {
    if (!classId) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/api/v1/registrations/class/${classId}`);
      setStudents(data || []);
    } catch {
      setStatus("Échec du chargement des élèves.");
    } finally {
      setLoading(false);
    }
  };

  const selectClass = (classId: string) => {
    setSelectedClassId(classId);
    fetchRoster(classId);
  };

  const viewStudent = (student: any) => {
    setSelectedStudent(student);
    setEditFirstName(student.firstName || "");
    setEditLastName(student.lastName || "");
    setEditDob(student.dateOfBirth || "");
    setScreenMode("DETAIL");
  };

  const saveStudentInfo = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    setStatus(null);
    try {
      await apiClient.patch(`/api/v1/registrations/${selectedStudent.id}/info`, {
        firstName: editFirstName,
        lastName: editLastName,
        dateOfBirth: editDob,
      });
      setStatus("Informations enregistrées !");
      fetchRoster(selectedClassId);
      // Refresh current details selection
      setSelectedStudent({
        ...selectedStudent,
        firstName: editFirstName,
        lastName: editLastName,
        dateOfBirth: editDob,
      });
    } catch {
      setStatus("Erreur lors de la mise à jour des infos.");
    } finally {
      setSaving(false);
    }
  };

  const startCamera = async () => {
    if (!permission) return;
    if (!permission.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        setStatus("Autorisation caméra requise pour prendre une photo.");
        return;
      }
    }
    setScreenMode("CAMERA");
  };

  const captureAndUploadPhoto = async () => {
    if (!cameraRef.current || !selectedStudent) return;
    setSaving(true);
    setStatus(null);
    try {
      const options = { quality: 0.8 };
      const photo = await cameraRef.current.takePictureAsync(options);
      
      const formData = new FormData();
      formData.append("photo", {
        uri: photo.uri,
        name: `student_${selectedStudent.id}.jpg`,
        type: "image/jpeg",
      } as any);

      await apiClient.patch(`/api/v1/registrations/${selectedStudent.id}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus("Photo mise à jour avec succès !");
      await fetchRoster(selectedClassId);
      // reload the student detail with the new photo link
      const updated = students.find((s) => s.id === selectedStudent.id);
      if (updated) {
        setSelectedStudent(updated);
      }
      setScreenMode("DETAIL");
    } catch (err) {
      setStatus("Erreur lors de l'upload de la photo.");
    } finally {
      setSaving(false);
    }
  };

  const triggerGenerateCard = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    setStatus(null);
    try {
      const currentClass = classes.find((c) => c.id === selectedClassId);
      await apiClient.post("/api/v1/school-id/generate", {
        student_id: selectedStudent.id,
        full_name: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        class_name: currentClass?.name || "Classe",
        date_of_birth: selectedStudent.dateOfBirth,
        photo_url: selectedStudent.documents?.photo || null,
        school_name: schoolName,
        accent_color: accentColor,
      });
      setStatus("Carte scolaire générée avec succès !");
    } catch {
      setStatus("Échec de la génération de la carte.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {screenMode === "CAMERA" ? (
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} ref={cameraRef} />
          <View style={styles.cameraButtons}>
            <TouchableOpacity style={styles.captureBtn} onPress={captureAndUploadPhoto}>
              <Text style={styles.btnText}>Prendre Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setScreenMode("DETAIL")}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : screenMode === "DETAIL" && selectedStudent ? (
        <ScrollView style={styles.scroll}>
          <Text style={styles.title}>Détails de l'élève</Text>
          {status && <Text style={styles.status}>{status}</Text>}

          {/* Student Photo */}
          <View style={styles.photoContainer}>
            {selectedStudent.documents?.photo ? (
              <Image source={{ uri: selectedStudent.documents.photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>Aucune Photo</Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraTriggerBtn} onPress={startCamera}>
              <Text style={styles.btnText}>Prendre une photo (Appareil)</Text>
            </TouchableOpacity>
          </View>

          {/* Edit Form */}
          <View style={styles.form}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput style={styles.input} value={editFirstName} onChangeText={setEditFirstName} />

            <Text style={styles.label}>Nom</Text>
            <TextInput style={styles.input} value={editLastName} onChangeText={setEditLastName} />

            <Text style={styles.label}>Date de naissance (AAAA-MM-JJ)</Text>
            <TextInput style={styles.input} value={editDob} onChangeText={setEditDob} placeholder="Ex: 2011-06-15" />

            <TouchableOpacity style={styles.saveBtn} onPress={saveStudentInfo} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Enregistrer modifications</Text>}
            </TouchableOpacity>
          </View>

          {/* Style parameters for test generation */}
          <View style={styles.designBlock}>
            <Text style={styles.designTitle}>Style de génération</Text>
            <Text style={styles.label}>Nom de l'établissement</Text>
            <TextInput style={styles.input} value={schoolName} onChangeText={setSchoolName} />
            <Text style={styles.label}>Couleur principale (Accent)</Text>
            <TextInput style={styles.input} value={accentColor} onChangeText={setAccentColor} placeholder="Ex: #0f4c81" />
          </View>

          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: accentColor }]}
            onPress={triggerGenerateCard}
            disabled={saving || !selectedStudent.documents?.photo}
          >
            <Text style={styles.btnText}>Générer la Carte Scolaire</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => setScreenMode("ROSTER")}>
            <Text style={styles.backBtnText}>Retour à la liste</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <View style={styles.main}>
          <Text style={styles.title}>Gestion des Cartes</Text>
          {status && <Text style={styles.status}>{status}</Text>}

          {/* Class Selector Dropdown */}
          <Text style={styles.label}>Sélectionner une classe</Text>
          <View style={styles.pickerContainer}>
            {classes.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={[styles.pickerItem, selectedClassId === c.id && styles.pickerItemActive]}
                onPress={() => selectClass(c.id)}
              >
                <Text style={[styles.pickerItemText, selectedClassId === c.id && styles.pickerItemTextActive]}>
                  {c.name} ({c.level})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.studentItem} onPress={() => viewStudent(item)}>
                  <View style={styles.studentAvatarContainer}>
                    {item.documents?.photo ? (
                      <Image source={{ uri: item.documents.photo }} style={styles.studentThumb} />
                    ) : (
                      <View style={styles.studentThumbPlaceholder} />
                    )}
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {item.firstName} {item.lastName}
                    </Text>
                    <Text style={styles.studentMeta}>Dossier: {item.id.substring(0, 8)}...</Text>
                  </View>
                  <View style={styles.chevron} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Text style={styles.emptyText}>
                  {selectedClassId ? "Aucun élève inscrit." : "Sélectionnez une classe pour commencer."}
                </Text>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  scroll: { padding: 16 },
  main: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", color: "#1e293b", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#64748b", marginVertical: 8 },
  status: { padding: 12, backgroundColor: "#e2e8f0", borderRadius: 8, color: "#1e293b", marginVertical: 8 },
  pickerContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  pickerItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#e2e8f0" },
  pickerItemActive: { backgroundColor: "#0f4c81" },
  pickerItemText: { fontSize: 13, color: "#334155" },
  pickerItemTextActive: { color: "#ffffff", fontWeight: "bold" },
  loader: { marginVertical: 24 },
  studentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  studentAvatarContainer: { marginRight: 12 },
  studentThumb: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#cbd5e1" },
  studentThumbPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#cbd5e1" },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  studentMeta: { fontSize: 12, color: "#64748b" },
  chevron: { width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: "#cbd5e1", transform: [{ rotate: "45deg" }] },
  emptyText: { textAlign: "center", color: "#64748b", marginTop: 24 },
  photoContainer: { alignItems: "center", marginBottom: 20 },
  avatar: { width: 120, height: 140, borderRadius: 8, backgroundColor: "#cbd5e1" },
  avatarPlaceholder: { width: 120, height: 140, borderRadius: 8, backgroundColor: "#e2e8f0", justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText: { fontSize: 12, color: "#64748b" },
  cameraTriggerBtn: { marginTop: 12, backgroundColor: "#0f4c81", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  form: { backgroundColor: "#ffffff", padding: 16, borderRadius: 8, borderWidth: 1, borderColor: "#e2e8f0", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6, padding: 8, fontSize: 14, marginBottom: 12 },
  saveBtn: { backgroundColor: "#10b981", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  generateBtn: { paddingVertical: 14, borderRadius: 8, alignItems: "center", marginBottom: 12 },
  designBlock: { backgroundColor: "#f1f5f9", padding: 16, borderRadius: 8, marginBottom: 16 },
  designTitle: { fontSize: 15, fontWeight: "bold", color: "#334155", marginBottom: 8 },
  backBtn: { paddingVertical: 12, alignItems: "center", marginBottom: 32 },
  backBtnText: { color: "#64748b", fontWeight: "600" },
  btnText: { color: "#ffffff", fontWeight: "bold" },
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraButtons: { flexDirection: "row", justifyContent: "space-around", padding: 24, backgroundColor: "#000" },
  captureBtn: { backgroundColor: "#10b981", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  cancelBtn: { backgroundColor: "#ef4444", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  cancelBtnText: { color: "#ffffff", fontWeight: "bold" },
});
