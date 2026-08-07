import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import { setToken } from "@/api/auth";

function renderWithRoute(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Page de connexion</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<div>Contenu protege</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function fakeJwt(exp) {
  const header = btoa(JSON.stringify({ alg: "HS256" }));
  const payload = btoa(JSON.stringify({ sub: "user-1", exp }));
  return `${header}.${payload}.sig`;
}

describe("RequireAuth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("redirige vers /login si non authentifie", () => {
    renderWithRoute("/");
    expect(screen.getByText("Page de connexion")).toBeInTheDocument();
  });

  it("affiche le contenu protege si authentifie", () => {
    setToken(fakeJwt(Math.floor(Date.now() / 1000) + 3600));
    renderWithRoute("/");
    expect(screen.getByText("Contenu protege")).toBeInTheDocument();
  });

  it("redirige vers /login si le token est expire", () => {
    setToken(fakeJwt(Math.floor(Date.now() / 1000) - 3600));
    renderWithRoute("/");
    expect(screen.getByText("Page de connexion")).toBeInTheDocument();
  });
});
