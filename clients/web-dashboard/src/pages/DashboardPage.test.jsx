import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./DashboardPage";
import apiClient from "../api/client";
import { getUser } from "../api/auth";

vi.mock("../api/client", () => ({
  default: { get: vi.fn() },
}));

vi.mock("../api/auth", () => ({
  getUser: vi.fn(),
}));

// jsdom n'implemente pas URL.createObjectURL/revokeObjectURL (leve "Not implemented").
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

const DASHBOARD = { total_revenue: 100000, payment_count: 3, presence_count: 10, average_grade: 14.5, reportcard_batches: 1 };
const GLOBAL = { establishment_count: 2, total_revenue: 500000, payment_count: 12, reportcard_batches: 4 };

describe("DashboardPage", () => {
  it("role Directeur : affiche les indicateurs mais pas la vue globale/export", async () => {
    getUser.mockReturnValue({ role: "DIRECTEUR" });
    apiClient.get.mockResolvedValueOnce({ data: DASHBOARD });
    render(<DashboardPage />);

    expect(await screen.findByText("100 000 XAF")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Vue globale (tous etablissements)")).not.toBeInTheDocument();
  });

  it("role Administrateur : affiche la vue globale et exporte en CSV", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    apiClient.get.mockImplementation((url) => {
      if (url === "/api/v1/analytics/dashboard") return Promise.resolve({ data: DASHBOARD });
      if (url === "/api/v1/analytics/global") return Promise.resolve({ data: GLOBAL });
      if (url === "/api/v1/analytics/export") return Promise.resolve({ data: new Blob(["csv"]) });
      return Promise.resolve({ data: {} });
    });
    const user = userEvent.setup();
    render(<DashboardPage />);

    expect(await screen.findByText("Etablissements actifs")).toBeInTheDocument();
    expect(screen.getByText("500 000 XAF")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /exporter en csv/i }));

    await waitFor(() =>
      expect(apiClient.get).toHaveBeenCalledWith("/api/v1/analytics/export", {
        params: { format: "csv" },
        responseType: "blob",
      })
    );
  });
});
