import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatusPage from "./StatusPage";
import apiClient from "../api/client";
import { getUser, getToken } from "../api/auth";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn(), defaults: { baseURL: "http://localhost:8888" } },
}));

vi.mock("../api/auth", () => ({
  getUser: vi.fn(),
  getToken: vi.fn(),
}));

class FakeWebSocket {
  constructor(url) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  close() {}
}
FakeWebSocket.instances = [];

describe("StatusPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    FakeWebSocket.instances = [];
    getToken.mockReturnValue("le-jwt");
    vi.stubGlobal("WebSocket", FakeWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("role Enseignant : publie un statut, pas de section admin", async () => {
    getUser.mockReturnValue({ role: "ENSEIGNANT" });
    apiClient.post.mockResolvedValueOnce({ data: {} });
    const user = userEvent.setup();
    render(<StatusPage />);

    await user.type(screen.getByLabelText("Message (optionnel)"), "De retour demain");
    await user.click(screen.getByRole("button", { name: /publier mon statut/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/status", {
        statusType: "DISPONIBLE",
        message: "De retour demain",
      })
    );
    expect(await screen.findByText("Statut publie.")).toBeInTheDocument();
    expect(screen.queryByText("Historique d'un compte")).not.toBeInTheDocument();
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("role Administrateur : ouvre le flux temps reel avec le jeton en parametre", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    apiClient.get.mockResolvedValueOnce({ data: [] });
    render(<StatusPage />);

    expect(await screen.findByText("Historique d'un compte")).toBeInTheDocument();
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0].url).toBe("ws://localhost:8888/api/v1/status/live?token=le-jwt");
  });

  it("role Administrateur : charge l'historique du compte selectionne", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    apiClient.get.mockImplementation((url) => {
      if (url === "/api/auth/users") {
        return Promise.resolve({ data: [{ id: "u1", fullName: "Jean Dupont", email: "j@b.cm" }] });
      }
      if (url === "/api/v1/status/history/u1") {
        return Promise.resolve({
          data: [{ statusType: "MALADE", message: "Grippe", updatedAt: "2026-01-10T08:00:00Z" }],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    render(<StatusPage />);

    await user.click(document.getElementById("historyUser"));
    await user.click(await screen.findByRole("option", { name: /Jean Dupont/i }));

    expect(await screen.findByText("Grippe")).toBeInTheDocument();
    expect(screen.getByText("Malade")).toBeInTheDocument();
  });
});
