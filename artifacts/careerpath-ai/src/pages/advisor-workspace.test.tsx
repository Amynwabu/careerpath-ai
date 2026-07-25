import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdvisorWorkspace from "./advisor-workspace";

const { apiRequest } = vi.hoisted(() => ({
  apiRequest: vi.fn().mockResolvedValue({ items: [], persistenceStatus: "persistent" }),
}));
vi.mock("@/lib/api-request", () => ({ apiRequest }));
vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("wouter", () => ({ useParams: () => ({}) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("advisor browser workspace", () => {
  it("loads only the persistent, server-authorized caseload", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AdvisorWorkspace /></QueryClientProvider>);
    expect(screen.getByRole("heading", { name: "Scoped client cases" })).toBeInTheDocument();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith("/advisor/cases"));
    expect(await screen.findByText("No accessible cases.")).toBeInTheDocument();
    expect(screen.getByText(/verified advisor profile, current grant/)).toBeInTheDocument();
  });
});
