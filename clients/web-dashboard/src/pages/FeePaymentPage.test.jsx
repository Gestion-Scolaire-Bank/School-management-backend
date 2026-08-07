import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FeePaymentPage from "./FeePaymentPage";
import apiClient from "../api/client";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  window.open = vi.fn();
});

const CHILDREN = [
  { id: "STU-1", firstName: "Jean", lastName: "Dupont", establishmentId: "est-1" },
];
const TARIFFS = [{ id: "fee-1", label: "Trimestre 1", amount: 50000, currency: "XAF" }];

function mockReferenceData({ history = [] } = {}) {
  apiClient.get.mockImplementation((url) => {
    if (url === "/api/v1/registrations/children") return Promise.resolve({ data: CHILDREN });
    if (url === "/api/v1/admin/fee-schedules") return Promise.resolve({ data: TARIFFS });
    if (url === "/api/v1/payments/student/STU-1") return Promise.resolve({ data: history });
    return Promise.resolve({ data: [] });
  });
}

async function selectOption(user, triggerId, optionName) {
  // Le trigger "Enfant" n'apparait qu'apres resolution de GET /children (async) - attendre
  // explicitement son montage evite un click trop precoce sur un element pas encore reactif.
  const trigger = await waitFor(() => {
    const el = document.getElementById(triggerId);
    expect(el).toBeInTheDocument();
    return el;
  });
  await user.click(trigger);
  await user.click(await screen.findByRole("option", { name: optionName }));
}

async function selectChildAndTariff(user) {
  await selectOption(user, "child", /jean dupont/i);
  await selectOption(user, "feeSchedule", /trimestre 1/i);
}

describe("FeePaymentPage", () => {
  it("initie un paiement avec une cle d'idempotence et affiche le statut", async () => {
    mockReferenceData();
    apiClient.post.mockResolvedValueOnce({
      data: { id: "tx-1", status: "PENDING", provider: "MTN" },
    });
    const user = userEvent.setup();
    render(<FeePaymentPage />);

    await selectChildAndTariff(user);
    await user.type(screen.getByLabelText("Numero payeur"), "+237600000000");
    await user.click(screen.getByRole("button", { name: /^payer$/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body, config] = apiClient.post.mock.calls[0];
    expect(url).toBe("/api/v1/payments/fees");
    expect(body).toMatchObject({ studentId: "STU-1", feeScheduleId: "fee-1", amount: 50000, provider: "MTN" });
    expect(config.headers["Idempotency-Key"]).toBeTruthy();

    expect(await screen.findByText("En attente")).toBeInTheDocument();
  });

  it("echec d'initiation : affiche le message d'erreur du serveur", async () => {
    mockReferenceData();
    apiClient.post.mockRejectedValueOnce({ response: { data: { message: "Solde insuffisant" } } });
    const user = userEvent.setup();
    render(<FeePaymentPage />);

    await selectChildAndTariff(user);
    await user.type(screen.getByLabelText("Numero payeur"), "+237600000000");
    await user.click(screen.getByRole("button", { name: /^payer$/i }));

    expect(await screen.findByText("Solde insuffisant")).toBeInTheDocument();
  });

  it("rafraichit le statut d'une transaction en cours", async () => {
    mockReferenceData();
    apiClient.post.mockResolvedValueOnce({ data: { id: "tx-1", status: "PENDING", provider: "MTN" } });
    const user = userEvent.setup();
    render(<FeePaymentPage />);

    await selectChildAndTariff(user);
    await user.type(screen.getByLabelText("Numero payeur"), "+237600000000");
    await user.click(screen.getByRole("button", { name: /^payer$/i }));
    await screen.findByText("En attente");

    apiClient.get.mockImplementation((url) => {
      if (url === "/api/v1/payments/tx-1/status") return Promise.resolve({ data: { id: "tx-1", status: "COMPLETED", provider: "MTN" } });
      return Promise.resolve({ data: [] });
    });

    await user.click(screen.getByRole("button", { name: /rafraichir le statut/i }));

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/payments/tx-1/status");
    expect(await screen.findByText("Terminé")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /telecharger le recu/i })).toBeInTheDocument();
  });

  it("affiche l'historique des paiements d'un eleve", async () => {
    mockReferenceData({
      history: [
        { id: "tx-1", amount: 50000, currency: "XAF", provider: "MTN", status: "COMPLETED", createdAt: "2026-08-05T08:00:00.000Z" },
      ],
    });
    const user = userEvent.setup();
    render(<FeePaymentPage />);

    await selectOption(user, "child", /jean dupont/i);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("MTN")).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/payments/student/STU-1");
  });

  it("historique vide : affiche un message", async () => {
    mockReferenceData({ history: [] });
    const user = userEvent.setup();
    render(<FeePaymentPage />);

    await selectOption(user, "child", /jean dupont/i);

    expect(await screen.findByText(/aucun paiement pour cet enfant/i)).toBeInTheDocument();
  });
});
