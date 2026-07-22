import { api } from "@/lib/api";
import type {
  Activity,
  ActivityListResponse,
  AnalyticsMetricListResponse,
  AnalyticsOverviewResponse,
  AnalyticsPeriod,
  AnalyticsTimeseriesResponse,
  ContractValidationResponse,
  EventListResponse,
  KnowledgeFact,
  KnowledgeQueryResult,
  Notification,
  NotificationListResponse,
  PlatformEvent,
  ProductContract,
  ProductContractEvent,
  ProductContractListResponse,
  SearchDocument,
  SearchQueryResult,
  Subscriber,
  SubscriberCheckpoint,
  ScenarioCatalogEntry,
  ScenarioMode,
  ScenarioRunListResponse,
  ScenarioRunReport,
} from "@/types/intelligence";

/**
 * Read-only client for the Kiwoo Intelligence Platform admin surface.
 *
 * Sprint 13 Task 126.5 — thin axios wrappers over
 * `/admin/intelligence/*`. Every method is idempotent and safe to
 * call from a refresh handler. Filters are passed straight through
 * to Nest's `@Query` DTOs; the backend does its own validation.
 *
 * The Operations Center pages never construct URLs by hand — always
 * go through this service so the base URL, auth header, and error
 * normalization behave consistently.
 */
export interface EventFilters {
  product?: string;
  event?: string;
  from?: string;
  to?: string;
  correlation_id?: string;
  trace_id?: string;
  subject_ref?: string;
  actor_ref?: string;
  cursor?: string;
  limit?: number;
}

export interface NotificationFilters {
  user_id?: number | string;
  product?: string;
  status?: string;
  event_id?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface ActivityFilters {
  user_id?: number | string;
  product?: string;
  activity_type?: string;
  event_id?: string;
  correlation_id?: string;
  trace_id?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface SearchFilters {
  q?: string;
  user_id?: number | string;
  product?: string;
  entity_type?: string;
  correlation_id?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface KnowledgeFilters {
  user_id?: number | string;
  product?: string;
  fact_type?: string;
  entity_type?: string;
  entity_ref?: string;
  from?: string;
  to?: string;
  cursor?: string;
  limit?: number;
}

export interface ReplayRequest {
  subscriber: string;
  product?: string;
  event_type?: string;
  correlation_id?: string;
  from?: string;
  to?: string;
  cursor?: string;
}

export const intelligenceService = {
  // ---- Events (Task 123) -------------------------------------------------
  async listEvents(filters: EventFilters = {}): Promise<EventListResponse> {
    const { data } = await api.get<EventListResponse>(
      "admin/intelligence/events",
      { params: filters },
    );
    return data;
  },
  async getEvent(id: string): Promise<{ event: PlatformEvent | null }> {
    const { data } = await api.get<{ event: PlatformEvent | null }>(
      "admin/intelligence/events",
      { params: { id } },
    );
    return data;
  },

  // ---- Subscribers (Task 123) -------------------------------------------
  async listSubscribers(): Promise<{ subscribers: Subscriber[] }> {
    const { data } = await api.get<{ subscribers: Subscriber[] }>(
      "admin/intelligence/subscribers",
    );
    return data;
  },
  async listCheckpoints(): Promise<{ checkpoints: SubscriberCheckpoint[] }> {
    const { data } = await api.get<{ checkpoints: SubscriberCheckpoint[] }>(
      "admin/intelligence/checkpoints",
    );
    return data;
  },
  async replay(body: ReplayRequest): Promise<{
    subscriber: string;
    events_processed: number;
    events_errored: number;
    last_event_id?: string | null;
  }> {
    const { data } = await api.post<{
      subscriber: string;
      events_processed: number;
      events_errored: number;
      last_event_id?: string | null;
    }>("admin/intelligence/replay", body);
    return data;
  },

  // ---- Notifications (Task 124) -----------------------------------------
  async listNotifications(
    filters: NotificationFilters = {},
  ): Promise<NotificationListResponse> {
    const { data } = await api.get<NotificationListResponse>(
      "admin/intelligence/notifications",
      { params: filters },
    );
    return data;
  },
  async getNotification(id: string): Promise<{ notification: Notification | null }> {
    const { data } = await api.get<{ notification: Notification | null }>(
      `admin/intelligence/notifications/${id}`,
    );
    return data;
  },

  // ---- Activity (Task 125) ----------------------------------------------
  async listActivity(
    filters: ActivityFilters = {},
  ): Promise<ActivityListResponse> {
    const { data } = await api.get<ActivityListResponse>(
      "admin/intelligence/activity",
      { params: filters },
    );
    return data;
  },
  async getActivity(id: string): Promise<{ activity: Activity | null }> {
    const { data } = await api.get<{ activity: Activity | null }>(
      `admin/intelligence/activity/${id}`,
    );
    return data;
  },

  // ---- Search (Task 126) ------------------------------------------------
  async search(filters: SearchFilters = {}): Promise<SearchQueryResult> {
    const { data } = await api.get<SearchQueryResult>(
      "admin/intelligence/search",
      { params: filters },
    );
    return data;
  },
  async getSearchDocument(id: string): Promise<{ document: SearchDocument | null }> {
    const { data } = await api.get<{ document: SearchDocument | null }>(
      `admin/intelligence/search/${id}`,
    );
    return data;
  },

  // ---- Product Contracts (Task 131) --------------------------------------
  async listProducts(): Promise<ProductContractListResponse> {
    const { data } = await api.get<ProductContractListResponse>(
      "admin/intelligence/products",
    );
    return data;
  },
  async getProduct(id: string): Promise<{ product: ProductContract }> {
    const { data } = await api.get<{ product: ProductContract }>(
      `admin/intelligence/products/${id}`,
    );
    return data;
  },
  async getProductEvents(
    id: string,
  ): Promise<{ events: ProductContractEvent[] }> {
    const { data } = await api.get<{ events: ProductContractEvent[] }>(
      `admin/intelligence/products/${id}/events`,
    );
    return data;
  },
  async getContractValidation(): Promise<ContractValidationResponse> {
    const { data } = await api.get<ContractValidationResponse>(
      "admin/intelligence/contracts/validation",
    );
    return data;
  },

  // ---- AI Knowledge Layer (Task 128) ------------------------------------
  async listKnowledge(
    filters: KnowledgeFilters = {},
  ): Promise<KnowledgeQueryResult> {
    const { data } = await api.get<KnowledgeQueryResult>(
      "admin/intelligence/knowledge",
      { params: filters },
    );
    return data;
  },
  async getKnowledgeFact(id: string): Promise<{ fact: KnowledgeFact }> {
    const { data } = await api.get<{ fact: KnowledgeFact }>(
      `admin/intelligence/knowledge/${id}`,
    );
    return data;
  },

  // ---- Intelligence Analytics (Task 130) --------------------------------
  async analyticsOverview(params: {
    from?: string;
    to?: string;
    product?: string;
    period?: AnalyticsPeriod;
  } = {}): Promise<AnalyticsOverviewResponse> {
    const { data } = await api.get<AnalyticsOverviewResponse>(
      "admin/intelligence/analytics/overview",
      { params },
    );
    return data;
  },
  async analyticsMetrics(params: {
    metric_key?: string;
    product?: string;
    period?: AnalyticsPeriod;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  } = {}): Promise<AnalyticsMetricListResponse> {
    const { data } = await api.get<AnalyticsMetricListResponse>(
      "admin/intelligence/analytics/metrics",
      { params },
    );
    return data;
  },
  async analyticsProducts(): Promise<{ products: string[] }> {
    const { data } = await api.get<{ products: string[] }>(
      "admin/intelligence/analytics/products",
    );
    return data;
  },
  async analyticsTimeseries(params: {
    metric_key: string;
    product?: string;
    period?: AnalyticsPeriod;
    from?: string;
    to?: string;
    dimensions?: Record<string, string>;
  }): Promise<AnalyticsTimeseriesResponse> {
    const qp: Record<string, string> = { metric_key: params.metric_key };
    if (params.product) qp.product = params.product;
    if (params.period) qp.period = params.period;
    if (params.from) qp.from = params.from;
    if (params.to) qp.to = params.to;
    if (params.dimensions && Object.keys(params.dimensions).length > 0) {
      qp.dimensions = JSON.stringify(params.dimensions);
    }
    const { data } = await api.get<AnalyticsTimeseriesResponse>(
      "admin/intelligence/analytics/timeseries",
      { params: qp },
    );
    return data;
  },

  // ---- Scenario Runner (Task 133) ---------------------------------------
  async listScenarios(): Promise<{ scenarios: ScenarioCatalogEntry[] }> {
    const { data } = await api.get<{ scenarios: ScenarioCatalogEntry[] }>(
      "admin/intelligence/scenarios",
    );
    return data;
  },
  async runScenario(
    code: string,
    body: { mode?: ScenarioMode; parameters?: Record<string, unknown> },
  ): Promise<{ run_id: string }> {
    const { data } = await api.post<{ run_id: string }>(
      `admin/intelligence/scenarios/${encodeURIComponent(code)}/run`,
      body,
    );
    return data;
  },
  async listScenarioRuns(params: {
    scenario_code?: string;
    status?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  } = {}): Promise<ScenarioRunListResponse> {
    const { data } = await api.get<ScenarioRunListResponse>(
      "admin/intelligence/scenario-runs",
      { params },
    );
    return data;
  },
  async getScenarioRun(id: string): Promise<ScenarioRunReport> {
    const { data } = await api.get<ScenarioRunReport>(
      `admin/intelligence/scenario-runs/${encodeURIComponent(id)}`,
    );
    return data;
  },
};
