// Types mirroring the Sprint 12.x Connect Enterprise backend responses.
// Field names + shapes intentionally match `src/connect/admin/admin-diagnostics.controller.ts`
// on the backend — do not diverge without a paired change over there.

export type ConnectChannel = "whatsapp" | "sms" | "email" | "push" | "telegram";
export type ConnectDecision =
  | "freeform"
  | "template"
  | "forced_freeform"
  | "forced_template";
export type ConnectLifecycle =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | string; // future-proof

// ---------- diagnostics ----------

export interface WhatsAppDiagnostics {
  account: {
    provider: string;
    configured: boolean;
    mode: "sandbox" | "live" | "mock" | "unconfigured";
  };
  callback: {
    configured: boolean;
    url: string | null;
    last_callback_at: string | null;
    last_callback_status: string | null;
    signature_verification: string;
  };
  window_strategy: "db" | "always_inside" | "always_outside" | string;
  env_presence: { name: string; present: boolean }[];
  templates: {
    registered_count: number;
    configured_count: number;
    missing_count: number;
    configured: { template: string; locales: string[] }[];
  };
  last_successful_delivery: {
    template: string;
    delivered_at: string;
    delivery_decision: ConnectDecision | null;
  } | null;
  last_provider_error: {
    template: string;
    at: string;
    code: string | null;
    message: string | null;
    delivery_decision: ConnectDecision | null;
  } | null;
  transport_health: TransportHealth | null;
}

// ---------- conversation inspector ----------

export interface ConversationInspection {
  recipient_masked: string;
  channel: ConnectChannel;
  conversation_window: {
    status: "open" | "closed";
    opened_at: string | null;
    expires_at: string | null;
  };
  would_be_decision: "freeform" | "template";
  recent_outbound: RecentOutbound[];
}

export interface RecentOutbound {
  id: string;
  template: string;
  status: ConnectLifecycle;
  decision: ConnectDecision | null;
  error_code: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
}

// ---------- template registry ----------

export type TemplateStatus = "ready" | "partial" | "no_sids";

export interface TemplateRow {
  key: string;
  status: TemplateStatus;
  locales: {
    locale: string;
    content_sid: "configured" | "missing";
  }[];
}

export interface TemplateRegistryResponse {
  supported_locales: string[];
  templates: TemplateRow[];
}

// ---------- message timeline ----------

export interface TimelineWaypoint {
  key: string;
  label: string;
  at: string | null;
  reached: boolean;
  detail?: string;
  error_code?: string | null;
  error_message?: string | null;
  suggested_fix?: string;
}

export interface MessageTimeline {
  id: string;
  channel: ConnectChannel;
  template: string;
  recipient_masked: string;
  status: ConnectLifecycle;
  delivery_decision: ConnectDecision | null;
  waba_content_sid: string | null;
  send_id: string | null;
  waypoints: TimelineWaypoint[];
}

// ---------- provider health ----------

export interface TransportHealth {
  transport: string;
  sample_size: number;
  since: string | null;
  healthy: boolean | null;
  latency_ms: {
    p50: number | null;
    p95: number | null;
    avg: number | null;
  };
  counts_24h: {
    total: number;
    success: number;
    http_429: number;
    http_5xx: number;
    other_failure: number;
  };
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error_code: string | null;
}

export interface HealthSnapshot {
  generated_at: string;
  transports: TransportHealth[];
}

// ---------- watchdog ----------

export interface WatchdogSweepResult {
  considered: number;
  healed: number;
  stillQueued: number;
  errored: number;
  cutoff: string;
}
