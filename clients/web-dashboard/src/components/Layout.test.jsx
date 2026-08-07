import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import { getUser } from "@/api/auth";

vi.mock("@/api/auth", () => ({
  getUser: vi.fn(),
  clearToken: vi.fn(),
}));

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>Contenu</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Layout - bascule theme", () => {
  beforeEach(() => {
    getUser.mockReturnValue({ role: "ADMINISTRATEUR", email: "admin@ecole.cm" });
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("bascule vers le theme sombre et le memorise", async () => {
    const user = userEvent.setup();
    renderLayout();

    expect(document.documentElement.classList.contains("dark")).toBe(false);

    await user.click(screen.getByRole("button", { name: /passer au theme sombre/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("sm_theme")).toBe("dark");

    await user.click(screen.getByRole("button", { name: /passer au theme clair/i }));

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("sm_theme")).toBe("light");
  });
});
