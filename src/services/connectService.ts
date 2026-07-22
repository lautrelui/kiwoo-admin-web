import { api } from "@/lib/api";
import type {
  ConversationInspection,
  HealthSnapshot,
  MessageTimeline,
  TemplateRegistryResponse,
  WatchdogSweepResult,
  WhatsAppDiagnostics,
} from "@/types/connect";

/// Sprint 12.x Connect Enterprise — admin UI service layer.
///
/// One method per backend endpoint. No side effects. Every method
/// returns the response body as-is; UI components handle presentation.
export const connectService = {
  async whatsappDiagnostics(): Promise<WhatsAppDiagnostics> {
    const { data } = await api.get<WhatsAppDiagnostics>(
      "admin/connect/whatsapp/diagnostics",
    );
    return data;
  },

  async inspectConversation(
    recipient: string,
    channel: "whatsapp" | "sms" = "whatsapp",
  ): Promise<ConversationInspection> {
    const { data } = await api.get<ConversationInspection>(
      "admin/connect/inspect-conversation",
      { params: { recipient, channel } },
    );
    return data;
  },

  async templates(): Promise<TemplateRegistryResponse> {
    const { data } = await api.get<TemplateRegistryResponse>(
      "admin/connect/templates",
    );
    return data;
  },

  async messageTimeline(id: string): Promise<MessageTimeline> {
    const { data } = await api.get<MessageTimeline>(
      `admin/connect/messages/${encodeURIComponent(id)}/timeline`,
    );
    return data;
  },

  async providersHealth(): Promise<HealthSnapshot> {
    const { data } = await api.get<HealthSnapshot>(
      "admin/connect/providers/health",
    );
    return data;
  },

  async watchdogLastSweep(): Promise<WatchdogSweepResult> {
    const { data } = await api.get<WatchdogSweepResult>(
      "admin/connect/watchdog/last-sweep",
    );
    return data;
  },
};
