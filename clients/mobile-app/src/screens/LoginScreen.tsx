import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import apiClient from "../api/client";
import { login } from "../api/auth";

// UC2 - Se connecter (document de conception, section 3.1)
export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    try {
      const { data } = await apiClient.post("/api/auth/login", { email, password });
      await login(data.accessToken);
      navigation.replace("Home");
    } catch (e) {
      setError("Authentification impossible - verifiez vos identifiants.");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SchoolManage</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button title="Se connecter" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, marginBottom: 12 },
  error: { color: "crimson", marginBottom: 12 },
});
