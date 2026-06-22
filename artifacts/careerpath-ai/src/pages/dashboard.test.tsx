import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Dashboard from "./dashboard";

vi.mock("framer-motion", () => ({ useReducedMotion: () => false }));
vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@workspace/api-client-react", () => ({
  useGetDashboardSummary: () => ({
    data: {
      targetRole: "Head of Department / Curriculum Leader",
      readinessScore: 40,
      journeyProgress: 0,
      nextAction: "Lead one curriculum improvement cycle",
    },
    isLoading: false,
  }),
  useGetSkillGaps: () => ({ data: [], isLoading: false }),
  useGetCareerGoal: () => ({
    data: { targetRole: "Head of Department / Curriculum Leader", targetYears: 1 },
    isLoading: false,
  }),
  useGetProfile: () => ({ data: { currentRole: "Teacher" }, isLoading: false }),
  useListMilestones: () => ({ data: [], isLoading: false }),
  useGetRoadmap: () => ({ data: undefined, isLoading: false }),
}));

beforeEach(() => sessionStorage.clear());

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe("dashboard career evidence update", () => {
  it("provides direct description and CV refresh entry points", () => {
    render(<Dashboard />);

    expect(screen.getByRole("link", { name: "Change description" })).toHaveAttribute(
      "href",
      "/onboarding?mode=description",
    );
    expect(screen.getByRole("link", { name: "Upload a new CV" })).toHaveAttribute(
      "href",
      "/onboarding?mode=cv",
    );
  });

  it("explains when refreshed evidence changes the mapped path", () => {
    sessionStorage.setItem(
      "careerpath_reanalysis_outcome",
      JSON.stringify({
        status: "changed",
        previousTargetRole: "Head of Department / Curriculum Leader",
        targetRole: "Education Programme Manager",
        readinessScore: 58,
        refreshedAt: "2026-06-22T12:00:00.000Z",
        message:
          "Your pathway changed from Head of Department / Curriculum Leader to Education Programme Manager based on your updated evidence.",
      }),
    );

    render(<Dashboard />);

    expect(screen.getByText("Career path remapped")).toBeInTheDocument();
    expect(screen.getByText(/changed from Head of Department/)).toBeInTheDocument();
    expect(sessionStorage.getItem("careerpath_reanalysis_outcome")).toBeNull();
  });
});
