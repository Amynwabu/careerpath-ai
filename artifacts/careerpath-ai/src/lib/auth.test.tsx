import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, ProtectedRoute } from "./auth";

const mocks = vi.hoisted(() => ({
  authState: {
    data: undefined as unknown,
    isLoading: false,
    isError: false,
  },
  setLocation: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetMeQueryKey: () => ["auth", "me"],
  logout: vi.fn(),
  useGetMe: () => mocks.authState,
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/dashboard", mocks.setLocation],
}));

function renderProtectedRoute() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const SecureContent = () => <div>Secure dashboard</div>;

  return render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <ProtectedRoute component={SecureContent} />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.authState.data = undefined;
  mocks.authState.isLoading = false;
  mocks.authState.isError = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("protected routes", () => {
  it("shows a loading state while the current session is checked", () => {
    mocks.authState.isLoading = true;

    renderProtectedRoute();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("Secure dashboard")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated visitor to login", async () => {
    mocks.authState.isError = true;

    renderProtectedRoute();

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("Secure dashboard")).not.toBeInTheDocument();
  });

  it("renders protected content for an authenticated user", () => {
    mocks.authState.data = { id: 1, email: "member@example.com" };

    renderProtectedRoute();

    expect(screen.getByText("Secure dashboard")).toBeInTheDocument();
    expect(mocks.setLocation).not.toHaveBeenCalled();
  });
});
