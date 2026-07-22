import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { Card } from "@/components/ui/Card";

/**
 * Communications Center — a landing hub for the Sprint 12.x Connect
 * operator surfaces (each of which is its own page).
 *
 * We do NOT duplicate the pages themselves; this is a wayfinding
 * dashboard so operators know where to go when they want to inspect
 * a WhatsApp delivery, look at provider health, or check the
 * watchdog. Every card links to an existing route.
 */
export default function CommunicationsCenter() {
  const sections: {
    to: string;
    title: string;
    subtitle: string;
    tone: string;
  }[] = [
    {
      to: "/connect/whatsapp/diagnostics",
      title: "WhatsApp Diagnostics",
      subtitle:
        "End-to-end sanity checks — token status, template health, live send test.",
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      to: "/connect/conversation",
      title: "Conversation Inspector",
      subtitle:
        "Full timeline of a user↔platform conversation, across every transport.",
      tone: "bg-sky-50 text-sky-700",
    },
    {
      to: "/connect/templates",
      title: "Templates",
      subtitle:
        "Provider-registered templates + local copy + last-approved snapshot.",
      tone: "bg-brand-50 text-brand-700",
    },
    {
      to: "/connect/providers/health",
      title: "Provider Health",
      subtitle:
        "Per-transport readiness: config, credentials, last successful send.",
      tone: "bg-amber-50 text-amber-700",
    },
    {
      to: "/connect/watchdog",
      title: "Status Watchdog",
      subtitle:
        "Retry queue, stuck deliveries, per-provider status projection.",
      tone: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <AppLayout>
      <RefreshBar
        title="Communications Center"
        subtitle="Landing hub for the Sprint 12.x Connect Enterprise operator surfaces"
        onRefresh={() => {
          /* nothing to fetch on this page — cards are static links. */
        }}
        loading={false}
      />

      <p className="mt-4 text-sm text-ink-600">
        Every communications surface Kiwoo runs (SMS, WhatsApp, email, push,
        in-app) is instrumented by the Connect Enterprise pipeline. Pick a
        pane below to drill into what's actually happening.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((s) => (
          <Link key={s.to} to={s.to} className="block">
            <Card className="h-full p-5 transition-shadow hover:shadow-lg">
              <div
                className={`mb-3 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${s.tone}`}
              >
                Connect
              </div>
              <h3 className="text-sm font-semibold text-ink-900">{s.title}</h3>
              <p className="mt-1 text-xs text-ink-500">{s.subtitle}</p>
            </Card>
          </Link>
        ))}
      </div>
    </AppLayout>
  );
}
