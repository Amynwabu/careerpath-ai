import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Start from "./start";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  setLocation: vi.fn(),
}));

vi.mock("@/lib/api-request", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("wouter", () => ({
  useLocation: () => ["/start", mocks.setLocation],
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("first-use routing", () => {
  it("opens onboarding for a user without a completed profile", async () => {
    mocks.apiRequest.mockResolvedValue({ destination: "/onboarding" });

    render(<Start />);

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/onboarding"));
  });

  it("opens the dashboard for a returning user", async () => {
    mocks.apiRequest.mockResolvedValue({ destination: "/dashboard" });

    render(<Start />);

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/dashboard"));
  });

  it("falls back to onboarding when status lookup fails", async () => {
    mocks.apiRequest.mockRejectedValue(new Error("network unavailable"));

    render(<Start />);

    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/onboarding"));
  });
});
