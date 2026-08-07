import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AnnouncementsPage from "./AnnouncementsPage";
import apiClient from "../api/client";
import { getUser } from "../api/auth";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../api/auth", () => ({
  getUser: vi.fn(),
}));

const CLASSES = [{ id: "class-1", name: "6eme A", level: "6eme", academicYear: "2025-2026" }];

describe("AnnouncementsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiClient.get.mockResolvedValue({ data: CLASSES });
  });

  async function selectClass(user, triggerId) {
    await user.click(document.getElementById(triggerId));
    await user.click(await screen.findByRole("option", { name: /6eme a/i }));
  }

  it("role Enseignant : affiche la section de consultation de groupe", async () => {
    getUser.mockReturnValue({ role: "ENSEIGNANT" });
    render(<AnnouncementsPage />);

    expect(screen.getByText("Groupe WhatsApp d'une classe")).toBeInTheDocument();
  });

  it("role Administrateur : masque la section de consultation de groupe", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    render(<AnnouncementsPage />);

    expect(screen.queryByText("Groupe WhatsApp d'une classe")).not.toBeInTheDocument();
    expect(screen.getByText("Nouvelle annonce")).toBeInTheDocument();
  });

  it("recherche un groupe et affiche ses membres", async () => {
    getUser.mockReturnValue({ role: "ENSEIGNANT" });
    apiClient.get.mockImplementation((url) =>
      url.startsWith("/api/v1/admin/classes")
        ? Promise.resolve({ data: CLASSES })
        : Promise.resolve({
            data: {
              classId: "class-1",
              name: "Classe 6emeA",
              members: [{ studentId: "STU-1", parentEmails: ["parent@example.cm", "parent2@example.cm"] }],
            },
          })
    );
    const user = userEvent.setup();
    render(<AnnouncementsPage />);

    await selectClass(user, "groupClassId");
    await user.click(screen.getByRole("button", { name: /^rechercher$/i }));

    expect(await screen.findByText("Classe 6emeA")).toBeInTheDocument();
    expect(screen.getByText("1 membre(s)")).toBeInTheDocument();
    expect(screen.getByText("STU-1", { exact: false })).toBeInTheDocument();
    expect(screen.getByText(/parent@example\.cm, parent2@example\.cm/)).toBeInTheDocument();
  });

  it("groupe introuvable : affiche un message d'erreur", async () => {
    getUser.mockReturnValue({ role: "ENSEIGNANT" });
    apiClient.get.mockImplementation((url) =>
      url.startsWith("/api/v1/admin/classes")
        ? Promise.resolve({ data: CLASSES })
        : Promise.reject({ response: { status: 404 } })
    );
    const user = userEvent.setup();
    render(<AnnouncementsPage />);

    await selectClass(user, "groupClassId");
    await user.click(screen.getByRole("button", { name: /^rechercher$/i }));

    expect(await screen.findByText(/aucun groupe whatsapp pour la classe 6eme a/i)).toBeInTheDocument();
  });

  it("diffuse une annonce", async () => {
    getUser.mockReturnValue({ role: "ENSEIGNANT" });
    apiClient.post.mockResolvedValueOnce({ data: { id: "b1" } });
    const user = userEvent.setup();
    render(<AnnouncementsPage />);

    await selectClass(user, "classId");
    await user.type(screen.getByLabelText("Message"), "Reunion parents-profs vendredi.");
    await user.click(screen.getByRole("button", { name: /^diffuser$/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/whatsapp/broadcast", {
        classId: "class-1",
        message: "Reunion parents-profs vendredi.",
      })
    );
    expect(await screen.findByText("Annonce envoyee.")).toBeInTheDocument();
  });
});
