import React, { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import apiClient from "../api/client";
import { getCurrentUser } from "../api/auth";

// UC13 - Scanner QR (check-in/out) (presence-service, section 3.4).
// "Scanner MA presence" = auto-pointage Enseignant : le QR scanne est celui affiche
// dans la salle de classe et encode l'identifiant de la classe (classId). La personne
// pointee est l'utilisateur connecte (personId/personType STAFF), pas le contenu du QR -
// meme convention que le bouton de pointage cote web (PresencePage.jsx : personType STAFF).
export default function PresenceScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<string | null>(null);
  const [scanned, setScanned] = useState(false);

  async function handleScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    try {
      await apiClient.post("/api/v1/presence/check-in", {
        personId: getCurrentUser()?.id,
        personType: "STAFF",
        classId: data,
      });
      setStatus("Presence enregistree.");
    } catch {
      setStatus("Echec de l'enregistrement de la presence - reessayez.");
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>Autorisation camera requise pour scanner le QR code.</Text>
        <Button title="Autoriser la camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanned ? undefined : handleScan}
      />
      {status && <Text style={styles.status}>{status}</Text>}
      {scanned && <Button title="Scanner a nouveau" onPress={() => setScanned(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  status: { color: "#fff", textAlign: "center", padding: 12 },
});
