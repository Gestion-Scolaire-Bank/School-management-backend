// Bascule clair/sombre - les tokens .dark existent deja dans index.css (Tailwind, variante
// "dark" activee par la classe .dark sur <html>) mais rien ne permettait jusqu'ici de
// l'activer : ni preference systeme respectee, ni bouton pour la forcer manuellement.
const STORAGE_KEY = "sm_theme";

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY);
}

export function getPreferredTheme() {
  return getStoredTheme() || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
}

export function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

// A appeler une fois, au demarrage de l'appli, avant le premier rendu - evite un flash du
// mauvais theme le temps que React monte.
export function initTheme() {
  applyTheme(getPreferredTheme());
}
