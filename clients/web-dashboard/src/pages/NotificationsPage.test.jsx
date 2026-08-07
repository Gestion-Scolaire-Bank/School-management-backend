import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsPage from "./NotificationsPage";
import apiClient from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), patch: vi.fn() },
}));

const SAMPLE_NOTIFICATIONS = [
  {
    id: "n1",
    recipient_address: "parent@example.cm",
    channel: "EMAIL",
    type: "STUDENT_ENROLLED",
    status: "SENT",
    attempts: 1,
    error_message: null,
    created_at: "2026-08-05T08:00:00.000Z",
  },
  {
    id: "n2",
    recipient_address: "+237600000000",
    channel: "SMS",
    type: "PAYMENT_COMPLETED",
    status: "FAILED",
    attempts: 2,
    error_message: "Timeout provider",
    created_at: "2026-08-05T09:00:00.000Z",
  },
];

describe("NotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("affiche le journal avec statuts et bouton relancer sur les echecs", async () => {
    apiClient.get.mockResolvedValueOnce({ data: SAMPLE_NOTIFICATIONS });
    render(<NotificationsPage />);

    expect(await screen.findByText("parent@example.cm")).toBeInTheDocument();
    expect(screen.getByText("+237600000000")).toBeInTheDocument();
    expect(screen.getByText("Timeout provider")).toBeInTheDocument();

    const sentRow = screen.getByText("parent@example.cm").closest("tr");
    expect(within(sentRow).queryByRole("button", { name: /relancer/i })).not.toBeInTheDocument();

    const failedRow = screen.getByText("+237600000000").closest("tr");
    expect(within(failedRow).getByRole("button", { name: /relancer/i })).toBeInTheDocument();
  });

  it("liste vide : affiche un message", async () => {
    apiClient.get.mockResolvedValueOnce({ data: [] });
    render(<NotificationsPage />);

    expect(await screen.findByText(/aucune notification pour ces filtres/i)).toBeInTheDocument();
  });

  it("relance une notification en echec puis rafraichit la liste", async () => {
    apiClient.get
      .mockResolvedValueOnce({ data: SAMPLE_NOTIFICATIONS })
      .mockResolvedValueOnce({ data: [SAMPLE_NOTIFICATIONS[0], { ...SAMPLE_NOTIFICATIONS[1], status: "SENT" }] });
    apiClient.patch.mockResolvedValueOnce({ data: { ...SAMPLE_NOTIFICATIONS[1], status: "SENT" } });

    const user = userEvent.setup();
    render(<NotificationsPage />);

    await screen.findByText("+237600000000");
    const failedRow = screen.getByText("+237600000000").closest("tr");
    await user.click(within(failedRow).getByRole("button", { name: /relancer/i }));

    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith("/api/v1/notifications/n2/retry"));
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });

  it("echec de la relance : affiche le message d'erreur du serveur", async () => {
    apiClient.get.mockResolvedValue({ data: SAMPLE_NOTIFICATIONS });
    apiClient.patch.mockRejectedValueOnce({
      response: { data: { message: "Seule une notification en echec peut etre renvoyee" } },
    });

    const user = userEvent.setup();
    render(<NotificationsPage />);

    await screen.findByText("+237600000000");
    const failedRow = screen.getByText("+237600000000").closest("tr");
    await user.click(within(failedRow).getByRole("button", { name: /relancer/i }));

    expect(await screen.findByText("Seule une notification en echec peut etre renvoyee")).toBeInTheDocument();
  });
});
