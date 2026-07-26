import {describe,expect,it} from "vitest";
import {
 authorizeCase,calculateFollowUpStatus,clientVisibleNotes,createCase,requireDurableReviewResource,
 reviewDecisionState,revokeCase,transitionAction,transitionCase,transitionEvidenceRequest,transitionReview,
 transitionSession,type GrantContext,
} from "./index";
const grant:GrantContext={grantId:"g1",ownerUserId:1,advisorUserId:2,scopes:["case_manage","cv_review"],status:"active",expiresAt:new Date("2030-01-01")};
const record=createCase({ownerUserId:1,advisorUserId:2,grant,serviceType:"cv_review",now:new Date("2026-01-01")});
describe("advisor workspace policy",()=>{
 it("requires verified assigned advisor and exact scope",()=>{expect(authorizeCase({actor:{actorUserId:2,role:"advisor",advisorStatus:"active",verificationStatus:"verified"},grant,caseRecord:record,scope:"cv_review",now:new Date("2026-01-02")})).toBe(true);});
 it("denies expired, revoked, cross-advisor and insufficient scope",()=>{for(const run of [()=>authorizeCase({actor:{actorUserId:3,role:"advisor",verificationStatus:"verified"},grant,caseRecord:record,scope:"cv_review"}),()=>authorizeCase({actor:{actorUserId:2,role:"advisor",verificationStatus:"verified"},grant:{...grant,status:"revoked"},caseRecord:record,scope:"cv_review"}),()=>authorizeCase({actor:{actorUserId:2,role:"advisor",verificationStatus:"verified"},grant,caseRecord:record,scope:"interview_review"})])expect(run).toThrow();});
 it("preserves concurrency and revocation terminal state",()=>{const pending=transitionCase(record,"pending_acceptance",1);expect(()=>transitionCase(pending,"active",1)).toThrow("record_version_conflict");expect(revokeCase(pending).caseStatus).toBe("access_revoked");});
 it("isolates private notes",()=>{expect(clientVisibleNotes([{id:1,visibilityScope:"advisor_private"},{id:2,visibilityScope:"client_and_advisor"}])).toEqual([{id:2,visibilityScope:"client_and_advisor"}]);});
 it("keeps advisor decisions separate from governed scores",()=>{expect(reviewDecisionState("approve_change")).toMatchObject({verificationStatus:"advisor_reviewed",changesDeterministicScore:false,changesCanonicalMapping:false});});
 it("enforces operational state machines",()=>{
  expect(transitionAction("completed","verified")).toBe("verified");
  expect(()=>transitionAction("verified","in_progress")).toThrow("invalid_action_transition");
  expect(transitionEvidenceRequest("submitted","under_review")).toBe("under_review");
  expect(transitionReview("awaiting_advisor","awaiting_client")).toBe("awaiting_client");
  expect(transitionSession("confirmed","in_progress")).toBe("in_progress");
  expect(()=>transitionSession("cancelled","completed")).toThrow("invalid_session_transition");
 });
 it("calculates follow-up status with an injected clock",()=>{
  const now=new Date("2026-07-25T12:00:00Z");
  expect(calculateFollowUpStatus({dueAt:"2026-07-27T12:00:00Z",now})).toBe("scheduled");
  expect(calculateFollowUpStatus({dueAt:"2026-07-26T11:00:00Z",now})).toBe("due");
  expect(calculateFollowUpStatus({dueAt:"2026-07-24T12:00:00Z",now})).toBe("overdue");
  expect(calculateFollowUpStatus({dueAt:"2026-07-24T12:00:00Z",completedAt:now,now})).toBe("completed");
 });
 it("allows registered durable cross-domain sources and rejects unknown types",()=>{
  expect(requireDurableReviewResource("career_plan")).toBe("career_plan");
  expect(requireDurableReviewResource("cv_draft")).toBe("cv_draft");
  expect(requireDurableReviewResource("interview_response")).toBe("interview_response");
  expect(()=>requireDurableReviewResource("unregistered" as never)).toThrow("unsupported_resource_type");
 });
});
