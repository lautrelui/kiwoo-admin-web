/**
 * Kiwoo Intelligence Platform — admin frontend DTOs.
 *
 * Sprint 13 Task 126.5 — mirrors the shapes returned by
 * `/admin/intelligence/*` (Tasks 123–126) and the small delta added in
 * `admin/users` for Task 126.5.
 *
 * These types are permissive on purpose: the backend evolves fields
 * over time and the admin UI must not crash when a new field appears.
 * Every property that isn't required in every call is optional.
 */

// ---- Task 123 — Event Bus -------------------------------------------------

export interface PlatformEvent {
  event_id: string;
  event_type: string;
  schema_version?: number;
  occurred_at: string;
  source_product?: string;
  actor_ref?: string | null;
  subject_ref?: string | null;
  correlation_id?: string | null;
  trace_id?: string | null;
  tenant_ref?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface EventListResponse {
  events: PlatformEvent[];
  nextCursor?: string | null;
  total?: number;
}

export interface Subscriber {
  name: string;
  interest: string | string[];
}

export interface SubscriberCheckpoint {
  subscriber_name: string;
  last_event_id?: string | null;
  last_processed_at?: string | null;
  events_processed: number;
  events_errored: number;
}

// ---- Task 124 — Notifications --------------------------------------------

export interface Notification {
  id: string;
  user_id?: number | null;
  event_id?: string | null;
  event_type?: string | null;
  product?: string | null;
  channel?: string;
  status: "unread" | "read" | "archived" | string;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  correlation_id?: string | null;
  occurred_at?: string;
  created_at: string;
}

export interface NotificationListResponse {
  notifications: Notification[];
  nextCursor?: string | null;
  total?: number;
}

// ---- Task 125 — Activity Platform ----------------------------------------

export interface Activity {
  id: string;
  user_id: number;
  event_id: string;
  event_type?: string;
  activity_type: string;
  product?: string;
  title: string;
  subtitle?: string;
  amount?: string | null;
  currency?: string | null;
  entity_ref?: string | null;
  metadata?: Record<string, unknown>;
  correlation_id?: string | null;
  trace_id?: string | null;
  occurred_at: string;
  created_at: string;
}

export interface ActivityListResponse {
  activity: Activity[];
  nextCursor?: string | null;
  total?: number;
}

// ---- Task 126 — Universal Search & Knowledge Index -----------------------

export interface SearchDocument {
  id: string;
  event_id: string;
  entity_type: string;
  entity_ref?: string | null;
  product?: string | null;
  title: string;
  subtitle?: string | null;
  rank?: number | null;
  amount?: string | null;
  currency?: string | null;
  metadata?: Record<string, unknown>;
  correlation_id?: string | null;
  occurred_at: string;
  created_at: string;
  owner_user_id?: number | null;
}

export interface SearchQueryResult {
  documents: SearchDocument[];
  nextCursor?: string | null;
  total?: number;
}

// ---- Task 126.5 — Admin User Directory -----------------------------------

export interface AdminUserSummary {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  kyc_tier: string;
  is_frozen: boolean;
  has_wallet: boolean;
  admin_roles: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  wallet_public_key?: string | null;
  admin_permissions: string[];
  profile?: {
    score?: number | null;
    id_verified?: boolean;
    address_verified?: boolean;
    occupation_verified?: boolean;
    income_verified?: boolean;
    dob?: string | null;
  } | null;
}

export interface AdminUserListResponse {
  users: AdminUserSummary[];
  total: number;
  page: number;
  limit: number;
}

// ---- Task 131 — Product Contracts ---------------------------------------

export interface ProductContractSummary {
  product_id: string;
  display_name: string;
  status: "production" | "beta" | "coming_soon" | "concept" | "disabled" | string;
  category: string;
  owner_team: string;
  events_published_count: number;
  event_names: string[];
  kyc_minimum_tier: string;
  fee_model: string;
  retention_hot: string;
}

export interface ProductContractEvent {
  event_name: string;
  description: string;
  schema_version: number;
  payload_schema: Record<
    string,
    { type: string; description: string; classification: string; example?: unknown }
  >;
  required_fields: string[];
  sensitive_fields: string[];
  searchable_fields: string[];
  ai_eligible_fields: string[];
  notification_eligible: boolean;
  activity_eligible: boolean;
  rule_eligible: boolean;
  retention_policy: { hot: string; warm?: string; archive?: string };
  retention_reason?: string;
}

export interface ProductContract {
  product_id: string;
  display_name: string;
  status: string;
  category: string;
  events_published: ProductContractEvent[];
  events_consumed: string[];
  notification_contract: { enabled: boolean; default_channels: string[]; opt_out_supported: boolean };
  activity_contract: { enabled: boolean; timeline_grouping?: string; visible_to?: string };
  search_contract: { indexable: boolean; acl?: string; document_fields?: string[] };
  rule_contract: { eligible: boolean; default_seed_rules?: string[]; rule_fields?: string[] };
  ai_knowledge_contract: { eligible: boolean; fact_types?: string[]; citation_fields?: string[] };
  receipt_contract: { issued: boolean; format?: string; receipt_event?: string };
  communication_contract: { outbound_channels: string[]; via_connect: boolean };
  kyc_requirements: { minimum_tier: string; rationale?: string };
  fee_model: { model: string; description: string; fee_recipient?: string };
  sensitive_fields: string[];
  public_fields: string[];
  admin_fields: string[];
  retention_policy: { hot: string; warm?: string; archive?: string };
  owner_team: string;
}

export interface ProductContractListResponse {
  products: ProductContractSummary[];
}

export interface ContractValidationResponse {
  registry_errors: string[];
  recent_violations: Array<{
    kind: string;
    product: string;
    event_name: string;
    detail: string;
    at?: string;
  }>;
}

// ---- Task 128 — AI Knowledge Layer -------------------------------------

export interface KnowledgeFact {
  id: string;
  event_id: string;
  user_id: number;
  product: string;
  fact_type: string;
  title: string;
  summary: string;
  entity_type: string;
  entity_ref: string;
  occurred_at: string;
  amount: string | null;
  currency: string | null;
  confidence: number;
  source_event_name: string;
  source_product: string;
  citation_ref: string;
  search_document_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface KnowledgeQueryResult {
  facts: KnowledgeFact[];
  nextCursor: string | null;
  total: number;
}

// ---- Task 130 — Intelligence Analytics ---------------------------------

export type AnalyticsPeriod = "daily" | "hourly" | "weekly" | "monthly";

export interface AnalyticsOverviewSlice {
  metric_key: string;
  product: string;
  total: string;
  period_start: string;
}

export interface AnalyticsOverviewResponse {
  window: { from: string; to: string; period: AnalyticsPeriod };
  slices: AnalyticsOverviewSlice[];
}

export interface AnalyticsMetric {
  id: string;
  metric_key: string;
  product: string;
  period: AnalyticsPeriod;
  period_start: string;
  period_end: string;
  dimensions: Record<string, string>;
  value_numeric: string;
  value_json: Record<string, unknown> | null;
  last_event_id: string | null;
  updated_at: string;
  created_at: string;
}

export interface AnalyticsMetricListResponse {
  metrics: AnalyticsMetric[];
  nextCursor: string | null;
  total: number;
}

export interface AnalyticsTimeseriesPoint {
  period_start: string;
  period_end: string;
  value: string;
}

export interface AnalyticsTimeseriesResponse {
  metric_key: string;
  product: string;
  dimensions: Record<string, string>;
  period: AnalyticsPeriod;
  points: AnalyticsTimeseriesPoint[];
}

// ---- Task 133 — Scenario Runner / Certification Engine ------------------

export type ScenarioMode = "dry_run" | "safe_live" | "destructive_test";
export type ScenarioRiskLevel = "safe" | "medium" | "destructive";
export type ScenarioRunStatus =
  | "pending"
  | "running"
  | "passed"
  | "failed"
  | "cancelled";
export type ScenarioAssertionStatus = "passed" | "failed" | "skipped";

export interface ScenarioCatalogEntry {
  code: string;
  name: string;
  description: string;
  risk_level: ScenarioRiskLevel;
  supported_modes: ScenarioMode[];
  required_seed_data: string[];
  steps: string[];
  cleanup_policy: string | null;
}

export interface ScenarioRun {
  id: string;
  scenario_code: string;
  scenario_name: string;
  status: ScenarioRunStatus;
  mode: ScenarioMode;
  started_by_user_id: number | null;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  environment: string;
  summary_json: Record<string, unknown>;
  created_at: string;
}

export interface ScenarioAssertion {
  id: string;
  scenario_run_id: string;
  assertion_code: string;
  title: string;
  status: ScenarioAssertionStatus;
  expected_json: unknown;
  actual_json: unknown;
  error_message: string | null;
  created_at: string;
}

export interface ScenarioArtifact {
  id: string;
  scenario_run_id: string;
  artifact_type: string;
  artifact_ref: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface ScenarioRunReport {
  run: ScenarioRun;
  assertions: ScenarioAssertion[];
  artifacts: ScenarioArtifact[];
  counts: {
    total_assertions: number;
    passed: number;
    failed: number;
    skipped: number;
    total_artifacts: number;
  };
}

export interface ScenarioRunListResponse {
  runs: ScenarioRun[];
  nextCursor: string | null;
  total: number;
}
