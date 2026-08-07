import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import PresenceScanScreen from "./src/screens/PresenceScanScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import ReportCardScreen from "./src/screens/ReportCardScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";
import { restoreSession } from "./src/api/auth";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState<"Login" | "Home">("Login");

  useEffect(() => {
    restoreSession()
      .then((user) => setInitialRouteName(user ? "Home" : "Login"))
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName={initialRouteName}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: "Connexion" }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "SchoolManage" }} />
        <Stack.Screen
          name="PresenceScan"
          component={PresenceScanScreen}
          options={{ title: "Scanner ma presence" }}
        />
        <Stack.Screen name="Payment" component={PaymentScreen} options={{ title: "Paiement" }} />
        <Stack.Screen
          name="ReportCard"
          component={ReportCardScreen}
          options={{ title: "Bulletin" }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: "Notifications" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
