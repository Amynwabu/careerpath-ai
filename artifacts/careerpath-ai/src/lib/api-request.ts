const TOKEN_KEY = "careerpath_token";

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { ...init, headers });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data && typeof data.error === "string"
      ? data.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
