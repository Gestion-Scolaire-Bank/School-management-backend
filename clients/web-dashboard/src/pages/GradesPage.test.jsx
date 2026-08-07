import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GradesPage from "./GradesPage";
import apiClient from "../api/client";
import { getUser } from "../api/auth";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../api/auth", () => ({
  getUser: vi.fn(),
}));

const CLASSES = [
  { id: "class-1", name: "6eme A", level: "6eme", academicYear: "2025-2026" },
];
const SUBJECTS = [{ subjectId: "subj-1", subjectName: "Maths" }];
const STUDENTS = [{ id: "stu-1", firstName: "Jean", lastName: "Dupont" }];

function mockReferenceData() {
  apiClient.get.mockImplementation((url) => {
    if (url.startsWith("/api/v1/admin/classes/") && url.endsWith("/subjects")) {
      return Promise.resolve({ data: SUBJECTS });
    }
    if (url === "/api/v1/admin/classes") return Promise.resolve({ data: CLASSES });
    if (url.startsWith("/api/v1/registrations/class/")) return Promise.resolve({ data: STUDENTS });
    return Promise.resolve({ data: [] });
  });
}

async function selectOption(user, triggerId, optionName) {
  await user.click(document.getElementById(triggerId));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("GradesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockReturnValue({ role: "ENSEIGNANT" });
    mockReferenceData();
  });

  it("role Enseignant : affiche le formulaire de saisie de note", () => {
    render(<GradesPage />);
    expect(screen.getByText("Saisir une note")).toBeInTheDocument();
  });

  it("role Administrateur : masque le formulaire de saisie de note et affiche la generation", () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    render(<GradesPage />);
    expect(screen.queryByText("Saisir une note")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^generer les bulletins$/i })).toBeInTheDocument();
    expect(screen.getByText("Synthese de classe")).toBeInTheDocument();
  });

  it("role Enseignant : masque la generation des bulletins", () => {
    render(<GradesPage />);
    expect(screen.queryByRole("button", { name: /^generer les bulletins$/i })).not.toBeInTheDocument();
  });

  it("saisit une note et l'envoie avec les nombres convertis", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: "g1" } });
    const user = userEvent.setup();
    render(<GradesPage />);

    await selectOption(user, "class_id", /6eme a/i);
    await selectOption(user, "student_id", /jean dupont/i);
    await user.type(screen.getByLabelText("Periode", { selector: "#period" }), "Trimestre1");
    await selectOption(user, "subject_id", /maths/i);
    await user.type(screen.getByLabelText("Note"), "15");
    await user.click(screen.getByRole("button", { name: /enregistrer la note/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/reports/grades", {
        student_id: "stu-1",
        class_id: "class-1",
        period: "Trimestre1",
        subject_id: "subj-1",
        score: 15,
        max_score: 20,
        weight: 1,
      })
    );
    expect(await screen.findByText("Note enregistree.")).toBeInTheDocument();
  });

  it("affiche la synthese de classe apres recherche", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === "/api/v1/admin/classes") return Promise.resolve({ data: CLASSES });
      if (url.startsWith("/api/v1/reports/class/")) {
        return Promise.resolve({
          data: {
            class_id: "class-1",
            period: "Trimestre1",
            student_count: 1,
            class_average: 14.75,
            students: [{ student_id: "stu-1", student_name: "Jean Dupont", average: 14.75, rank: 1 }],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    render(<GradesPage />);

    await selectOption(user, "summaryClassId", /6eme a/i);
    await user.type(screen.getByLabelText("Periode", { selector: "#summaryPeriod" }), "Trimestre1");
    await user.click(screen.getByRole("button", { name: /voir la synthese/i }));

    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    // "14.75/20" apparait deux fois (moyenne de classe + moyenne de l'eleve, seul dans la classe).
    expect(screen.getAllByText("14.75/20")).toHaveLength(2);
  });

  it("role Administrateur : genere les bulletins d'une classe/periode", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    apiClient.post.mockResolvedValueOnce({ data: [{ id: "rc1" }, { id: "rc2" }] });
    const user = userEvent.setup();
    render(<GradesPage />);

    await selectOption(user, "generateClassId", /6eme a/i);
    await user.type(screen.getByLabelText("Periode", { selector: "#generatePeriod" }), "Trimestre1");
    await user.click(screen.getByRole("button", { name: /^generer les bulletins$/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/reports/generate", {
        class_id: "class-1",
        period: "Trimestre1",
      })
    );
    expect(await screen.findByText("2 bulletin(s) genere(s).")).toBeInTheDocument();
  });

  it("role Administrateur : echec de generation affiche le detail renvoye par le backend", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    apiClient.post.mockRejectedValueOnce({
      response: { data: { detail: "Aucune note trouvee pour la classe 6emeA / periode Trimestre1" } },
    });
    const user = userEvent.setup();
    render(<GradesPage />);

    await selectOption(user, "generateClassId", /6eme a/i);
    await user.type(screen.getByLabelText("Periode", { selector: "#generatePeriod" }), "Trimestre1");
    await user.click(screen.getByRole("button", { name: /^generer les bulletins$/i }));

    expect(await screen.findByText(/aucune note trouvee pour la classe 6emea/i)).toBeInTheDocument();
  });
});
