let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const requestInit = { ...init, credentials: "include" as const, headers };
  let response = await fetch(`/api${path}`, requestInit);
  if (
    response.status === 401 &&
    path !== "/auth/refresh" &&
    await refreshSession()
  ) {
    response = await fetch(`/api${path}`, requestInit);
  }
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data && typeof data.error === "string"
      ? data.error
      : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}
