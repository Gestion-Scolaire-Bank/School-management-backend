import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChildPage from "./ChildPage";
import apiClient from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn() },
}));

// jsdom n'implemente pas URL.createObjectURL/revokeObjectURL (leve "Not implemented").
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

const CHILDREN = [{ id: "STU-1", firstName: "Jean", lastName: "Dupont", classId: "class-1" }];
const CLASSES = [{ id: "class-1", name: "6emeA" }];

function mockReferenceData(extra) {
  apiClient.get.mockImplementation((url, config) => {
    if (url === "/api/v1/registrations/children") return Promise.resolve({ data: CHILDREN });
    if (url === "/api/v1/admin/classes") return Promise.resolve({ data: CLASSES });
    if (extra) {
      const result = extra(url, config);
      if (result) return result;
    }
    return Promise.reject(new Error("unexpected url " + url));
  });
}

async function selectChild(user) {
  await user.click(await screen.findByText("Jean Dupont"));
}

describe("ChildPage", () => {
  it("recherche : charge la carte et la presence de l'eleve", async () => {
    mockReferenceData((url) => {
      if (url.includes("/school-id/")) return Promise.resolve({ data: new Blob(["png"]) });
      if (url.includes("/presence/student/"))
        return Promise.resolve({
          data: [
            {
              id: "p1",
              class_id: "6emeA",
              check_in_at: "2026-08-05T08:00:00.000Z",
              check_out_at: null,
              status: "PRESENT",
            },
          ],
        });
    });

    const user = userEvent.setup();
    render(<ChildPage />);
    await selectChild(user);

    expect(await screen.findByAltText("Carte scolaire de Jean Dupont")).toBeInTheDocument();
    // "6emeA" apparait deux fois : la carte enfant (classe de l'eleve) et la ligne de presence.
    expect(await screen.findAllByText("6emeA")).toHaveLength(2);
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/school-id/STU-1",
      expect.objectContaining({ responseType: "blob" })
    );
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/presence/student/STU-1");
  });

  it("carte introuvable : affiche un message d'erreur", async () => {
    mockReferenceData((url) => {
      if (url.includes("/school-id/")) return Promise.reject({ response: { status: 404 } });
      if (url.includes("/presence/student/")) return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    render(<ChildPage />);
    await selectChild(user);

    expect(await screen.findByText(/aucune carte scolaire trouvee/i)).toBeInTheDocument();
  });

  it("charge le bulletin apres la recherche initiale", async () => {
    mockReferenceData((url) => {
      if (url.includes("/school-id/")) return Promise.resolve({ data: new Blob(["png"]) });
      if (url.includes("/presence/student/")) return Promise.resolve({ data: [] });
      if (url.includes("/reports/student/")) return Promise.resolve({ data: new Blob(["pdf"]) });
    });

    const user = userEvent.setup();
    render(<ChildPage />);
    await selectChild(user);

    await waitFor(() => expect(screen.getByRole("button", { name: /voir le bulletin/i })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /voir le bulletin/i }));

    expect(await screen.findByRole("link", { name: /ouvrir le bulletin pdf/i })).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/reports/student/STU-1",
      expect.objectContaining({ responseType: "blob" })
    );
  });

  it("presence vide : affiche un message plutot qu'un tableau", async () => {
    mockReferenceData((url) => {
      if (url.includes("/school-id/")) return Promise.resolve({ data: new Blob(["png"]) });
      if (url.includes("/presence/student/")) return Promise.resolve({ data: [] });
    });

    const user = userEvent.setup();
    render(<ChildPage />);
    await selectChild(user);

    expect(await screen.findByText(/aucun enregistrement de presence/i)).toBeInTheDocument();
  });

  it("aucun enfant : affiche un message d'orientation", async () => {
    apiClient.get.mockImplementation((url) => {
      if (url === "/api/v1/registrations/children") return Promise.resolve({ data: [] });
      if (url === "/api/v1/admin/classes") return Promise.resolve({ data: [] });
      return Promise.reject(new Error("unexpected url " + url));
    });

    render(<ChildPage />);

    expect(await screen.findByText(/aucun enfant n'est associe/i)).toBeInTheDocument();
  });
});
