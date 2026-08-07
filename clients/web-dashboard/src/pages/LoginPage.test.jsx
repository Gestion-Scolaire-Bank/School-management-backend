import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./LoginPage";
import apiClient from "../api/client";
import { getToken } from "../api/auth";

vi.mock("../api/client", () => ({
  default: { post: vi.fn() },
}));

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Tableau de bord</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("connexion reussie : stocke le token et navigue vers /", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { accessToken: "fake-token" } });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "a@b.cm");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    await waitFor(() => expect(screen.getByText("Tableau de bord")).toBeInTheDocument());
    expect(apiClient.post).toHaveBeenCalledWith("/api/auth/login", {
      email: "a@b.cm",
      password: "password123",
    });
    expect(getToken()).toBe("fake-token");
  });

  it("identifiants invalides : affiche une erreur, ne navigue pas", async () => {
    apiClient.post.mockRejectedValueOnce({ response: { status: 401 } });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "a@b.cm");
    await user.type(screen.getByLabelText("Mot de passe"), "mauvais-mdp");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(await screen.findByText(/email ou mot de passe incorrect/i)).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it("trop de tentatives (429) : affiche le message du serveur", async () => {
    apiClient.post.mockRejectedValueOnce({
      response: { status: 429, data: { message: "Trop de tentatives, reessayez plus tard." } },
    });
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText("Email"), "a@b.cm");
    await user.type(screen.getByLabelText("Mot de passe"), "password123");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));

    expect(await screen.findByText("Trop de tentatives, reessayez plus tard.")).toBeInTheDocument();
  });
});
