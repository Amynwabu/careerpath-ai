import { logger } from "./logger";

export const advisorMetricNames = [
  "actions_created","actions_completed","actions_verified",
  "evidence_requests_created","evidence_reviews_completed",
  "review_items_created","advisor_decisions","client_responses",
  "outcomes_recorded","placements_recorded","follow_ups_due",
  "follow_ups_completed","session_summaries_published",
  "authorization_denials","version_conflicts","durable_source_failures","export_failures",
] as const;
export type AdvisorMetricName = typeof advisorMetricNames[number];

export function recordAdvisorMetric(name: AdvisorMetricName) {
  logger.info({ metric: name, value: 1 }, "advisor_workspace_metric");
}

export function metricForActivity(eventType: string): AdvisorMetricName|undefined {
  const map: Record<string, AdvisorMetricName> = {
    action_created: "actions_created",
    action_completed: "actions_completed",
    action_verified: "actions_verified",
    evidence_request_created: "evidence_requests_created",
    evidence_review_completed: "evidence_reviews_completed",
    review_item_created: "review_items_created",
    advisor_decision_recorded: "advisor_decisions",
    client_response_recorded: "client_responses",
    outcome_recorded: "outcomes_recorded",
    placement_recorded: "placements_recorded",
    follow_up_completed: "follow_ups_completed",
    session_summary_published: "session_summaries_published",
  };
  return map[eventType];
}
