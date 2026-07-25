import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdvisorSupport from "./advisor-support";

const caseItem = {
  id: "case_fixture", advisorUserId: 42, serviceType: "career_support",
  caseStatus: "active", caseStage: "plan_review", openedAt: "2026-01-01T00:00:00Z",
  nextReviewAt: null, recordVersion: 3,
};
const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));
vi.mock("@/lib/api-request", () => ({ apiRequest }));
vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("client advisor-support controls", () => {
  it("shows success only after the revocation API confirms persistence", async () => {
    apiRequest
      .mockResolvedValueOnce({ items: [caseItem], persistenceStatus: "persistent" })
      .mockResolvedValueOnce({ case: { ...caseItem, caseStatus: "access_revoked" }, persistenceStatus: "persistent" })
      .mockResolvedValue({ items: [], persistenceStatus: "persistent" });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AdvisorSupport /></QueryClientProvider>);
    const button = await screen.findByRole("button", { name: "Revoke access" });
    fireEvent.click(button);
    await waitFor(() => expect(apiRequest).toHaveBeenCalledWith(
      "/advisor-cases/case_fixture/revoke-access",
      { method: "POST", headers: { "If-Match": "3" } },
    ));
    expect(await screen.findByText(/confirmed by the server/)).toBeInTheDocument();
  });
});
