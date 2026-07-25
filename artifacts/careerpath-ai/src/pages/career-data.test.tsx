import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CareerData from "./career-data";

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn().mockResolvedValue({
    items: [],
    persistenceStatus: "persistent",
  }),
}));

vi.mock("@/lib/api-request", () => ({ apiRequest }));
vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CareerData />
    </QueryClientProvider>,
  );
}

describe("persistent career-data browser experience", () => {
  it("loads saved histories only through authenticated API requests", async () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Your saved career data" })).toBeInTheDocument();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/profiles?limit=25"));
    expect(apiRequest).toHaveBeenCalledWith("/career-assessments?limit=25");
    expect(apiRequest).toHaveBeenCalledWith("/career-plans?limit=25");
    expect(screen.getByText("Saved profiles")).toBeInTheDocument();
    expect(screen.getByText("Assessment history")).toBeInTheDocument();
  });

  it("communicates private storage, scan gating, retention and scoped sharing", () => {
    renderPage();
    expect(screen.getByText(/Files remain private/)).toBeInTheDocument();
    expect(screen.getByText(/requires a clean malware-scan result/)).toBeInTheDocument();
    expect(screen.getByLabelText("Source-document retention")).toHaveValue("persist_profile_only");
    expect(screen.getByText(/Redacted sharing excludes contact details/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request account-data deletion" })).toBeInTheDocument();
  });
});
