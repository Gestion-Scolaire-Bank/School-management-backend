import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EstablishmentsPage from "./EstablishmentsPage";
import apiClient from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

describe("EstablishmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche la liste des etablissements charges", async () => {
    apiClient.get.mockResolvedValueOnce({
      data: [{ id: "1", name: "Lycee de Yaounde", city: "Yaounde", status: "ACTIVE" }],
    });

    render(<EstablishmentsPage />);

    expect(await screen.findByText("Lycee de Yaounde")).toBeInTheDocument();
    expect(screen.getByText("Yaounde")).toBeInTheDocument();
  });

  it("liste vide : affiche un message plutot qu'un tableau", async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });

    render(<EstablishmentsPage />);

    expect(await screen.findByText(/aucun etablissement enregistre/i)).toBeInTheDocument();
  });

  it("cree un etablissement puis rafraichit la liste", async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({
        data: [{ id: "1", name: "Lycee Test", city: "Douala", status: "ACTIVE" }],
      });
    apiClient.post.mockResolvedValueOnce({ data: { id: "1", name: "Lycee Test" } });

    const user = userEvent.setup();
    render(<EstablishmentsPage />);

    await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(1));

    await user.type(screen.getByLabelText("Nom"), "Lycee Test");
    await user.type(screen.getByLabelText("Ville"), "Douala");
    await user.click(screen.getByRole("button", { name: /creer l'etablissement/i }));

    await waitFor(() =>
      expect(apiClient.post).toHaveBeenCalledWith("/api/v1/admin/establishments", {
        name: "Lycee Test",
        address: "",
        city: "Douala",
        phone: "",
        email: "",
      })
    );
    expect(await screen.findByText("Lycee Test")).toBeInTheDocument();
  });
});
