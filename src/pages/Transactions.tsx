import { FormEvent, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { FormInput, FormSelect } from "@/components/ui/FormInput";
import { Modal } from "@/components/ui/Modal";
import { apiErrorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";
import { ledgerService, JournalFilters } from "@/services/ledgerService";
import type { JournalDetail, JournalSummary } from "@/types";

/// Kiwoo Transactions = the Ledger. All money movements land as balanced
/// JournalEntry rows with two or more LedgerEntry legs. This page is a
/// cross-account journal browser; row click opens the full leg list.
export default function Transactions() {
  const [rows, setRows] = useState<JournalSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JournalFilters>({});
  const [draft, setDraft] = useState<JournalFilters>({});
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<JournalDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  async function load(f: JournalFilters) {
    setLoading(true);
    setError(null);
    try {
      const res = await ledgerService.listJournals({ ...f, take: 100 });
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

  useEffect(() => {
    if (selectedId == null) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    ledgerService
      .getJournal(selectedId)
      .then((d) => {
        if (!cancelled) setDetail(d);
      })
      .catch((err) => {
        if (!cancelled) setDetailError(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  function applyFilters(e: FormEvent) {
    e.preventDefault();
    setFilters(draft);
  }

  function clearFilters() {
    setDraft({});
    setFilters({});
  }

  return (
    <AppLayout
      title="Transactions"
      subtitle="Every money movement, as a balanced double-entry journal"
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
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
            onSubmit={applyFilters}
          >
            <FormSelect
              label="Source"
              value={draft.sourceType || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  sourceType: e.target.value || undefined,
                })
              }
            >
              <option value="">All</option>
              <option value="MintRequest">MintRequest</option>
              <option value="BurnRequest">BurnRequest</option>
              <option value="ManualCredit">ManualCredit</option>
              <option value="ManualCreditReversal">ManualCreditReversal</option>
              <option value="CashInTicket">CashInTicket</option>
              <option value="CashOutRequest">CashOutRequest</option>
              <option value="P2P">P2P</option>
              <option value="MerchantPayment">MerchantPayment</option>
              <option value="LoanDisbursement">LoanDisbursement</option>
              <option value="SettlementBatch">SettlementBatch</option>
            </FormSelect>
            <FormInput
              label="Reference contains"
              value={draft.reference || ""}
              onChange={(e) =>
                setDraft({ ...draft, reference: e.target.value })
              }
            />
            <FormInput
              label="Created by user id"
              value={draft.createdBy ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, createdBy: e.target.value })
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
              <Button type="button" variant="secondary" onClick={clearFilters}>
                Clear
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Journals</CardTitle>
          <span className="text-xs text-ink-400">
            {rows.length} shown · {total.toLocaleString()} total
          </span>
        </CardHeader>
        <CardBody>
          <DataTable
            rows={rows}
            loading={loading}
            rowKey={(r) => r.id}
            onRowClick={(r) => setSelectedId(r.id)}
            emptyMessage="No journals match those filters."
            columns={[
              {
                key: "id",
                header: "Journal",
                render: (r) => (
                  <span className="font-mono text-xs">#{r.id}</span>
                ),
              },
              {
                key: "reference",
                header: "Reference",
                render: (r) =>
                  r.reference ? (
                    <span className="font-mono text-xs">{r.reference}</span>
                  ) : (
                    <span className="text-ink-400">—</span>
                  ),
              },
              {
                key: "description",
                header: "Description",
                render: (r) => r.description || "—",
              },
              {
                key: "source",
                header: "Source",
                render: (r) => r.source_type ?? "—",
              },
              {
                key: "amount",
                header: "Amount",
                className: "text-right font-mono",
                render: (r) =>
                  `${Number(r.net_amount).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 6,
                  })} ${r.currency ?? ""}`.trim(),
              },
              {
                key: "legs",
                header: "Legs",
                className: "text-right",
                render: (r) => r.leg_count,
              },
              {
                key: "createdAt",
                header: "When",
                render: (r) => formatDateTime(r.created_at),
              },
            ]}
          />
        </CardBody>
      </Card>

      <Modal
        open={selectedId != null}
        onClose={() => setSelectedId(null)}
        title={
          detail
            ? `Journal #${detail.id} — ${detail.reference ?? "(no ref)"}`
            : selectedId != null
              ? `Journal #${selectedId}`
              : ""
        }
        size="lg"
      >
        {detailLoading && (
          <div className="text-sm text-ink-400">Loading…</div>
        )}
        {detailError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {detailError}
          </div>
        )}
        {detail && !detailLoading && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reference" value={detail.reference ?? "—"} />
              <Field label="Source" value={detail.source_type ?? "—"} />
              <Field label="Source ID" value={detail.source_id ?? "—"} />
              <Field
                label="Created by"
                value={
                  detail.created_by != null ? `#${detail.created_by}` : "system"
                }
              />
              <Field label="When" value={formatDateTime(detail.created_at)} />
              <Field
                label="Correlation"
                value={
                  detail.correlation_id ? (
                    <span className="font-mono text-xs">
                      {detail.correlation_id}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Field
                label="Backfilled"
                value={detail.is_backfilled ? "yes" : "no"}
              />
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-wider text-ink-400">
                Legs ({detail.entries.length})
              </div>
              <div className="overflow-hidden rounded border border-ink-100">
                <table className="w-full text-xs">
                  <thead className="bg-ink-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Account</th>
                      <th className="px-2 py-1 text-left">DR / CR</th>
                      <th className="px-2 py-1 text-right">Amount</th>
                      <th className="px-2 py-1 text-left">Currency</th>
                      <th className="px-2 py-1 text-left">Memo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.entries.map((leg) => (
                      <tr key={leg.id} className="border-t border-ink-100">
                        <td className="px-2 py-1 font-mono">
                          {leg.account?.code ?? `#${leg.account_id}`}
                        </td>
                        <td className="px-2 py-1">
                          <span
                            className={
                              leg.direction === "DEBIT"
                                ? "text-blue-700"
                                : "text-green-700"
                            }
                          >
                            {leg.direction}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-right font-mono">
                          {Number(leg.amount).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 6,
                          })}
                        </td>
                        <td className="px-2 py-1">{leg.currency}</td>
                        <td className="px-2 py-1 text-ink-600">
                          {leg.memo ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
