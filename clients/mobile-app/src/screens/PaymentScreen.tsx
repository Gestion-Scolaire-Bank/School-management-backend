import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import apiClient from "../api/client";

const PROVIDERS = ["MTN", "ORANGE"] as const;

function randomIdempotencyKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// UC9 - Payer les frais de scolarite (Mobile Money) (payment-service, section 3.3).
// Champs requis par InitiateFeesPaymentRequest (payment-service) : studentId, amount
// (numerique), provider (MTN|ORANGE), payerPhone - memes champs que FeePaymentPage.jsx
// cote web-dashboard.
export default function PaymentScreen() {
  const [amount, setAmount] = useState("");
  const [studentId, setStudentId] = useState("");
  const [provider, setProvider] = useState<(typeof PROVIDERS)[number]>("MTN");
  const [payerPhone, setPayerPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handlePay() {
    setStatus(null);
    setSubmitting(true);
    try {
      await apiClient.post(
        "/api/v1/payments/fees",
        { studentId, amount: Number(amount), currency: "XAF", provider, payerPhone },
        { headers: { "Idempotency-Key": randomIdempotencyKey() } }
      );
      setStatus("Paiement initie - en attente de confirmation Mobile Money.");
    } catch (e: any) {
      setStatus(e.response?.data?.message || "Echec de l'initiation du paiement.");
    } finally {
      setSubmitting(false);
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
      <TextInput
        style={styles.input}
        placeholder="Numero payeur (+237...)"
        keyboardType="phone-pad"
        value={payerPhone}
        onChangeText={setPayerPhone}
      />
      <View style={styles.providerRow}>
        {PROVIDERS.map((p) => (
          <Button
            key={p}
            title={p === "MTN" ? "MTN Mobile Money" : "Orange Money"}
            color={provider === p ? "#1d4ed8" : "#9ca3af"}
            onPress={() => setProvider(p)}
          />
        ))}
      </View>
      <Button title="Payer via Mobile Money" onPress={handlePay} disabled={submitting} />
      {status && <Text style={styles.status}>{status}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 24 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  providerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12, gap: 8 },
  status: { marginTop: 12 },
});
