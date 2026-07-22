import { FormEvent, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput, FormSelect } from "@/components/ui/FormInput";
import { Modal } from "@/components/ui/Modal";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import {
  auditService,
  AuditFilters,
  AUDIT_EVENT_TYPES,
} from "@/services/auditService";
import type { AuditLog } from "@/types";

export default function AuditLogs() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [draft, setDraft] = useState<AuditFilters>({});
  const [selected, setSelected] = useState<AuditLog | null>(null);

  async function load(f: AuditFilters) {
    setLoading(true);
    setError(null);
    try {
      const res = await auditService.list({ ...f, take: 200 });
      setRows(Array.isArray(res.data) ? res.data : []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(apiErrorMessage(err));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filters);
  }, [filters]);

  function apply(e: FormEvent) {
    e.preventDefault();
    setFilters(draft);
  }

  return (
    <AppLayout
      title="Audit logs"
      subtitle="Every admin action, mint, burn, rate change and decision"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
            onSubmit={apply}
          >
            <FormSelect
              label="Event type"
              value={draft.eventType || ""}
              onChange={(e) =>
                setDraft({ ...draft, eventType: e.target.value || undefined })
              }
            >
              <option value="">All</option>
              {AUDIT_EVENT_TYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Actor ID"
              value={draft.actorId ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, actorId: e.target.value })
              }
            />
            <FormInput
              label="Target type"
              value={draft.targetType || ""}
              onChange={(e) =>
                setDraft({ ...draft, targetType: e.target.value })
              }
            />
            <FormInput
              label="From"
              type="date"
              value={draft.from || ""}
              onChange={(e) => setDraft({ ...draft, from: e.target.value })}
            />
            <FormInput
              label="To"
              type="date"
              value={draft.to || ""}
              onChange={(e) => setDraft({ ...draft, to: e.target.value })}
            />
            <div className="col-span-full flex gap-2">
              <Button type="submit">Apply</Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDraft({});
                  setFilters({});
                }}
              >
                Clear
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Audit trail</CardTitle>
          <span className="text-xs text-ink-400">
            {rows.length} shown · {total.toLocaleString()} total
          </span>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            onRowClick={setSelected}
            emptyMessage="No audit rows match those filters."
            columns={[
              {
                key: "createdAt",
                header: "When",
                render: (r) => formatDateTime(r.created_at),
              },
              {
                key: "eventType",
                header: "Event",
                render: (r) => (
                  <span className="font-mono text-xs">
                    {r.event_type ?? "—"}
                  </span>
                ),
              },
              {
                key: "actor",
                header: "Actor",
                render: (r) =>
                  r.actor_id != null ? (
                    `#${r.actor_id}`
                  ) : (
                    <span className="text-ink-400">system</span>
                  ),
              },
              {
                key: "target",
                header: "Target",
                render: (r) => r.target_type ?? "—",
              },
              {
                key: "targetId",
                header: "Target ID",
                render: (r) =>
                  r.target_id ? (
                    <span className="font-mono text-xs">#{r.target_id}</span>
                  ) : (
                    "—"
                  ),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Audit log #${selected.id}` : ""}
        size="lg"
      >
        {selected && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Event" value={selected.event_type} />
              <Field
                label="When"
                value={formatDateTime(selected.created_at)}
              />
              <Field
                label="Actor"
                value={
                  selected.actor_id != null ? `#${selected.actor_id}` : "system"
                }
              />
              <Field
                label="Target"
                value={
                  selected.target_type
                    ? `${selected.target_type} #${selected.target_id ?? "—"}`
                    : "—"
                }
              />
              {selected.ip && <Field label="IP" value={selected.ip} />}
              {selected.device && (
                <Field label="Device" value={selected.device} />
              )}
            </div>
            {selected.metadata != null &&
              Object.keys(selected.metadata).length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-ink-400">
                    Metadata
                  </div>
                  <pre className="mt-1 max-h-[30vh] overflow-auto rounded bg-ink-50 p-3 text-xs">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            {(selected.old_value != null || selected.new_value != null) && (
              <div className="grid grid-cols-2 gap-3">
                {selected.old_value !== undefined && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-ink-400">
                      Old value
                    </div>
                    <pre className="mt-1 max-h-[30vh] overflow-auto rounded bg-ink-50 p-3 text-xs">
                      {JSON.stringify(selected.old_value, null, 2)}
                    </pre>
                  </div>
                )}
                {selected.new_value !== undefined && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-ink-400">
                      New value
                    </div>
                    <pre className="mt-1 max-h-[30vh] overflow-auto rounded bg-ink-50 p-3 text-xs">
                      {JSON.stringify(selected.new_value, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </AppLayout>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-ink-400">{label}</dt>
      <dd className="mt-0.5 text-ink-900">{value ?? "—"}</dd>
    </div>
  );
}
