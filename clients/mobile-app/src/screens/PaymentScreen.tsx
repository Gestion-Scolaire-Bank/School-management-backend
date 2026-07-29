import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import apiClient from "../api/client";

// UC9 - Payer les frais de scolarite (Mobile Money) (payment-service, section 3.3)
export default function PaymentScreen() {
  const [amount, setAmount] = useState("");
  const [studentId, setStudentId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handlePay() {
    setStatus(null);
    try {
      // TODO : appeler POST /api/v1/payments/fees (payment-service, via le Gateway)
      await apiClient.post("/api/v1/payments/fees", { amount, studentId });
      setStatus("Paiement initie - en attente de confirmation Mobile Money.");
    } catch {
      setStatus("Echec - endpoint payment-service pas encore implemente.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payer les frais de scolarite</Text>
      <TextInput
        style={styles.input}
        placeholder="ID de l'eleve"
        value={studentId}
        onChangeText={setStudentId}
      />
      <TextInput
        style={styles.input}
        placeholder="Montant (FCFA)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />
      <Button title="Payer via Mobile Money" onPress={handlePay} />
      {status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  status: { marginTop: 12 },
});
