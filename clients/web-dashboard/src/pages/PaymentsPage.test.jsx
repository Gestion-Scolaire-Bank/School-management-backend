import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentsPage from "./PaymentsPage";
import apiClient from "../api/client";
import { getUser } from "../api/auth";

vi.mock("../api/client", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../api/auth", () => ({
  getUser: vi.fn(),
}));

const ESTABLISHMENTS = [{ id: "est-1", name: "Ecole Centrale" }];
const CLASSES = [{ id: "class-1", name: "6eme A", establishmentId: "est-1" }];
const STUDENTS = [{ id: "stu-1", firstName: "Jean", lastName: "Dupont" }];
const FEE_SCHEDULES = [{ id: "fee-1", label: "Trimestre 1", amount: 50000, currency: "XAF" }];
const STAFF = [
  { id: "u1", fullName: "Alice Prof", email: "alice@ecole.cm", role: "ENSEIGNANT" },
  { id: "u2", fullName: "Un Parent", email: "parent@ecole.cm", role: "PARENT" },
];

function mockReferenceData() {
  apiClient.get.mockImplementation((url) => {
    if (url === "/api/v1/payments/reports/revenue") {
      return Promise.resolve({ data: { totalRevenue: 0, transactionCount: 0 } });
    }
    if (url === "/api/v1/admin/establishments") return Promise.resolve({ data: ESTABLISHMENTS });
    if (url === "/api/v1/admin/classes") return Promise.resolve({ data: CLASSES });
    if (url === "/api/auth/users") return Promise.resolve({ data: STAFF });
    if (url === "/api/v1/admin/fee-schedules") return Promise.resolve({ data: FEE_SCHEDULES });
    if (url === "/api/v1/registrations/class/class-1") return Promise.resolve({ data: STUDENTS });
    return Promise.resolve({ data: [] });
  });
}

async function selectOption(user, triggerId, optionName) {
  await user.click(document.getElementById(triggerId));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("PaymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReferenceData();
  });

  it("role Directeur : ne voit pas la section paiement des salaires", async () => {
    getUser.mockReturnValue({ role: "DIRECTEUR" });
    render(<PaymentsPage />);

    await screen.findByText("Paiements & recettes");
    expect(screen.queryByText("Payer un salaire")).not.toBeInTheDocument();
  });

  it("role Administrateur : ne propose que le personnel (pas les parents) et paie un salaire", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    apiClient.post.mockResolvedValueOnce({ data: { id: "tx-1", status: "PENDING" } });
    const user = userEvent.setup();
    render(<PaymentsPage />);

    await screen.findByText("Payer un salaire");
    await selectOption(user, "salaryStaff", /alice prof/i);
    expect(screen.queryByText("parent@ecole.cm")).not.toBeInTheDocument();

    await selectOption(user, "salaryEstablishment", /ecole centrale/i);
    await user.type(screen.getByLabelText("Montant (XAF)", { selector: "#salaryAmount" }), "150000");
    await user.type(screen.getByLabelText("Numero destinataire"), "+237600000000");
    await user.click(screen.getByRole("button", { name: /^payer le salaire$/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe("/api/v1/payments/salary");
    expect(body).toMatchObject({ staffUserId: "u1", establishmentId: "est-1", amount: 150000, provider: "MTN" });

    expect(await screen.findByText("En attente")).toBeInTheDocument();
  });

  it("role Administrateur : enregistre un paiement en especes, complete immediatement", async () => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR" });
    apiClient.post.mockResolvedValueOnce({ data: { id: "tx-cash-1", status: "COMPLETED" } });
    const user = userEvent.setup();
    render(<PaymentsPage />);

    await screen.findByText("Enregistrer un paiement en especes");
    await selectOption(user, "cashEstablishment", /ecole centrale/i);
    await selectOption(user, "cashClass", /6eme a/i);
    await selectOption(user, "cashStudent", /jean dupont/i);
    await selectOption(user, "cashTariff", /trimestre 1/i);

    expect(screen.getByLabelText("Montant recu (XAF)")).toHaveValue(50000);

    await user.click(screen.getByRole("button", { name: /^enregistrer le paiement$/i }));

    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe("/api/v1/payments/fees");
    expect(body).toMatchObject({ studentId: "stu-1", feeScheduleId: "fee-1", amount: 50000, provider: "CASH" });

    expect(await screen.findByText("Terminé")).toBeInTheDocument();
  });
});
