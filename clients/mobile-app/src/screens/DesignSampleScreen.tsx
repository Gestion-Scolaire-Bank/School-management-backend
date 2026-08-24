import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

const PRESET_COLORS = ["#0f4c81", "#1e3a8a", "#10b981", "#ef4444", "#f59e0b", "#14b8a6", "#6366f1"];
const PRESET_BG_COLORS = ["#ffffff", "#f8fafc", "#f3f4f6", "#fef08a", "#dcfce7", "#fee2e2"];

export default function DesignSampleScreen() {
  const [schoolName, setSchoolName] = useState("Groupe Scolaire Bilingue");
  const [accentColor, setAccentColor] = useState("#0f4c81");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Modèles de Cartes</Text>
      <Text style={styles.subtitle}>Personnalisez la charte graphique des cartes d'identité.</Text>

      {/* Styled Mock ID Card Preview */}
      <View style={[styles.cardPreview, { backgroundColor }]}>
        {/* Header band */}
        <View style={[styles.cardHeader, { backgroundColor: accentColor }]}>
          <Text style={styles.cardHeaderTitle} numberOfLines={1}>
            {schoolName || "SchoolManage"}
          </Text>
          <Text style={styles.cardHeaderSubtitle}>Carte Scolaire</Text>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          <View style={styles.infoCol}>
            <Text style={styles.infoText}><Text style={styles.bold}>Nom :</Text> FOTSO Marie</Text>
            <Text style={styles.infoText}><Text style={styles.bold}>Classe :</Text> 3ème B</Text>
            <Text style={styles.infoText}><Text style={styles.bold}>Né(e) le :</Text> 15/06/2011</Text>
            <Text style={styles.infoText}><Text style={styles.bold}>Carte :</Text> SM-2026-F8D2E1</Text>
          </View>

          <View style={styles.visualCol}>
            {/* Photo frame */}
            <View style={[styles.photoFrame, { borderColor: accentColor }]}>
              <Text style={styles.photoFrameText}>Photo</Text>
            </View>
            
            {/* QR Code frame */}
            <View style={styles.qrFrame}>
              <Text style={styles.qrFrameText}>[QR]</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Configuration Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Nom de l'établissement</Text>
        <TextInput
          style={styles.input}
          value={schoolName}
          onChangeText={setSchoolName}
          placeholder="Ex: Lycée Bilingue"
        />

        <Text style={styles.label}>Couleur Principale (Accent)</Text>
        <View style={styles.presetsContainer}>
          {PRESET_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorPreset,
                { backgroundColor: color },
                accentColor === color && styles.selectedPreset,
              ]}
              onPress={() => setAccentColor(color)}
            />
          ))}
        </View>

        <Text style={styles.label}>Couleur de Fond de la Carte</Text>
        <View style={styles.presetsContainer}>
          {PRESET_BG_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorPreset,
                { backgroundColor: color, borderWidth: 1, borderColor: "#ccc" },
                backgroundColor === color && styles.selectedPreset,
              ]}
              onPress={() => setBackgroundColor(color)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1e293b", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 24 },
  cardPreview: {
    width: "100%",
    aspectRatio: 1.6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: "hidden",
    marginBottom: 24,
  },
  cardHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#ffffff",
    flex: 1,
    marginRight: 8,
  },
  cardHeaderSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  cardBody: {
    flex: 1,
    flexDirection: "row",
    padding: 16,
  },
  infoCol: {
    flex: 3,
    justifyContent: "center",
  },
  bold: { fontWeight: "bold" },
  infoText: {
    fontSize: 13,
    color: "#334155",
    marginBottom: 6,
  },
  visualCol: {
    flex: 2,
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  photoFrame: {
    width: 65,
    height: 75,
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  photoFrameText: {
    fontSize: 10,
    color: "#94a3b8",
  },
  qrFrame: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  qrFrameText: {
    fontSize: 10,
    color: "#64748b",
  },
  form: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#344054",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d0d5dd",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "#ffffff",
  },
  presetsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4,
  },
  colorPreset: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  selectedPreset: {
    borderWidth: 3,
    borderColor: "#0f4c81",
  },
});
