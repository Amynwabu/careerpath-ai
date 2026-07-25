import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CareerPlan from "./career-plan";

vi.mock("@/components/layout/app-layout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

afterEach(cleanup);

describe("career planning journey", () => {
  it("shows all accessible journey stages and the unpublished unavailable state", () => {
    render(<CareerPlan />);
    expect(screen.getByRole("navigation", { name: "Career planning steps" })).toBeInTheDocument();
    expect(screen.getByText("Review profile")).toBeInTheDocument();
    expect(screen.getByText("Track progress")).toBeInTheDocument();
    expect(screen.getByText("Canonical planning is currently unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/% ready/i)).not.toBeInTheDocument();
  });

  it("prepares a local draft without claiming persistence", () => {
    render(<CareerPlan />);
    fireEvent.change(screen.getByLabelText("Desired occupation or career direction"), {
      target: { value: "Synthetic target occupation" },
    });
    fireEvent.change(screen.getByLabelText("Development hours per week"), {
      target: { value: "4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Prepare draft goal" }));
    expect(screen.getByText(/This draft is not saved across sessions/)).toBeInTheDocument();
  });
});
