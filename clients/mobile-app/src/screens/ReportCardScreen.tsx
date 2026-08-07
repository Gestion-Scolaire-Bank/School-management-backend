import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import apiClient from "../api/client";

// UC18 - Consulter le bulletin (reportcard-service, section 3.5). GET /api/v1/reports/student/{id}
// attend l'identifiant de L'ELEVE (pas de resolution "me" cote backend) : un parent peut avoir
// plusieurs enfants, donc l'app demande l'ID - meme principe que ChildPage.jsx cote web-dashboard.
export default function ReportCardScreen() {
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLoad() {
    setLoading(true);
    setStatus(null);
    try {
      await apiClient.get(`/api/v1/reports/student/${encodeURIComponent(studentId)}`, {
        responseType: "blob",
      });
      setStatus("Bulletin charge.");
    } catch {
      setStatus("Bulletin non disponible pour cet identifiant.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bulletin scolaire</Text>
      <TextInput
        style={styles.input}
        placeholder="ID de l'eleve"
        value={studentId}
        onChangeText={setStudentId}
      />
      <Button title="Charger le bulletin" onPress={handleLoad} disabled={loading || !studentId} />
      {status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  status: { marginTop: 12 },
});
