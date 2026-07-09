import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Analysis from "./analysis";

const mocks = vi.hoisted(() => ({
  analysis: undefined as unknown,
  analysisError: undefined as unknown,
  goal: { targetRole: "Advanced Clinical Practitioner", targetYears: 5 } as unknown,
  isLoading: false,
  mutateAsync: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  getGetDashboardSummaryQueryKey: () => ["dashboard"],
  getGetLatestAnalysisQueryKey: () => ["analysis", "latest"],
  getGetRecentActivityQueryKey: () => ["activity"],
  getGetRoadmapQueryKey: () => ["roadmap"],
  getGetSkillGapsQueryKey: () => ["skill-gaps"],
  getListMilestonesQueryKey: () => ["milestones"],
  useGetCareerGoal: () => ({ data: mocks.goal }),
  useGetLatestAnalysis: () => ({
    data: mocks.analysis,
    error: mocks.analysisError,
    isLoading: mocks.isLoading,
  }),
  useRunAnalysis: () => ({ mutateAsync: mocks.mutateAsync }),
}));
vi.mock("@/components/layout/app-layout", () => ({ AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/circular-progress", () => ({ CircularProgress: ({ value }: { value: number }) => <div data-testid="readiness-score">{value}%</div> }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

function renderAnalysis() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { client, ...render(<QueryClientProvider client={client}><Analysis /></QueryClientProvider>) };
}

beforeEach(() => {
  mocks.analysis = undefined;
  mocks.analysisError = { status: 404 };
  mocks.goal = { targetRole: "Advanced Clinical Practitioner", targetYears: 5 };
  mocks.isLoading = false;
  mocks.mutateAsync.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("analysis page", () => {
  it("shows the profile gate when no analysis exists", () => {
    renderAnalysis();

    expect(screen.getByText("No Analysis Yet")).toBeInTheDocument();
    expect(screen.getByText(/Complete your profile and set your target role/)).toBeInTheDocument();
  });

  it("renders the latest readiness result", () => {
    mocks.analysisError = undefined;
    mocks.analysis = {
      readinessScore: 72,
      profileSummary: "Experienced healthcare leader ready for advanced practice.",
      currentStrengths: "Clinical leadership",
      skillGaps: "Advanced diagnostics",
      experienceGaps: "Cross-service commissioning",
      qualificationGaps: "Advanced practice credential",
      certificationRecommendations: "Independent prescribing",
      suggestedProjects: "Lead a quality improvement programme",
      jobProgressionLadder: "Senior nurse to advanced practitioner",
      immediateActions: "Months 1-2 focus: confirm clinical requirements.",
      year1Priorities: "Months 3-4 focus: build portfolio evidence.",
      year2To3Plan: "Months 5-6 focus: apply and review progress.",
      createdAt: "2026-06-20T08:00:00.000Z",
    };

    renderAnalysis();

    expect(screen.getByTestId("readiness-score")).toHaveTextContent("72%");
    expect(screen.getByText("Experienced healthcare leader ready for advanced practice.")).toBeInTheDocument();
    expect(screen.getByText("Top transferable strengths")).toBeInTheDocument();
    expect(screen.getByText("Months 5 to 6")).toBeInTheDocument();
  });

  it("runs analysis, refreshes dependent data, and reports success", async () => {
    const { client } = renderAnalysis();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries").mockResolvedValue(undefined);

    fireEvent.click(screen.getAllByRole("button", { name: "Run Analysis" })[0]);

    await waitFor(() => expect(mocks.mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalledTimes(6));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Analysis complete" }));
  });
});
