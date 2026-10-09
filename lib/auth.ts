// Hardcoded demo login. No security is intended: this only gates the demo dashboard.
export const DEMO_USERNAME = "analyst";
export const DEMO_PASSWORD = "fraud2026";
const KEY = "xxbank_auth";

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function login(username: string, password: string): boolean {
  if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) return false;
  try {
    store()?.setItem(KEY, "1");
  } catch {
    // storage blocked: the login still succeeds for this page view
  }
  return true;
}

export function isAuthenticated(): boolean {
  try {
    return store()?.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function logout(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    // ignore
  }
}
