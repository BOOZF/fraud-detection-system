import { beforeEach, describe, expect, it } from "vitest";
import { isAuthenticated, login, logout } from "@/lib/auth";

beforeEach(() => window.sessionStorage.clear());

describe("auth", () => {
  it("accepts the demo credentials and persists the session", () => {
    expect(isAuthenticated()).toBe(false);
    expect(login("analyst", "fraud2026")).toBe(true);
    expect(isAuthenticated()).toBe(true);
    expect(window.sessionStorage.getItem("xxbank_auth")).toBe("1");
  });

  it("rejects wrong credentials", () => {
    expect(login("analyst", "nope")).toBe(false);
    expect(login("root", "fraud2026")).toBe(false);
    expect(isAuthenticated()).toBe(false);
  });

  it("logout clears the session", () => {
    login("analyst", "fraud2026");
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(window.sessionStorage.getItem("xxbank_auth")).toBeNull();
  });
});
