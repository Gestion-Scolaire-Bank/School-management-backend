import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import apiClient from "../api/client";

// UC18 - Consulter le bulletin (reportcard-service, section 3.5)
export default function ReportCardScreen() {
  const [status, setStatus] = useState("Chargement du bulletin...");

  useEffect(() => {
    apiClient
      .get("/api/v1/reports/student/me")
      .then(() => setStatus("Bulletin charge."))
      .catch(() => setStatus("Bulletin non disponible - endpoint reportcard-service pas encore implemente."));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bulletin scolaire</Text>
      <Text>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
});
