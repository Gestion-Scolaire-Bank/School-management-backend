import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UsersPage from "./UsersPage";
import apiClient from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

const SAMPLE_USERS = [
  { id: "u1", email: "a@b.cm", fullName: "Jean Dupont", role: "PARENT", status: "ACTIVE" },
  { id: "u2", email: "c@d.cm", fullName: "Marie Curie", role: "ENSEIGNANT", status: "SUSPENDED" },
];

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("affiche la liste des comptes avec leur statut", async () => {
    apiClient.get.mockResolvedValueOnce({ data: SAMPLE_USERS });
    render(<UsersPage />);

    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Marie Curie")).toBeInTheDocument();
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Suspendu")).toBeInTheDocument();
  });

  it("liste vide : affiche un message", async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });
    render(<UsersPage />);

    expect(await screen.findByText(/aucun compte enregistre/i)).toBeInTheDocument();
  });

  it("suspend un compte actif puis rafraichit la liste", async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: SAMPLE_USERS })
      .mockResolvedValueOnce({
        data: [{ ...SAMPLE_USERS[0], status: "SUSPENDED" }, SAMPLE_USERS[1]],
      });
    apiClient.patch.mockResolvedValueOnce({ data: { ...SAMPLE_USERS[0], status: "SUSPENDED" } });

    const user = userEvent.setup();
    render(<UsersPage />);

    await screen.findByText("Jean Dupont");
    const row = screen.getByText("Jean Dupont").closest("tr");
    await user.click(within(row).getByRole("button", { name: /suspendre/i }));

    await waitFor(() =>
      expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/admin/users/u1/status", { status: "SUSPENDED" })
    );
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("suspendre demande confirmation - annuler n'appelle pas l'API", async () => {
    apiClient.get.mockResolvedValueOnce({ data: SAMPLE_USERS });
    window.confirm.mockReturnValue(false);

    const user = userEvent.setup();
    render(<UsersPage />);

    await screen.findByText("Jean Dupont");
    const row = screen.getByText("Jean Dupont").closest("tr");
    await user.click(within(row).getByRole("button", { name: /suspendre/i }));

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Jean Dupont"));
    expect(apiClient.patch).not.toHaveBeenCalled();
  });

  it("echec de la mise a jour : affiche un message d'erreur", async () => {
    apiClient.get.mockResolvedValue({ data: SAMPLE_USERS });
    apiClient.patch.mockRejectedValueOnce(new Error("boom"));

    const user = userEvent.setup();
    render(<UsersPage />);

    await screen.findByText("Jean Dupont");
    const row = screen.getByText("Jean Dupont").closest("tr");
    await user.click(within(row).getByRole("button", { name: /suspendre/i }));

    expect(await screen.findByText(/impossible de mettre a jour/i)).toBeInTheDocument();
  });
});
