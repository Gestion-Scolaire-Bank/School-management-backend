import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RegistrationPage from "./RegistrationPage";
import apiClient from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const CLASSES = [
  { id: "class-1", name: "6eme A", level: "6eme", academicYear: "2025-2026", establishmentId: "est-1" },
];
const ESTABLISHMENTS = [{ id: "est-1", name: "Ecole Centrale" }];

function mockReferenceData() {
  apiClient.get.mockImplementation((url) => {
    if (url.startsWith("/api/v1/admin/classes")) return Promise.resolve({ data: CLASSES });
    if (url.startsWith("/api/v1/admin/establishments")) return Promise.resolve({ data: ESTABLISHMENTS });
    return Promise.resolve({ data: [] });
  });
}

async function selectOption(user, triggerId, optionName) {
  const trigger = document.getElementById(triggerId);
  // native <select> (used for the school/class fields): wait for async options then fire change
  if (trigger && trigger.tagName === "SELECT") {
    await waitFor(() => {
      const opts = Array.from(trigger.querySelectorAll("option"));
      const found = opts.some((o) => (optionName instanceof RegExp ? optionName.test(o.textContent || "") : o.textContent === optionName));
      if (!found) throw new Error("option not yet loaded");
    });
    const option = Array.from(trigger.querySelectorAll("option")).find((o) =>
      optionName instanceof RegExp ? optionName.test(o.textContent || "") : o.textContent === optionName
    );
    fireEvent.change(trigger, { target: { value: option ? option.value : "" } });
    return;
  }
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("RegistrationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReferenceData();
  });

  it("inscrit un eleve avec un FormData contenant les champs texte", async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { id: "reg-1", status: "PENDING" },
    });
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await user.type(screen.getByLabelText("Prenom", { selector: "#firstName" }), "Jean");
    await user.type(screen.getByLabelText("Nom", { selector: "#lastName" }), "Dupont");
    await user.type(screen.getByLabelText("Date de naissance"), "2013-05-10");
    await selectOption(user, "classId", /6eme a/i);
    await user.type(screen.getByLabelText("Nom du tuteur/parent"), "Marie Dupont");
    await user.type(screen.getByLabelText("Email du parent"), "marie@example.cm");
    await user.type(screen.getByLabelText("Confirmer l'email du parent"), "marie@example.cm");

    await user.click(screen.getByRole("button", { name: /inscrire l'eleve/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, formData] = apiClient.post.mock.calls[0];
    expect(url).toBe("/api/v1/registrations/student");
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("firstName")).toBe("Jean");
    expect(formData.get("lastName")).toBe("Dupont");
    expect(formData.get("classId")).toBe("class-1");
    expect(formData.get("parentEmail")).toBe("marie@example.cm");
    // Champ de verification client uniquement, ne fait pas partie du contrat backend.
    expect(formData.has("parentEmailConfirm")).toBe(false);
    // Le deuxieme tuteur est optionnel et n'a pas ete rempli : ne doit pas etre envoye du tout.
    expect(formData.has("secondGuardianEmail")).toBe(false);

    expect(await screen.findByText("Eleve inscrit avec succes.")).toBeInTheDocument();
    expect(screen.getByText("reg-1")).toBeInTheDocument();
  });

  it("inscrit un eleve avec un deuxieme tuteur renseigne", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: "reg-1", status: "PENDING" } });
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await user.type(screen.getByLabelText("Prenom", { selector: "#firstName" }), "Jean");
    await user.type(screen.getByLabelText("Nom", { selector: "#lastName" }), "Dupont");
    await user.type(screen.getByLabelText("Date de naissance"), "2013-05-10");
    await selectOption(user, "classId", /6eme a/i);
    await user.type(screen.getByLabelText("Nom du tuteur/parent"), "Marie Dupont");
    await user.type(screen.getByLabelText("Email du parent"), "marie@example.cm");
    await user.type(screen.getByLabelText("Confirmer l'email du parent"), "marie@example.cm");
    await user.type(screen.getByLabelText("Deuxieme tuteur/parent (optionnel)"), "Paul Dupont");
    await user.type(screen.getByLabelText("Email du deuxieme tuteur"), "paul@example.cm");

    await user.click(screen.getByRole("button", { name: /inscrire l'eleve/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [, formData] = apiClient.post.mock.calls[0];
    expect(formData.get("secondGuardianName")).toBe("Paul Dupont");
    expect(formData.get("secondGuardianEmail")).toBe("paul@example.cm");
  });

  it("emails du parent differents : bloque l'envoi sans appeler l'API", async () => {
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await user.type(screen.getByLabelText("Prenom", { selector: "#firstName" }), "Jean");
    await user.type(screen.getByLabelText("Nom", { selector: "#lastName" }), "Dupont");
    await user.type(screen.getByLabelText("Date de naissance"), "2013-05-10");
    await selectOption(user, "classId", /6eme a/i);
    await user.type(screen.getByLabelText("Nom du tuteur/parent"), "Marie Dupont");
    await user.type(screen.getByLabelText("Email du parent"), "marie@example.cm");
    await user.type(screen.getByLabelText("Confirmer l'email du parent"), "marie-typo@example.cm");

    await user.click(screen.getByRole("button", { name: /inscrire l'eleve/i }));

    expect(await screen.findByText(/ne correspondent pas/i)).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("inscrit un membre du personnel avec le role choisi", async () => {
    apiClient.post.mockResolvedValueOnce({
      data: { id: "reg-2", status: "VALIDATED" },
    });
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await user.type(screen.getByLabelText("Prenom", { selector: "#staffFirstName" }), "Alice");
    await user.type(screen.getByLabelText("Nom", { selector: "#staffLastName" }), "Martin");
    await user.type(screen.getByLabelText("Email", { selector: "#staffEmail" }), "alice@example.cm");
    await selectOption(user, "staffEstablishmentId", /ecole centrale/i);

    await user.click(screen.getByRole("button", { name: /inscrire le membre du personnel/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, formData] = apiClient.post.mock.calls[0];
    expect(url).toBe("/api/v1/registrations/staff");
    expect(formData.get("firstName")).toBe("Alice");
    expect(formData.get("role")).toBe("ENSEIGNANT");
    expect(formData.get("establishmentId")).toBe("est-1");

    expect(await screen.findByText("Membre du personnel inscrit avec succes.")).toBeInTheDocument();
  });

  it("recherche un dossier eleve et affiche ses tuteurs", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.startsWith("/api/v1/admin/classes")) return Promise.resolve({ data: CLASSES });
      if (url.startsWith("/api/v1/admin/establishments")) return Promise.resolve({ data: ESTABLISHMENTS });
      if (url === "/api/v1/registrations/reg-1") {
        return Promise.resolve({
          data: {
            id: "reg-1",
            type: "STUDENT",
            firstName: "Jean",
            lastName: "Dupont",
            classId: "class-1",
            establishmentId: "est-1",
            status: "VALIDATED",
            guardians: [{ id: "g-1", fullName: "Marie Dupont", email: "marie@example.cm" }],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    render(<RegistrationPage />);

    await user.type(screen.getByLabelText("Identifiant du dossier"), "reg-1");
    await user.click(screen.getByRole("button", { name: /^rechercher$/i }));

    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/registrations/reg-1");
    expect(screen.getByText(/Marie Dupont \(marie@example\.cm\)/)).toBeInTheDocument();
  });

  it("reemet la carte scolaire d'un eleve trouve", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.startsWith("/api/v1/admin/classes")) return Promise.resolve({ data: CLASSES });
      if (url.startsWith("/api/v1/admin/establishments")) return Promise.resolve({ data: ESTABLISHMENTS });
      if (url === "/api/v1/registrations/reg-1") {
        return Promise.resolve({
          data: {
            id: "reg-1",
            type: "STUDENT",
            firstName: "Jean",
            lastName: "Dupont",
            classId: "class-1",
            establishmentId: "est-1",
            status: "VALIDATED",
            guardians: [],
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
    apiClient.post.mockResolvedValueOnce({ data: { card_number: "SCH-042", version: 2 } });

    const user = userEvent.setup();
    render(<RegistrationPage />);

    await user.type(screen.getByLabelText("Identifiant du dossier"), "reg-1");
    await user.click(screen.getByRole("button", { name: /^rechercher$/i }));
    await screen.findByText("Jean Dupont");

    await user.click(screen.getByRole("button", { name: /reemettre la carte scolaire/i }));

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/school-id/reg-1/reissue");
    expect(await screen.findByText(/SCH-042/)).toBeInTheDocument();
  });

  it("dossier introuvable : affiche un message d'erreur", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.startsWith("/api/v1/admin/classes")) return Promise.resolve({ data: CLASSES });
      if (url.startsWith("/api/v1/admin/establishments")) return Promise.resolve({ data: ESTABLISHMENTS });
      return Promise.reject({ response: { status: 404 } });
    });
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await user.type(screen.getByLabelText("Identifiant du dossier"), "inconnu");
    await user.click(screen.getByRole("button", { name: /^rechercher$/i }));

    expect(await screen.findByText(/aucun dossier trouve/i)).toBeInTheDocument();
  });

  it("affiche la liste des eleves d'une classe avec leurs tuteurs", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.startsWith("/api/v1/admin/classes")) return Promise.resolve({ data: CLASSES });
      if (url.startsWith("/api/v1/admin/establishments")) return Promise.resolve({ data: ESTABLISHMENTS });
      if (url === "/api/v1/registrations/class/class-1") {
        return Promise.resolve({
          data: [
            {
              id: "reg-1",
              firstName: "Jean",
              lastName: "Dupont",
              status: "VALIDATED",
              guardians: [{ id: "g-1", fullName: "Marie Dupont", email: "marie@example.cm" }],
            },
          ],
        });
      }
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await selectOption(user, "rosterClassId", /6eme a/i);
    await user.click(screen.getByRole("button", { name: /^afficher$/i }));

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/registrations/class/class-1");
    expect(await screen.findByText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });

  it("classe vide : affiche un message", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.startsWith("/api/v1/admin/classes")) return Promise.resolve({ data: CLASSES });
      if (url.startsWith("/api/v1/admin/establishments")) return Promise.resolve({ data: ESTABLISHMENTS });
      return Promise.resolve({ data: [] });
    });
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await selectOption(user, "rosterClassId", /6eme a/i);
    await user.click(screen.getByRole("button", { name: /^afficher$/i }));

    expect(await screen.findByText(/aucun eleve dans cette classe/i)).toBeInTheDocument();
  });

  it("erreur serveur : affiche le message renvoye par l'API", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url.startsWith("/api/v1/admin/classes")) return Promise.resolve({ data: CLASSES });
      if (url.startsWith("/api/v1/admin/establishments")) return Promise.resolve({ data: ESTABLISHMENTS });
      return Promise.reject({ response: { data: { message: "Classe introuvable" } } });
    });
    const user = userEvent.setup();
    render(<RegistrationPage />);

    await selectOption(user, "rosterClassId", /6eme a/i);
    await user.click(screen.getByRole("button", { name: /^afficher$/i }));

    expect(await screen.findByText("Classe introuvable")).toBeInTheDocument();
  });
});
