import React from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { logout } from "../api/auth";

// Menu principal - regroupe les cas d'utilisation Parent/Enseignant (section 2.1)
export default function HomeScreen({ navigation }: any) {
  async function handleLogout() {
    await logout();
    navigation.replace("Login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue</Text>
      <Button title="Scanner ma presence (QR)" onPress={() => navigation.navigate("PresenceScan")} />
      <View style={styles.spacer} />
      <Button title="Payer les frais de scolarite" onPress={() => navigation.navigate("Payment")} />
      <View style={styles.spacer} />
      <Button title="Consulter le bulletin" onPress={() => navigation.navigate("ReportCard")} />
      <View style={styles.spacer} />
      <Button title="Notifications" onPress={() => navigation.navigate("Notifications")} />
      <View style={styles.spacer} />
      <Button title="Se deconnecter" color="crimson" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  spacer: { height: 12 },
});
