import { Platform } from "react-native";
import { setAuthToken } from "./client";

type CurrentUser = { id: string; email: string; role: string };

const TOKEN_KEY = "sm_access_token";

async function storeToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    const SecureStore = require("expo-secure-store");
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

async function removeToken() {
  if (Platform.OS === "web") {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    const SecureStore = require("expo-secure-store");
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function readToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(TOKEN_KEY);
  }
  const SecureStore = require("expo-secure-store");
  return SecureStore.getItemAsync(TOKEN_KEY);
}

let currentUser: CurrentUser | null = null;

// Decodage base64url autonome (pas de dependance sur atob, non garanti disponible
// sur toutes les versions de Hermes) du payload du JWT emis par auth-service.
// Memes claims que clients/web-dashboard/src/api/auth.js : sub/email/role.
// Aucune verification de signature ici : deja faite par le Gateway/auth-service.
function base64UrlDecode(input: string): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const cleaned = input.replace(/-/g, "+").replace(/_/g, "/");
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (const char of cleaned) {
    const value = chars.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

function decodeToken(token: string): CurrentUser | null {
  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(decodeURIComponent(escape(base64UrlDecode(payload))));
    return { id: claims.sub, email: claims.email, role: claims.role };
  } catch {
    return null;
  }
}

export async function login(accessToken: string) {
  setAuthToken(accessToken);
  currentUser = decodeToken(accessToken);
  await storeToken(accessToken);
}

export async function logout() {
  setAuthToken(null);
  currentUser = null;
  await removeToken();
}

export function getCurrentUser(): CurrentUser | null {
  return currentUser;
}

// Appele une seule fois au demarrage de l'app (App.tsx) pour retablir la session a partir
// du token persiste. Retourne l'utilisateur si un token valide est trouve, sinon null (et
// nettoie le stockage si le token est corrompu/illisible).
export async function restoreSession(): Promise<CurrentUser | null> {
  const token = await readToken();
  if (!token) return null;

  const user = decodeToken(token);
  if (!user) {
    await removeToken();
    return null;
  }

  setAuthToken(token);
  currentUser = user;
  return user;
}
