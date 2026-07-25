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
function coded(code:string){return Object.assign(new Error(code),{code});}
