import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";

import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import PresenceScanScreen from "./src/screens/PresenceScanScreen";
import PaymentScreen from "./src/screens/PaymentScreen";
import ReportCardScreen from "./src/screens/ReportCardScreen";
import NotificationsScreen from "./src/screens/NotificationsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator initialRouteName="Login">
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
