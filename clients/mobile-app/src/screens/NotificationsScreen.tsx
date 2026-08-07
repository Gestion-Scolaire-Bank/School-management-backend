import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import apiClient from "../api/client";
import { getCurrentUser } from "../api/auth";

// UC21 - Recevoir une notification (notification-service, section 3.6). GET
// /api/v1/notifications/user/{id} attend l'ID de l'UTILISATEUR CONNECTE (pas de resolution
// "me" cote backend, cf. notification-service/src/routes/index.js) - on decode le JWT pour
// le recuperer. La reponse est un tableau brut de lignes SQL (champ "body", pas "message" /
// pas d'enveloppe {notifications:[...]}) - cf. notificationRepository.listByUser.
export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<{ id: string; body: string }[]>([]);

  useEffect(() => {
    const userId = getCurrentUser()?.id;
    if (!userId) return;
    apiClient
      .get(`/api/v1/notifications/user/${encodeURIComponent(userId)}`)
      .then((res) => setNotifications(res.data || []))
      .catch(() => setNotifications([]));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {notifications.length === 0 ? (
        <Text>Aucune notification pour le moment.</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Text style={styles.item}>{item.body}</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  item: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
});
