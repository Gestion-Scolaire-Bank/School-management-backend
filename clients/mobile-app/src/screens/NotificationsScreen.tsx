import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import apiClient from "../api/client";

// UC21 - Recevoir une notification (notification-service, section 3.6)
export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);

  useEffect(() => {
    apiClient
      .get("/api/v1/notifications/user/me")
      .then((res) => setNotifications(res.data?.notifications || []))
      .catch(() => setNotifications([]));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notifications</Text>
      {notifications.length === 0 ? (
        <Text>Aucune notification - endpoint notification-service pas encore implemente.</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <Text style={styles.item}>{item.message}</Text>}
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
