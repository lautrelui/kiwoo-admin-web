import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RefreshBar } from "@/components/ops/RefreshBar";
import { ErrorNote } from "@/components/ops/ErrorNote";
import { Chip } from "@/components/ops/Chip";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { intelligenceService } from "@/services/intelligenceService";
import { userService } from "@/services/userService";
import type {
  Activity,
  AdminUserDetail as AdminUserDetailDto,
  KnowledgeFact,
  Notification,
  PlatformEvent,
} from "@/types/intelligence";

/**
 * User detail — a 360° operator view assembled from the read-only
 * surfaces the platform already exposes:
 *
 *   /admin/users/:id                  → identity + KYC + wallet flag
 *   /admin/intelligence/notifications → per-user notification stream
 *   /admin/intelligence/activity      → per-user activity timeline
 *   /admin/intelligence/events        → per-user event trail
 *
 * No secrets, no PIN, no private key ever appears — the backend
 * masks phone/email and the admin UI renders exactly what it sees.
 */
export default function PlatformUserDetail() {
  const { id } = useParams<{ id: string }>();
  const numericId = Number(id);
  const [user, setUser] = useState<AdminUserDetailDto | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [events, setEvents] = useState<PlatformEvent[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(numericId)) {
      setError(new Error(`Invalid user id: ${id}`));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      userService.detail(numericId),
      intelligenceService.listNotifications({ user_id: numericId, limit: 25 }),
      intelligenceService.listActivity({ user_id: numericId, limit: 25 }),
      intelligenceService.listEvents({
        actor_ref: `user:${numericId}`,
        limit: 25,
      }),
      intelligenceService.listKnowledge({ user_id: numericId, limit: 25 }),
    ]);
    if (results[0].status === "fulfilled") setUser(results[0].value?.user ?? null);
    else setError(results[0].reason);
    if (results[1].status === "fulfilled")
      setNotifications(
        Array.isArray(results[1].value?.notifications)
          ? results[1].value.notifications
          : [],
      );
    if (results[2].status === "fulfilled")
      setActivity(
        Array.isArray(results[2].value?.activity)
          ? results[2].value.activity
          : [],
      );
    if (results[3].status === "fulfilled")
      setEvents(
        Array.isArray(results[3].value?.events) ? results[3].value.events : [],
      );
    if (results[4].status === "fulfilled")
      setKnowledge(
        Array.isArray(results[4].value?.facts) ? results[4].value.facts : [],
      );
    setLoading(false);
    setRefreshedAt(new Date());
  }, [numericId, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const identity = useMemo(() => {
    if (!user) return null;
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="ID">#{user.id}</Field>
        <Field label="Name">{user.name}</Field>
        <Field label="Phone">
          <span className="font-mono">{user.phone}</span>
        </Field>
        <Field label="Email">
          <span className="text-xs">{user.email}</span>
        </Field>
        <Field label="Role">
          <Chip tone="info">{user.role}</Chip>
        </Field>
        <Field label="KYC Tier">
          <Chip tone="brand">{user.kyc_tier}</Chip>
        </Field>
        <Field label="Frozen">
          {user.is_frozen ? (
            <Chip tone="danger">frozen</Chip>
          ) : (
            <Chip tone="success">active</Chip>
          )}
        </Field>
        <Field label="Wallet">
          {user.has_wallet ? (
            <Chip tone="success">provisioned</Chip>
          ) : (
            <Chip tone="muted">none</Chip>
          )}
        </Field>
        <Field label="Admin Roles">
          <div className="flex flex-wrap gap-1">
            {!user.admin_roles || user.admin_roles.length === 0 ? (
              <span className="text-xs text-ink-400">—</span>
            ) : (
              user.admin_roles.map((r) => (
                <Chip key={r} tone="brand">
                  {r}
                </Chip>
              ))
            )}
          </div>
        </Field>
        <Field label="Public Key" className="sm:col-span-2">
          <span className="break-all font-mono text-[11px] text-ink-700">
            {user.wallet_public_key ?? "—"}
          </span>
        </Field>
        <Field label="Created">
          <span className="text-xs">
            {new Date(user.created_at).toLocaleString()}
          </span>
        </Field>
        <Field label="Updated">
          <span className="text-xs">
            {new Date(user.updated_at).toLocaleString()}
          </span>
        </Field>
      </div>
    );
  }, [user]);

  return (
    <AppLayout>
      <RefreshBar
        title={user ? `User #${user.id} — ${user.name}` : `User #${id}`}
        subtitle={
          <Link to="/ops/users" className="text-brand-600 hover:underline">
            ← Back to Platform Users
          </Link>
        }
        onRefresh={load}
        loading={loading}
        lastRefreshedAt={refreshedAt}
      />

      <ErrorNote error={error} className="mt-4" />

      <Card className="mt-4 p-5">
        {loading && !user ? (
          <div className="text-sm text-ink-400">Loading…</div>
        ) : user ? (
          identity
        ) : (
          <div className="text-sm text-ink-400">User not found.</div>
        )}
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            Notifications
          </h2>
          <DataTable
            columns={[
              {
                key: "when",
                header: "When",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "title",
                header: "Title",
                render: (r) => (
                  <Link
                    to={`/ops/notifications/${encodeURIComponent(r.id)}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {r.title}
                  </Link>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r) => (
                  <Chip
                    tone={r.status === "unread" ? "warning" : "muted"}
                  >
                    {r.status}
                  </Chip>
                ),
              },
            ]}
            rows={notifications}
            loading={loading && notifications.length === 0}
            emptyMessage="No notifications for this user yet."
            rowKey={(r) => r.id}
          />
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            Activity Timeline
          </h2>
          <DataTable
            columns={[
              {
                key: "when",
                header: "When",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {new Date(r.occurred_at).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "title",
                header: "Title",
                render: (r) => (
                  <div>
                    <div className="text-ink-900">{r.title}</div>
                    {r.subtitle && (
                      <div className="text-xs text-ink-500">{r.subtitle}</div>
                    )}
                  </div>
                ),
              },
              {
                key: "product",
                header: "Product",
                render: (r) => <Chip tone="info">{r.product ?? "—"}</Chip>,
              },
            ]}
            rows={activity}
            loading={loading && activity.length === 0}
            emptyMessage="No activity yet."
            rowKey={(r) => r.id}
          />
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            Recent Knowledge
          </h2>
          <p className="mb-3 text-xs text-ink-500">
            Structured facts the AI Knowledge Layer materialised for this
            user, governed by Product Contracts. Sensitive fields are
            never included.
          </p>
          <DataTable
            columns={[
              {
                key: "when",
                header: "Occurred",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {new Date(r.occurred_at).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "fact_type",
                header: "Type",
                render: (r) => <Chip tone="brand">{r.fact_type}</Chip>,
              },
              {
                key: "title",
                header: "Title / summary",
                render: (r) => (
                  <div>
                    <div className="text-ink-900">
                      <Link
                        to={`/ops/knowledge/${encodeURIComponent(r.id)}`}
                        className="hover:underline"
                      >
                        {r.title}
                      </Link>
                    </div>
                    <div className="text-xs text-ink-500">{r.summary}</div>
                  </div>
                ),
              },
              {
                key: "citation",
                header: "Citation",
                render: (r) => (
                  <span className="font-mono text-[11px] text-ink-700">
                    {r.citation_ref}
                  </span>
                ),
              },
            ]}
            rows={knowledge}
            loading={loading && knowledge.length === 0}
            emptyMessage="No KnowledgeFacts for this user yet."
            rowKey={(r) => r.id}
          />
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            Events (this user as actor)
          </h2>
          <DataTable
            columns={[
              {
                key: "when",
                header: "When",
                render: (r) => (
                  <span className="text-xs text-ink-500">
                    {new Date(r.occurred_at).toLocaleString()}
                  </span>
                ),
              },
              {
                key: "type",
                header: "Event",
                render: (r) => (
                  <Link
                    to={`/ops/events/${encodeURIComponent(r.event_id)}`}
                    className="font-medium text-brand-700 hover:underline"
                  >
                    {r.event_type}
                  </Link>
                ),
              },
              {
                key: "product",
                header: "Product",
                render: (r) => (
                  <Chip tone="info">{r.source_product ?? "—"}</Chip>
                ),
              },
              {
                key: "subject",
                header: "Subject",
                render: (r) => (
                  <span className="text-xs text-ink-700">
                    {r.subject_ref ?? "—"}
                  </span>
                ),
              },
              {
                key: "correlation",
                header: "Correlation",
                render: (r) =>
                  r.correlation_id ? (
                    <span className="font-mono text-[11px] text-ink-500">
                      {r.correlation_id}
                    </span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  ),
              },
            ]}
            rows={events}
            loading={loading && events.length === 0}
            emptyMessage="No events emitted by this user yet."
            rowKey={(r) => r.event_id}
          />
        </Card>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="mt-1 text-sm text-ink-900">{children}</div>
    </div>
  );
}
