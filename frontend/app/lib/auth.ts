const isBrowser = typeof window !== "undefined";

export function getToken(): string | null {
  return isBrowser ? localStorage.getItem("fr_token") : null;
}

export function getName(): string {
  return (isBrowser && localStorage.getItem("fr_name")) || "";
}

export function getUsername(): string {
  return (isBrowser && localStorage.getItem("fr_username")) || "";
}

export function setSession(token: string, name: string, username: string): void {
  if (!isBrowser) return;
  localStorage.setItem("fr_token", token);
  localStorage.setItem("fr_name", name);
  localStorage.setItem("fr_username", username);
}

export function logout(): void {
  if (!isBrowser) return;
  localStorage.removeItem("fr_token");
  localStorage.removeItem("fr_name");
  localStorage.removeItem("fr_username");
}
