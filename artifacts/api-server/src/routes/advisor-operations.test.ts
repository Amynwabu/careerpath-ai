import { describe, expect, it, vi } from "vitest";
import router from "./advisor-operations";
import { persistentResponse } from "./career-data";

function responseFixture() {
  const response = { status: vi.fn(), json: vi.fn(), setHeader: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

function registeredOperations() {
  const stack = (router as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean> } }>;
  }).stack;
  return stack.flatMap((layer) => {
    if (!layer.route) return [];
    return Object.entries(layer.route.methods)
      .filter(([, enabled]) => enabled)
      .map(([method]) => `${method.toUpperCase()} ${layer.route!.path}`);
  });
}

describe("advisor operational API contract", () => {
  it("registers the complete persistent operational endpoint surface", () => {
    const operations = registeredOperations();
    for (const expected of [
      "POST /advisor/cases/:caseId/actions",
      "POST /advisor/actions/:actionId/verify",
      "POST /advisor/cases/:caseId/evidence-requests",
      "POST /advisor/evidence-requests/:requestId/review",
      "POST /advisor/cases/:caseId/reviews",
      "POST /advisor/reviews/:reviewId/advisor-decision",
      "POST /advisor/reviews/:reviewId/comments",
      "POST /advisor/cases/:caseId/outcomes",
      "POST /advisor/cases/:caseId/placements",
      "POST /advisor/cases/:caseId/follow-ups",
      "POST /advisor/cases/:caseId/sessions",
      "POST /advisor/sessions/:sessionId/summaries",
      "POST /advisor/cases/:caseId/exports",
    ]) expect(operations).toContain(expected);
    expect(operations.length).toBeGreaterThanOrEqual(45);
  });

  it("returns a structured fail-closed durable-source response", async () => {
    const response = responseFixture();
    await persistentResponse(response as never, async () => {
      throw Object.assign(new Error("internal"), { code: "durable_source_required" });
    });
    expect(response.status).toHaveBeenCalledWith(409);
    expect(response.json).toHaveBeenCalledWith({
      error: "A persistent source record is required before advisor review can begin.",
      code: "durable_source_required",
    });
  });

  it("distinguishes grant denial from IDOR-safe not-found responses", async () => {
    const grantResponse = responseFixture();
    await persistentResponse(grantResponse as never, async () => {
      throw Object.assign(new Error("details"), { code: "advisor_scope_insufficient" });
    });
    expect(grantResponse.status).toHaveBeenCalledWith(403);
    expect(JSON.stringify(grantResponse.json.mock.calls)).not.toContain("details");

    const idorResponse = responseFixture();
    await persistentResponse(idorResponse as never, async () => {
      throw Object.assign(new Error("owner mismatch"), { code: "resource_not_found" });
    });
    expect(idorResponse.status).toHaveBeenCalledWith(404);
    expect(JSON.stringify(idorResponse.json.mock.calls)).not.toContain("owner mismatch");
  });
});
