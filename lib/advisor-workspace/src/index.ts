import { createHash } from "node:crypto";

export const advisorScopes = [
  "profile_read","redacted_profile_read","assessment_read","plan_read","plan_comment",
  "plan_action_review","opportunity_read","job_match_read","cv_analysis_read","cv_draft_read",
  "cv_review","interview_plan_read","interview_response_read","interview_review",
  "evidence_read","evidence_review","session_summary_read","case_manage","outcome_record",
] as const;
export type AdvisorScope = typeof advisorScopes[number];
export type CaseStatus = "requested"|"pending_acceptance"|"active"|"on_hold"|"awaiting_client"|"awaiting_advisor"|"completed"|"closed"|"cancelled"|"access_revoked";
export type CaseStage = "intake"|"profile_review"|"goal_definition"|"assessment_review"|"plan_review"|"opportunity_review"|"cv_review"|"interview_review"|"application_support"|"follow_up"|"outcome_tracking";
export type ActionStatus = "not_started"|"in_progress"|"blocked"|"completed"|"verified"|"deferred"|"cancelled";
export type EvidenceRequestStatus = "requested"|"submitted"|"under_review"|"accepted"|"rejected"|"withdrawn"|"expired";
export type EvidenceReviewDecision = "accepted_as_supporting_evidence"|"accepted_with_limitations"|"needs_clarification"|"insufficient"|"conflicting"|"out_of_scope";
export type ReviewStatus = "requested"|"awaiting_advisor"|"awaiting_client"|"resolved"|"withdrawn";
export type SessionStatus = "scheduled"|"confirmed"|"in_progress"|"completed"|"cancelled"|"rescheduled";
export type FollowUpStatus = "scheduled"|"due"|"overdue"|"completed"|"cancelled";
export type ReviewResourceType =
  | "career_profile"|"career_goal"|"career_plan"|"career_action"|"opportunity"|"evidence_record"
  | "job_match_analysis"|"employability_analysis"
  | "cv_optimisation_session"|"cv_ats_analysis"|"cv_recommendation"|"cv_draft"
  | "cv_claim_validation"|"application_readiness"
  | "interview_session"|"interview_competency"|"interview_question"
  | "interview_evidence"|"interview_response"|"interview_claim_validation"|"interview_readiness";

export const durableReviewResources = [
  "career_profile","career_goal","career_plan","career_action","evidence_record",
  "opportunity","job_match_analysis","employability_analysis",
  "cv_optimisation_session","cv_ats_analysis","cv_recommendation","cv_draft",
  "cv_claim_validation","application_readiness",
  "interview_session","interview_competency","interview_question","interview_evidence",
  "interview_response","interview_claim_validation","interview_readiness",
] as const satisfies readonly ReviewResourceType[];
export const processLocalReviewResources = [] as const satisfies readonly ReviewResourceType[];

export interface GrantContext {
  grantId: string; ownerUserId: number; advisorUserId: number; scopes: AdvisorScope[];
  status: "active"|"revoked"|"expired"|"suspended"; expiresAt: Date|null;
}
export interface AdvisorContext {
  actorUserId: number; role: "client"|"advisor"|"administrator";
  advisorStatus?: "active"|"inactive"|"suspended"|"closed";
  verificationStatus?: "unverified"|"pending_review"|"verified"|"rejected"|"suspended"|"expired";
}
export interface AdvisorCase {
  caseId:string; ownerUserId:number; advisorUserId:number; advisorGrantId:string;
  caseStatus:CaseStatus; serviceType:string; priority:"urgent"|"high"|"standard"|"low";
  currentStage:CaseStage; openedAt:string; closedAt:string|null; nextReviewAt:string|null;
  summary:string|null; recordVersion:number;
}

export function authorizeCase(input:{actor:AdvisorContext;grant:GrantContext;caseRecord:AdvisorCase;scope:AdvisorScope;now?:Date}) {
  const {actor,grant,caseRecord}=input;
  if(grant.status==="revoked"||caseRecord.caseStatus==="access_revoked") throw coded("advisor_grant_revoked");
  if(grant.status==="expired"||(grant.expiresAt&&grant.expiresAt.getTime()< (input.now??new Date()).getTime())) throw coded("advisor_grant_expired");
  if(grant.status!=="active") throw coded("case_access_denied");
  if(caseRecord.ownerUserId!==grant.ownerUserId||caseRecord.advisorUserId!==grant.advisorUserId||caseRecord.advisorGrantId!==grant.grantId) throw coded("case_access_denied");
  if(actor.role==="advisor"){
    if(actor.advisorStatus==="suspended"||actor.verificationStatus==="suspended") throw coded("advisor_suspended");
    if(actor.verificationStatus!=="verified") throw coded("advisor_not_verified");
    if(actor.actorUserId!==caseRecord.advisorUserId) throw coded("case_access_denied");
  } else if(actor.role==="client"&&actor.actorUserId!==caseRecord.ownerUserId) throw coded("case_access_denied");
  if(!grant.scopes.includes(input.scope)) throw coded("advisor_scope_insufficient");
  return true;
}

export function createCase(input:{ownerUserId:number;advisorUserId:number;grant:GrantContext;serviceType:string;priority?:AdvisorCase["priority"];now?:Date}) {
  if(input.grant.ownerUserId!==input.ownerUserId||input.grant.advisorUserId!==input.advisorUserId) throw coded("advisor_grant_required");
  const now=input.now??new Date();
  const seed=`${input.ownerUserId}:${input.advisorUserId}:${input.grant.grantId}:${input.serviceType}:${now.toISOString()}`;
  return {caseId:`cpx_case_${createHash("sha256").update(seed).digest("hex").slice(0,20)}`,ownerUserId:input.ownerUserId,advisorUserId:input.advisorUserId,advisorGrantId:input.grant.grantId,caseStatus:"requested",serviceType:input.serviceType,priority:input.priority??"standard",currentStage:"intake",openedAt:now.toISOString(),closedAt:null,nextReviewAt:null,summary:null,recordVersion:1} satisfies AdvisorCase;
}

export function transitionCase(record:AdvisorCase,next:CaseStatus,expectedVersion:number,now=new Date()){
  if(record.recordVersion!==expectedVersion) throw coded("record_version_conflict");
  const allowed:Record<CaseStatus,CaseStatus[]>={requested:["pending_acceptance","cancelled","access_revoked"],pending_acceptance:["active","cancelled","access_revoked"],active:["on_hold","awaiting_client","awaiting_advisor","completed","closed","access_revoked"],on_hold:["active","closed","access_revoked"],awaiting_client:["active","closed","access_revoked"],awaiting_advisor:["active","closed","access_revoked"],completed:["closed"],closed:[],cancelled:[],access_revoked:[]};
  if(!allowed[record.caseStatus].includes(next)) throw coded("case_closed");
  return {...record,caseStatus:next,closedAt:next==="closed"||next==="cancelled"||next==="access_revoked"?now.toISOString():record.closedAt,recordVersion:record.recordVersion+1};
}

export function revokeCase(record:AdvisorCase,now=new Date()){return {...record,caseStatus:"access_revoked" as const,closedAt:now.toISOString(),recordVersion:record.recordVersion+1};}
export function clientVisibleNotes<T extends {visibilityScope:string}>(notes:T[]){return notes.filter(n=>n.visibilityScope==="client_and_advisor");}
export function reviewDecisionState(decision:string){return {decision,verificationStatus:"advisor_reviewed" as const,changesDeterministicScore:false,changesCanonicalMapping:false};}
export function transitionAction(current:ActionStatus,next:ActionStatus){
  const allowed:Record<ActionStatus,ActionStatus[]> = {
    not_started:["in_progress","deferred","cancelled"],
    in_progress:["completed","blocked","deferred","cancelled"],
    blocked:["in_progress","deferred","cancelled"],
    completed:["verified","in_progress"],
    verified:[], deferred:["not_started","cancelled"], cancelled:[],
  };
  if(!allowed[current].includes(next)) throw coded("invalid_action_transition");
  return next;
}
export function transitionEvidenceRequest(current:EvidenceRequestStatus,next:EvidenceRequestStatus){
  const allowed:Record<EvidenceRequestStatus,EvidenceRequestStatus[]> = {
    requested:["submitted","withdrawn","expired"],
    submitted:["under_review","withdrawn"],
    under_review:["accepted","rejected","submitted"],
    accepted:[], rejected:["submitted"], withdrawn:[], expired:[],
  };
  if(!allowed[current].includes(next)) throw coded("invalid_evidence_transition");
  return next;
}
export function transitionReview(current:ReviewStatus,next:ReviewStatus){
  const allowed:Record<ReviewStatus,ReviewStatus[]> = {
    requested:["awaiting_advisor","withdrawn"],
    awaiting_advisor:["awaiting_client","resolved","withdrawn"],
    awaiting_client:["awaiting_advisor","resolved","withdrawn"],
    resolved:[], withdrawn:[],
  };
  if(!allowed[current].includes(next)) throw coded("invalid_review_transition");
  return next;
}
export function transitionSession(current:SessionStatus,next:SessionStatus){
  const allowed:Record<SessionStatus,SessionStatus[]> = {
    scheduled:["confirmed","cancelled","rescheduled"],
    confirmed:["in_progress","cancelled","rescheduled"],
    in_progress:["completed","cancelled"],
    completed:[], cancelled:[], rescheduled:[],
  };
  if(!allowed[current].includes(next)) throw coded("invalid_session_transition");
  return next;
}
export function calculateFollowUpStatus(input:{dueAt:Date|string;completedAt?:Date|string|null;cancelledAt?:Date|string|null;now?:Date}):FollowUpStatus{
  if(input.cancelledAt) return "cancelled";
  if(input.completedAt) return "completed";
  const dueAt=new Date(input.dueAt).getTime();
  const now=(input.now??new Date()).getTime();
  if(dueAt<now) return "overdue";
  if(dueAt-now<=24*60*60*1000) return "due";
  return "scheduled";
}
export function requireDurableReviewResource(resourceType:ReviewResourceType){
  if((processLocalReviewResources as readonly string[]).includes(resourceType)) throw coded("durable_source_required");
  if(!(durableReviewResources as readonly string[]).includes(resourceType)) throw coded("unsupported_resource_type");
  return resourceType;
}
function coded(code:string){return Object.assign(new Error(code),{code});}
