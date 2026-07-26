import { logger } from "./logger";

export const workflowMetricNames = [
  "opportunity_sessions_created","opportunity_analyses_completed",
  "cv_sessions_created","cv_drafts_generated","blocked_claims",
  "application_readiness_calculated","interview_sessions_created",
  "interview_responses_created","practice_sessions_completed",
  "interview_readiness_calculated","advisor_reviews_activated",
  "durable_source_failures","version_conflicts","persistence_failures","export_failures",
] as const;
export type WorkflowMetricName = typeof workflowMetricNames[number];

export function recordWorkflowMetric(metric: WorkflowMetricName) {
  logger.info({ metric, value: 1 }, "workflow_persistence_metric");
}
