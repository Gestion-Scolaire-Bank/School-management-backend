import { describe, it, expect, beforeEach } from "vitest";
import { getToken, setToken, clearToken, isAuthenticated, getUser } from "./auth";

function fakeJwt(claims) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = btoa(JSON.stringify(claims));
  return `${header}.${payload}.fake-signature`;
}

describe("auth", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setToken puis getToken renvoie la meme valeur", () => {
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");
  });

  it("clearToken supprime le token", () => {
    setToken("abc.def.ghi");
    clearToken();
    expect(getToken()).toBeNull();
  });

  it("isAuthenticated est faux sans token", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated est vrai pour un token non expire", () => {
    const token = fakeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) + 3600 });
    setToken(token);
    expect(isAuthenticated()).toBe(true);
  });

  it("isAuthenticated est faux pour un token expire", () => {
    const token = fakeJwt({ sub: "user-1", exp: Math.floor(Date.now() / 1000) - 3600 });
    setToken(token);
    expect(isAuthenticated()).toBe(false);
  });

  it("isAuthenticated est faux pour un token mal forme", () => {
    setToken("pas-un-jwt-valide");
    expect(isAuthenticated()).toBe(false);
  });

  it("getUser extrait id/email/role depuis les claims", () => {
    const token = fakeJwt({
      sub: "user-1",
      email: "a@b.cm",
      role: "ADMINISTRATEUR",
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    setToken(token);
    expect(getUser()).toEqual({ id: "user-1", email: "a@b.cm", role: "ADMINISTRATEUR" });
  });

  it("getUser renvoie null sans token", () => {
    expect(getUser()).toBeNull();
  });
});
