import {describe,expect,it} from "vitest";
import {authorizeCase,clientVisibleNotes,createCase,reviewDecisionState,revokeCase,transitionCase,type GrantContext} from "./index";
const grant:GrantContext={grantId:"g1",ownerUserId:1,advisorUserId:2,scopes:["case_manage","cv_review"],status:"active",expiresAt:new Date("2030-01-01")};
const record=createCase({ownerUserId:1,advisorUserId:2,grant,serviceType:"cv_review",now:new Date("2026-01-01")});
describe("advisor workspace policy",()=>{
 it("requires verified assigned advisor and exact scope",()=>{expect(authorizeCase({actor:{actorUserId:2,role:"advisor",advisorStatus:"active",verificationStatus:"verified"},grant,caseRecord:record,scope:"cv_review",now:new Date("2026-01-02")})).toBe(true);});
 it("denies expired, revoked, cross-advisor and insufficient scope",()=>{for(const run of [()=>authorizeCase({actor:{actorUserId:3,role:"advisor",verificationStatus:"verified"},grant,caseRecord:record,scope:"cv_review"}),()=>authorizeCase({actor:{actorUserId:2,role:"advisor",verificationStatus:"verified"},grant:{...grant,status:"revoked"},caseRecord:record,scope:"cv_review"}),()=>authorizeCase({actor:{actorUserId:2,role:"advisor",verificationStatus:"verified"},grant,caseRecord:record,scope:"interview_review"})])expect(run).toThrow();});
 it("preserves concurrency and revocation terminal state",()=>{const pending=transitionCase(record,"pending_acceptance",1);expect(()=>transitionCase(pending,"active",1)).toThrow("record_version_conflict");expect(revokeCase(pending).caseStatus).toBe("access_revoked");});
 it("isolates private notes",()=>{expect(clientVisibleNotes([{id:1,visibilityScope:"advisor_private"},{id:2,visibilityScope:"client_and_advisor"}])).toEqual([{id:2,visibilityScope:"client_and_advisor"}]);});
 it("keeps advisor decisions separate from governed scores",()=>{expect(reviewDecisionState("approve_change")).toMatchObject({verificationStatus:"advisor_reviewed",changesDeterministicScore:false,changesCanonicalMapping:false});});
});
