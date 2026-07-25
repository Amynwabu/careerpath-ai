import { describe, expect, it } from "vitest";
import { advisorMetricNames, metricForActivity } from "./advisor-observability";

describe("advisor observability", () => {
  it("uses a fixed, non-personal metric vocabulary", () => {
    expect(metricForActivity("action_created")).toBe("actions_created");
    expect(metricForActivity("unknown")).toBeUndefined();
    expect(advisorMetricNames).not.toContain("client_name");
    expect(advisorMetricNames).not.toContain("salary");
    expect(advisorMetricNames).not.toContain("note_text");
  });
});
