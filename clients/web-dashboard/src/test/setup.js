import "@testing-library/jest-dom/vitest";

// jsdom n'implemente pas window.matchMedia (utilise par src/lib/theme.js pour detecter la
// preference systeme clair/sombre).
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
}
