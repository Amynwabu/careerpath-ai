let refreshPromise: Promise<boolean> | null = null;

function csrfToken() {
  return document.cookie.split(";").map((item) => item.trim())
    .find((item) => item.startsWith("careerpath_csrf="))
    ?.slice("careerpath_csrf=".length);
}

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(csrfToken() ? { "X-CSRF-Token": csrfToken()! } : {}),
    },
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
  if (["POST","PUT","PATCH","DELETE"].includes(init?.method?.toUpperCase() ?? "GET")) {
    const token = csrfToken();
    if (token) headers.set("X-CSRF-Token", token);
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
