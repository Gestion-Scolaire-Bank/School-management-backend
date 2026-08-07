import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResourcesPage from "./ResourcesPage";
import apiClient from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const CLASSES = [
  { id: "class-1", name: "6eme A", level: "6eme", academicYear: "2025-2026" },
];
const SUBJECTS = [{ subjectId: "subj-1", subjectName: "Maths" }];

function mockReferenceData({ resources = [], courses = [] } = {}) {
  apiClient.get.mockImplementation((url) => {
    if (url === "/api/v1/pedagogic/resources") return Promise.resolve({ data: resources });
    if (url === "/api/v1/pedagogic/courses") return Promise.resolve({ data: courses });
    if (url === "/api/v1/admin/classes") return Promise.resolve({ data: CLASSES });
    if (url.startsWith("/api/v1/admin/classes/") && url.endsWith("/subjects")) {
      return Promise.resolve({ data: SUBJECTS });
    }
    return Promise.resolve({ data: [] });
  });
}

async function selectOption(user, triggerId, optionName) {
  await user.click(document.getElementById(triggerId));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("ResourcesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReferenceData();
  });

  it("affiche la liste des ressources chargees", async () => {
    mockReferenceData({
      resources: [
        {
          id: "r1",
          title: "Plan de cours Maths",
          resource_type: "DOCUMENT",
          subject_name: "Maths",
          class_id: "class-1",
          file_name: "plan.pdf",
          file_url: "http://minio:9000/bucket/plan.pdf",
        },
      ],
    });

    render(<ResourcesPage />);

    expect(await screen.findByText("Plan de cours Maths")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "plan.pdf" })).toHaveAttribute(
      "href",
      "http://minio:9000/bucket/plan.pdf"
    );
  });

  it("liste vide : affiche un message", async () => {
    render(<ResourcesPage />);
    expect(await screen.findByText(/aucune ressource disponible/i)).toBeInTheDocument();
    expect(await screen.findByText(/aucun cours cree pour le moment/i)).toBeInTheDocument();
  });

  it("uploade une ressource avec un FormData et rafraichit la liste", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: "r2" } });
    const user = userEvent.setup();
    render(<ResourcesPage />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/api/v1/pedagogic/resources"));

    const file = new File(["contenu"], "cours.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Fichier"), file);
    await user.type(screen.getByLabelText("Titre", { selector: "#title" }), "Cours de test");

    await user.click(screen.getByRole("button", { name: /^uploader$/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, formData] = apiClient.post.mock.calls[0];
    expect(url).toBe("/api/v1/pedagogic/resources");
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("title")).toBe("Cours de test");
    expect(formData.get("file")).toBe(file);

    expect(await screen.findByText("Ressource uploadee.")).toBeInTheDocument();
  });

  it("cree un cours", async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: "c1" } });
    const user = userEvent.setup();
    render(<ResourcesPage />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith("/api/v1/admin/classes"));

    await user.type(screen.getByLabelText("Titre", { selector: "#courseTitle" }), "Chapitre 1");
    await selectOption(user, "courseClassId", /6eme a/i);
    await selectOption(user, "courseSubjectId", /maths/i);
    await user.type(screen.getByLabelText("Contenu"), "Introduction aux fractions");
    await user.click(screen.getByRole("button", { name: /creer le cours/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/pedagogic/courses", {
        title: "Chapitre 1",
        class_id: "class-1",
        subject_id: "subj-1",
        content: "Introduction aux fractions",
      })
    );
    expect(await screen.findByText("Cours cree.")).toBeInTheDocument();
  });
});
