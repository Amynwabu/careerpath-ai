import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Onboarding from "./onboarding";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  setLocation: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api-request", () => ({ apiRequest: mocks.apiRequest }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("wouter", () => ({
  useLocation: () => ["/onboarding", mocks.setLocation],
}));

const intake = {
  source: "description",
  fileName: null,
  previousTargetRole: "Head of Department / Curriculum Leader",
  extracted: {
    currentRole: "Teacher",
    yearsExperience: 7,
    industry: "Education",
    careerLevel: "Experienced",
    skills: ["Curriculum design", "Assessment"],
    professionalSummary:
      "Experienced secondary school teacher leading curriculum planning and cross-staff assessment work.",
  },
  options: [
    {
      id: "education-programme-manager",
      title: "Education Programme Manager",
      durationMonths: 12,
      rationale: "The updated evidence shows programme ownership across several staff groups.",
      skills: ["Programme delivery"],
      matchScore: 92,
      growthDirection: "adjacent",
    },
  ],
  classification: { code: "k12-education", label: "K-12 education", confidence: 92 },
  needsClarification: false,
};

function renderOnboarding() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Onboarding />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, "", "/onboarding?mode=description");
  window.scrollTo = vi.fn();
  sessionStorage.clear();
  mocks.apiRequest.mockImplementation((path: string) => {
    if (path === "/onboarding/intake") return Promise.resolve(intake);
    if (path === "/onboarding/refresh") {
      return Promise.resolve({
        pathOutcome: {
          status: "changed",
          previousTargetRole: "Head of Department / Curriculum Leader",
          targetRole: "Education Programme Manager",
          message:
            "Your pathway changed from Head of Department / Curriculum Leader to Education Programme Manager based on your updated evidence.",
        },
        analysis: { id: 9, readinessScore: 58 },
        journey: { id: 12, targetRole: "Education Programme Manager", durationMonths: 12 },
        refreshedAt: "2026-06-22T12:00:00.000Z",
      });
    }
    return Promise.reject(new Error(`Unexpected path: ${path}`));
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("career evidence refresh", () => {
  it("opens the description refresh flow from the dashboard query mode", () => {
    renderOnboarding();

    expect(screen.getByText("Career evidence refresh")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change description" })).toBeInTheDocument();
  });

  it("opens the newer CV flow from the dashboard query mode", () => {
    window.history.replaceState({}, "", "/onboarding?mode=cv");
    renderOnboarding();

    expect(screen.getByRole("button", { name: "Upload a newer CV" })).toBeInTheDocument();
    expect(screen.getByText("Choose your CV")).toBeInTheDocument();
  });

  it("submits confirmed evidence through one refresh request and records the remap outcome", async () => {
    renderOnboarding();

    fireEvent.change(screen.getByLabelText("What do you do today?"), {
      target: {
        value:
          "I teach secondary school pupils, lead curriculum planning, coordinate assessment moderation, and manage a cross-staff improvement programme.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review remapped career options" }));

    expect(await screen.findByText("Choose a realistic career option")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to verify my profile" }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh analysis and rebuild pathway" }));

    await waitFor(() =>
      expect(mocks.apiRequest).toHaveBeenCalledWith(
        "/onboarding/refresh",
        expect.objectContaining({ method: "POST" }),
      ),
    );
    const refreshCall = mocks.apiRequest.mock.calls.find(
      ([path]) => path === "/onboarding/refresh",
    );
    const payload = JSON.parse(refreshCall?.[1]?.body as string);
    expect(payload).toMatchObject({
      source: "description",
      selectedDirectionId: "education-programme-manager",
      targetRole: "Education Programme Manager",
      extractedSkills: ["Curriculum design", "Assessment"],
      profile: { currentRole: "Teacher", industry: "Education" },
    });
    await waitFor(() => expect(mocks.setLocation).toHaveBeenCalledWith("/dashboard"));
    expect(JSON.parse(sessionStorage.getItem("careerpath_reanalysis_outcome") ?? "{}")).toMatchObject({
      status: "changed",
      targetRole: "Education Programme Manager",
      readinessScore: 58,
    });
  });
});
